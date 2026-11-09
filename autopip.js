// Content script na YouTube: automatické PiP při přepnutí na jinou záložku.
// Chrome zavolá handler Media Session "enterpictureinpicture", když uživatel
// odejde z karty, kde hraje video se zvukem. Jen v tomhle handleru smí stránka
// otevřít PiP bez kliknutí. Zavření po návratu řeší background.js.
(() => {
  if (!("mediaSession" in navigator) || !document.pictureInPictureEnabled) return;

  if (!registerHandler()) return; // Chrome bez podpory automatického PiP

  // YouTube je SPA a může Media Session přenastavit: při každém přehrání
  // handler zaregistrujeme znovu.
  document.addEventListener("play", registerHandler, true);

  // Události PiP bublají z <video>; synchronizují odznak na ikoně.
  document.addEventListener("enterpictureinpicture", () => report("opened"), true);
  document.addEventListener("leavepictureinpicture", () => report("closed"), true);

  function registerHandler() {
    try {
      navigator.mediaSession.setActionHandler("enterpictureinpicture", enterAutomatically);
      return true;
    } catch {
      return false;
    }
  }

  async function enterAutomatically() {
    if (document.pictureInPictureElement) return;

    const video = [...document.querySelectorAll("video")]
      .filter((item) => item.readyState >= HTMLMediaElement.HAVE_METADATA &&
        !item.paused && !item.disablePictureInPicture)
      .sort((a, b) => size(b) - size(a))[0];
    if (!video) return;

    try {
      await video.requestPictureInPicture();
    } catch (error) {
      console.debug("YouTube Mini: automatické PiP se nepodařilo:", error);
    }
  }

  function size(video) {
    const rect = video.getBoundingClientRect();
    return Math.max(0, rect.width * rect.height);
  }

  function report(state) {
    try {
      chrome.runtime.sendMessage({ type: "pip-state", state }).catch(() => {});
    } catch {
      // Rozšíření bylo znovu načteno a tahle stránka ještě ne.
    }
  }
})();
