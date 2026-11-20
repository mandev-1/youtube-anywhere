// Kick VOD: když přehrávač kvůli výpadku spojení nebo jiné chybě video načte znovu,
// začne hrát od začátku. Tady si průběžně pamatujeme pozici a po znovunačtení
// video vrátíme tam, kde bylo. Pozice přežije i obnovení stránky ve stejné kartě.
(() => {
  // kick.com/<kanál>/videos/<id> i kick.com/video/<id>
  const VOD_PATH = /\/videos?\/([0-9a-z-]{8,})/i;
  const STORAGE_PREFIX = "ytMini:kickVod:";
  const MIN_RESUME = 15;           // kratší rozkoukání nemá smysl vracet
  const NEAR_START = 3;            // „od začátku“ = prvních pár sekund
  const TOLERANCE = 10;            // pozice do 10 s před uloženou je v pořádku
  const NEAR_END = 30;             // dokoukané video příště začne od začátku
  const RESTORE_WINDOW_MS = 90_000; // jak dlouho po výpadku čekat, než se video znovu načte
  const RETRY_MS = 3_000;
  const MAX_ATTEMPTS = 4;
  const USER_SEEK_MS = 2_000;
  const SAVE_EVERY_MS = 3_000;
  const SAVED_TTL_MS = 12 * 60 * 60 * 1000;

  let vodId = null;
  let lastTime = 0;
  let lastSavedAt = 0;
  let tracked = null;
  let pending = null;
  let lastUserInput = 0;

  // Skok na začátek po kliknutí nebo klávese je přání uživatele, ne restart.
  for (const type of ["pointerdown", "keydown", "touchstart"]) {
    document.addEventListener(type, () => {
      lastUserInput = Date.now();
    }, { capture: true, passive: true });
  }

  // Události médií nebublají, ale ve fázi capture je dokument zachytí.
  for (const type of ["loadstart", "emptied", "error", "loadedmetadata", "durationchange", "canplay", "playing", "seeking", "timeupdate"]) {
    document.addEventListener(type, onMediaEvent, true);
  }
  window.addEventListener("pagehide", () => save(true));

  function onMediaEvent(event) {
    const video = event.target;
    if (!(video instanceof HTMLVideoElement)) return;
    if (!syncVod() || !isMainVideo(video)) return;

    // Přehrávač si po chybě vytvořil nový <video>.
    if (tracked && tracked !== video) armRestore();
    tracked = video;

    switch (event.type) {
      case "loadstart":
      case "emptied":
      case "error":
        armRestore();
        return;
      case "seeking":
        if (userSeekedRecently()) {
          pending = null;
          lastTime = video.currentTime;
          save(true);
          return;
        }
        if (video.currentTime < NEAR_START) armRestore();
        break;
    }

    if (pending) {
      tryRestore(video);
    } else if (event.type === "timeupdate") {
      record(video);
    }
  }

  function syncVod() {
    const id = location.pathname.match(VOD_PATH)?.[1]?.toLowerCase() ?? null;
    if (id !== vodId) {
      vodId = id;
      tracked = null;
      pending = null;
      lastTime = 0;
      lastSavedAt = 0;
      if (id) loadSaved();
    }
    return id !== null;
  }

  function loadSaved() {
    const saved = readSaved();
    if (!saved) return;
    lastTime = saved;
    // Odkaz s časem (?t=…) má přednost před uloženou pozicí.
    if (!new URLSearchParams(location.search).has("t")) armRestore();
  }

  function armRestore() {
    if (pending || lastTime < MIN_RESUME) return;
    pending = {
      target: lastTime,
      until: Date.now() + RESTORE_WINDOW_MS,
      attempts: 0,
      nextTry: 0
    };
  }

  function tryRestore(video) {
    const now = Date.now();
    if (now > pending.until) {
      pending = null;
      return;
    }
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) return;
    if (video.currentTime >= pending.target - TOLERANCE) {
      // Video je zpátky na svém místě (samo, nebo po našem přetočení).
      if (!video.seeking) pending = null;
      return;
    }
    if (seekableEnd(video) < pending.target || now < pending.nextTry) return;
    if (pending.attempts >= MAX_ATTEMPTS) {
      pending = null;
      return;
    }
    // Přehrávač může pozici po načtení ještě jednou vrátit na 0: zkusíme to znovu.
    pending.attempts += 1;
    pending.nextTry = now + RETRY_MS;
    try {
      video.currentTime = pending.target;
    } catch {}
  }

  function record(video) {
    if (video.seeking || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    const time = video.currentTime;
    if (!Number.isFinite(time)) return;
    if (time < NEAR_START && lastTime >= MIN_RESUME && !userSeekedRecently()) {
      // Video skočilo na začátek bez přetočení: přehrávač se restartoval.
      armRestore();
      tryRestore(video);
      return;
    }
    const duration = video.duration;
    lastTime = Number.isFinite(duration) && duration - time < NEAR_END ? 0 : time;
    save(false);
  }

  function isMainVideo(video) {
    if (video === document.pictureInPictureElement) return true;
    const area = areaOf(video);
    if (area < 200 * 112) return false; // náhledy v doporučených videích
    for (const other of document.querySelectorAll("video")) {
      if (other !== video && areaOf(other) > area) return false;
    }
    return true;
  }

  function areaOf(video) {
    const rect = video.getBoundingClientRect();
    return rect.width * rect.height;
  }

  function seekableEnd(video) {
    const seekable = video.seekable;
    if (seekable && seekable.length) return seekable.end(seekable.length - 1);
    return Number.isFinite(video.duration) ? video.duration : 0;
  }

  function userSeekedRecently() {
    // __ytMiniUserSeekAt nastavuje media-controls.js při přetáčení z PiP nebo zkratkou.
    const last = Math.max(lastUserInput, globalThis.__ytMiniUserSeekAt || 0);
    return Date.now() - last < USER_SEEK_MS;
  }

  function save(force) {
    if (!vodId) return;
    const now = Date.now();
    if (!force && now - lastSavedAt < SAVE_EVERY_MS) return;
    lastSavedAt = now;
    try {
      const key = STORAGE_PREFIX + vodId;
      if (lastTime >= MIN_RESUME) {
        sessionStorage.setItem(key, JSON.stringify({ t: lastTime, at: now }));
      } else {
        sessionStorage.removeItem(key);
      }
    } catch {}
  }

  function readSaved() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_PREFIX + vodId) || "null");
      if (!Number.isFinite(saved?.t) || !Number.isFinite(saved?.at)) return 0;
      if (Date.now() - saved.at > SAVED_TTL_MS) return 0;
      return saved.t;
    } catch {
      return 0;
    }
  }
})();
