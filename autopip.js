// Content script na YouTube, Kicku a Instagramu:
// 1. Automatické PiP při přepnutí na jinou záložku (přes Media Session enterpictureinpicture).
// 2. Podpora pro Reels a Shorts – scrollování a přechod na další/předchozí video v PiP okně i na stránce.
(() => {
  if (!("mediaSession" in navigator) || !document.pictureInPictureEnabled) return;

  registerHandlers();

  // YouTube, Kick i Instagram jsou SPA: při přehrání handler zaregistrujeme znovu.
  document.addEventListener("play", onPlay, true);

  // Události PiP bublají z <video>; synchronizují odznak na ikoně.
  document.addEventListener("enterpictureinpicture", () => report("opened"), true);
  document.addEventListener("leavepictureinpicture", () => {
    // Při přepnutí mezi videi v PiP se nejprve opustí staré a vzápětí otevře nové:
    // počkáme, abychom zbytečně nehlásili "closed".
    setTimeout(() => {
      if (!document.pictureInPictureElement) {
        report("closed");
      }
    }, 120);
  }, true);

  // Při scrollu na stránce (kolečkem myši, šipkami) automaticky přepnout PiP na aktivní video
  let scrollTimeout = null;
  window.addEventListener("scroll", () => {
    if (!document.pictureInPictureElement) return;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      if (!document.pictureInPictureElement) return;
      const current = getBestVideo();
      if (current && current !== document.pictureInPictureElement && !current.paused) {
        void transferPip(current);
      }
    }, 150);
  }, { passive: true });

  // Příkazy z background service workeru (např. klávesové zkratky Alt+Shift+Down / Alt+Shift+Up)
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "navigate-reel") {
      void navigateReel(message.direction || 1);
    }
  });

  function registerHandlers() {
    let ok = false;
    try {
      navigator.mediaSession.setActionHandler("enterpictureinpicture", enterAutomatically);
      ok = true;
    } catch {}
    try {
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        void navigateReel(1);
      });
      ok = true;
    } catch {}
    try {
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        void navigateReel(-1);
      });
      ok = true;
    } catch {}
    return ok;
  }

  function onPlay(event) {
    registerHandlers();

    const target = event.target;
    if (!(target instanceof HTMLVideoElement)) return;

    // Pokud už PiP běží na jiném videu a toto video je viditelné v okně,
    // plynule na něj plovoucí okno přepneme.
    if (document.pictureInPictureElement &&
        document.pictureInPictureElement !== target &&
        isElementVisible(target)) {
      void transferPip(target);
    }
  }

  async function enterAutomatically() {
    if (document.pictureInPictureElement) return;

    const video = getBestVideo();
    if (!video || video.paused) return;

    video.disablePictureInPicture = false;
    video.removeAttribute("disablePictureInPicture");

    try {
      await video.requestPictureInPicture();
    } catch (error) {
      console.debug("YouTube Mini: automatické PiP se nepodařilo:", error);
    }
  }

  async function navigateReel(direction) {
    const isShorts = location.pathname.includes("/shorts/");
    const isYouTubeWatch = location.hostname.includes("youtube.com") && location.pathname.includes("/watch");

    if (isYouTubeWatch && !isShorts) {
      const selector = direction > 0 ? ".ytp-next-button" : ".ytp-prev-button";
      const btn = document.querySelector(selector);
      if (btn) btn.click();
      return;
    }

    if (isShorts) {
      const btnSelector = direction > 0
        ? "#navigation-button-down button, ytd-reel-video-renderer[is-active] #down-button button"
        : "#navigation-button-up button, ytd-reel-video-renderer[is-active] #up-button button";
      const btn = document.querySelector(btnSelector);
      if (btn) {
        btn.click();
      } else {
        dispatchNavKeys(direction);
      }
      return;
    }

    // Instagram Reels / obecný feed videí:
    dispatchNavKeys(direction);
    clickNavButtons(direction);

    const allVideos = [...document.querySelectorAll("video")].filter((v) => {
      const rect = v.getBoundingClientRect();
      return rect.width > 50 && rect.height > 50;
    });
    allVideos.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    const current = document.pictureInPictureElement || getBestVideo();
    let targetVideo = null;

    if (current && allVideos.length > 0) {
      const currentIndex = allVideos.indexOf(current);
      if (currentIndex !== -1) {
        const nextIdx = currentIndex + direction;
        if (nextIdx >= 0 && nextIdx < allVideos.length) {
          targetVideo = allVideos[nextIdx];
        }
      } else {
        const currentRect = current.getBoundingClientRect();
        if (direction > 0) {
          targetVideo = allVideos.find((v) => v.getBoundingClientRect().top > currentRect.top + 30);
        } else {
          const prevList = allVideos.filter((v) => v.getBoundingClientRect().top < currentRect.top - 30);
          targetVideo = prevList[prevList.length - 1];
        }
      }
    }

    if (targetVideo) {
      targetVideo.disablePictureInPicture = false;
      targetVideo.removeAttribute("disablePictureInPicture");

      const container = targetVideo.closest("article") ||
        targetVideo.closest("div[style*='height']") ||
        targetVideo;

      try {
        container.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      } catch {
        targetVideo.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      if (current && !current.muted) {
        targetVideo.muted = false;
      }
      if (targetVideo.paused) {
        targetVideo.play().catch(() => {});
      }

      if (document.pictureInPictureElement) {
        await transferPip(targetVideo);
      }
    } else {
      scrollPageBy(direction);
    }
  }

  async function transferPip(video) {
    if (!video || document.pictureInPictureElement === video) return;
    video.disablePictureInPicture = false;
    video.removeAttribute("disablePictureInPicture");

    if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
      await new Promise((resolve) => {
        let done = false;
        const cleanup = () => {
          if (done) return;
          done = true;
          video.removeEventListener("loadedmetadata", cleanup);
          video.removeEventListener("canplay", cleanup);
          resolve();
        };
        video.addEventListener("loadedmetadata", cleanup);
        video.addEventListener("canplay", cleanup);
        setTimeout(cleanup, 800);
      });
    }

    try {
      if (document.pictureInPictureElement) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.debug("YouTube Mini: přechod v PiP se nezdařil:", err);
    }
  }

  function dispatchNavKeys(direction) {
    const key = direction > 0 ? "ArrowDown" : "ArrowUp";
    const keyCode = direction > 0 ? 40 : 38;
    const opts = {
      key,
      code: key,
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true
    };
    const target = document.activeElement || document.body;
    try {
      target.dispatchEvent(new KeyboardEvent("keydown", opts));
      target.dispatchEvent(new KeyboardEvent("keyup", opts));
    } catch {}
    try {
      window.dispatchEvent(new KeyboardEvent("keydown", opts));
      window.dispatchEvent(new KeyboardEvent("keyup", opts));
    } catch {}
  }

  function clickNavButtons(direction) {
    if (!location.hostname.includes("instagram.com")) return false;
    const targetLabel = direction > 0 ? "next" : "prev";
    const buttons = [...document.querySelectorAll("button, [role='button']")];
    for (const btn of buttons) {
      const aria = (btn.getAttribute("aria-label") || "").toLowerCase();
      if (aria.includes(targetLabel)) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  function scrollPageBy(direction) {
    const container = findScrollContainer();
    const delta = (container === window ? window.innerHeight : container.clientHeight) || 600;
    if (container === window) {
      window.scrollBy({ top: direction * delta, behavior: "smooth" });
    } else {
      container.scrollBy({ top: direction * delta, behavior: "smooth" });
    }
  }

  function findScrollContainer() {
    const withSnap = [...document.querySelectorAll("div, main, section")].find((el) => {
      try {
        const snap = window.getComputedStyle(el).scrollSnapType;
        return snap && snap.includes("y");
      } catch {
        return false;
      }
    });
    if (withSnap) return withSnap;

    const withOverflow = [...document.querySelectorAll("div, main, section")].find((el) => {
      try {
        const s = window.getComputedStyle(el);
        return (s.overflowY === "auto" || s.overflowY === "scroll") &&
          el.clientHeight > 200 &&
          el.querySelector("video");
      } catch {
        return false;
      }
    });
    return withOverflow || document.scrollingElement || window;
  }

  function getBestVideo() {
    const videos = [...document.querySelectorAll("video")];
    for (const v of videos) {
      if (v.disablePictureInPicture) {
        v.disablePictureInPicture = false;
        v.removeAttribute("disablePictureInPicture");
      }
    }
    return videos
      .filter((item) => item.readyState >= HTMLMediaElement.HAVE_METADATA)
      .sort((a, b) => scoreVideo(b) - scoreVideo(a))[0] || null;
  }

  function scoreVideo(video) {
    const rect = video.getBoundingClientRect();
    const vHeight = window.innerHeight || document.documentElement.clientHeight;
    const vWidth = window.innerWidth || document.documentElement.clientWidth;
    const visibleY = Math.max(0, Math.min(rect.bottom, vHeight) - Math.max(rect.top, 0));
    const visibleX = Math.max(0, Math.min(rect.right, vWidth) - Math.max(rect.left, 0));
    const visibleArea = Math.max(0, visibleY * visibleX);
    const totalArea = Math.max(0, rect.width * rect.height);

    return (video.paused ? 0 : 1_000_000) +
      (visibleArea > 0 ? 100_000 : 0) +
      visibleArea +
      (video.muted ? 0 : 20_000) +
      Math.min(totalArea, 500_000);
  }

  function isElementVisible(el) {
    const rect = el.getBoundingClientRect();
    const vHeight = window.innerHeight || document.documentElement.clientHeight;
    const vWidth = window.innerWidth || document.documentElement.clientWidth;
    const visibleY = Math.max(0, Math.min(rect.bottom, vHeight) - Math.max(rect.top, 0));
    const visibleX = Math.max(0, Math.min(rect.right, vWidth) - Math.max(rect.left, 0));
    return (visibleY * visibleX) > 0.25 * (rect.width * rect.height);
  }

  function report(state) {
    try {
      chrome.runtime.sendMessage({ type: "pip-state", state }).catch(() => {});
    } catch {
      // Rozšíření bylo znovu načteno a tahle stránka ještě ne.
    }
  }
})();
