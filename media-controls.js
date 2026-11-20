// Pauza a přetáčení videa v PiP okně a klávesovými zkratkami.
// - Na Kicku a Twitchi registruje Media Session akce play/pause a, když kanál přetáčení
//   dovoluje (VOD nebo živé vysílání, ve kterém jde vrátit zpět), i seekbackward,
//   seekforward a seekto. Chrome pak v PiP ukáže pauzu i u živého vysílání
//   a (v novějších verzích) tlačítka ±10 s s posuvníkem.
// - Na všech podporovaných webech obsluhuje zkratky pro pauzu a přetáčení z background.js.
// YouTube a Instagram mají vlastní Media Session akce, ty nepřepisujeme.
(() => {
  const host = location.hostname;
  const OWN_MEDIA_SESSION = /(^|\.)(kick\.com|twitch\.tv)$/i.test(host);
  const IS_TWITCH = /(^|\.)twitch\.tv$/i.test(host);
  const SEEK_STEP = 10;
  // Živé vysílání: přetáčet jen tehdy, když se dá vrátit aspoň o 2 minuty.
  // Kratší rozsah je jen buffer přehrávače, ne přetáčení povolené kanálem.
  const MIN_LIVE_WINDOW = 120;
  // Nepřetáčet až na samou hranu živého vysílání, přehrávač by se zasekl.
  const LIVE_EDGE_GAP = 3;
  // Některé přehrávače u živého vysílání nehlásí Infinity, ale obří délku.
  const LIVE_DURATION = 7 * 24 * 3600;
  const POSITION_EVERY_MS = 5000;

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "media-control") return;
    const video = targetVideo();
    if (!video) return;
    if (message.action === "toggle") {
      setPaused(video, !video.paused);
    } else if (message.action === "seek") {
      seekBy(video, Number(message.offset) || 0);
    }
  });

  if (!OWN_MEDIA_SESSION || !("mediaSession" in navigator)) return;

  let seekActionsOn = false;
  let lastSync = 0;

  for (const type of ["play", "pause", "playing", "loadedmetadata", "durationchange", "seeked", "ratechange", "emptied"]) {
    document.addEventListener(type, sync, true);
  }
  document.addEventListener("timeupdate", () => {
    if (Date.now() - lastSync >= POSITION_EVERY_MS) sync();
  }, true);
  sync();

  function sync() {
    lastSync = Date.now();
    // Weby si Media Session akce nastavují samy a mohou je přepsat: obnovujeme je průběžně.
    // Akce play/pause zobrazí v PiP tlačítko pauzy i u živého vysílání, kde ho Chrome jinak skrývá.
    setAction("play", () => withVideo((video) => setPaused(video, false)));
    setAction("pause", () => withVideo((video) => setPaused(video, true)));

    const video = targetVideo();
    const range = video && seekRange(video);
    if (range) {
      setAction("seekbackward", (details) =>
        withVideo((v) => seekBy(v, -(details?.seekOffset || SEEK_STEP))));
      setAction("seekforward", (details) =>
        withVideo((v) => seekBy(v, details?.seekOffset || SEEK_STEP)));
      setAction("seekto", (details) => withVideo((v) => seekToPosition(v, details)));
      seekActionsOn = true;
      updatePosition(video, range);
    } else if (seekActionsOn) {
      // Kanál přetáčení nedovoluje (např. živé vysílání bez DVR): tlačítka z PiP zmizí.
      for (const action of ["seekbackward", "seekforward", "seekto"]) setAction(action, null);
      try {
        navigator.mediaSession.setPositionState();
      } catch {}
      seekActionsOn = false;
    }
  }

  function setAction(action, handler) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Starší Chrome akci nezná.
    }
  }

  function updatePosition(video, range) {
    // U živého vysílání ukazuje posuvník jen úsek, do kterého se dá vrátit.
    const duration = range.live ? range.end - range.start : video.duration;
    const position = clamp(video.currentTime - (range.live ? range.start : 0), 0, duration);
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position,
        playbackRate: video.playbackRate || 1
      });
    } catch {}
  }

  function withVideo(action) {
    const video = targetVideo();
    if (video) action(video);
  }

  function setPaused(video, paused) {
    if (video.paused === paused) return;
    // Twitch drží stav přehrávače u sebe: přes jeho tlačítko zůstane UI i stav v souladu.
    const button = IS_TWITCH
      ? (video.closest("[data-a-target='video-player'], .video-player") || document)
        .querySelector("button[data-a-target='player-play-pause-button']")
      : null;
    if (button) {
      button.click();
    } else if (paused) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }

  function seekBy(video, offset) {
    const range = seekRange(video);
    if (range && offset) seekTo(video, video.currentTime + offset, range, false);
  }

  function seekToPosition(video, details) {
    const range = seekRange(video);
    if (!range || !Number.isFinite(details?.seekTime)) return;
    const time = range.live ? range.start + details.seekTime : details.seekTime;
    seekTo(video, time, range, Boolean(details.fastSeek));
  }

  function seekTo(video, time, range, fast) {
    const target = clamp(time, range.start, range.end);
    // kick-vod.js podle toho pozná, že skok zpět chtěl uživatel a nejde o restart přehrávače.
    globalThis.__ytMiniUserSeekAt = Date.now();
    if (fast && typeof video.fastSeek === "function") {
      video.fastSeek(target);
    } else {
      video.currentTime = target;
    }
  }

  // Rozsah, ve kterém kanál dovoluje přetáčet, nebo null.
  function seekRange(video) {
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) return null;
    const duration = video.duration;
    const live = !Number.isFinite(duration) || duration >= LIVE_DURATION;
    let start = 0;
    let end = live ? 0 : duration;
    const seekable = video.seekable;
    if (seekable && seekable.length) {
      start = seekable.start(0);
      end = seekable.end(seekable.length - 1);
    }
    if (live) {
      end -= LIVE_EDGE_GAP;
      if (end - start < MIN_LIVE_WINDOW) return null;
    } else if (!(end > start)) {
      return null;
    }
    return { start, end, live };
  }

  // Video v PiP, jinak největší video na stránce (hrající má přednost).
  function targetVideo() {
    const pip = document.pictureInPictureElement;
    if (pip instanceof HTMLVideoElement) return pip;
    let best = null;
    let bestScore = 0;
    for (const video of document.querySelectorAll("video")) {
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) continue;
      const rect = video.getBoundingClientRect();
      const score = rect.width * rect.height * (video.paused ? 1 : 4);
      if (score > bestScore) {
        best = video;
        bestScore = score;
      }
    }
    return best;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
})();
