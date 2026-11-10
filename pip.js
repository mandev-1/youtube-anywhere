// Spouští se injektováním do cílové záložky (YouTube, Kick, Instagram) po kliknutí na extension.
// Důležité: pracuje s PŮVODNÍM video elementem, nevytváří nový iframe.
(async () => {
  try {
    if (!document.pictureInPictureEnabled) {
      return { status: "error", message: "Picture-in-Picture je na této stránce zakázaný." };
    }

    if (document.pictureInPictureElement) {
      globalThis.__ytMiniManualPip = false;
      await document.exitPictureInPicture();
      return { status: "closed" };
    }

    const videos = [...document.querySelectorAll("video")];
    for (const v of videos) {
      if (v.disablePictureInPicture) {
        v.disablePictureInPicture = false;
        v.removeAttribute("disablePictureInPicture");
      }
    }

    const video = videos
      .filter((item) => item.readyState >= HTMLMediaElement.HAVE_METADATA)
      .sort((a, b) => score(b) - score(a))[0];

    if (!video) {
      return { status: "error", message: "Na stránce zatím neběží připravené video." };
    }

    video.disablePictureInPicture = false;
    video.removeAttribute("disablePictureInPicture");

    await video.requestPictureInPicture();
    // Ručně zapnuté PiP se po návratu na kartu nezavírá (viz closeAutoPip).
    globalThis.__ytMiniManualPip = true;

    const onLeave = () => {
      setTimeout(() => {
        if (!document.pictureInPictureElement) {
          globalThis.__ytMiniManualPip = false;
          video.removeEventListener("leavepictureinpicture", onLeave);
        }
      }, 100);
    };
    video.addEventListener("leavepictureinpicture", onLeave);

    return { status: "opened" };
  } catch (error) {
    return {
      status: "error",
      message: error?.name === "NotAllowedError"
        ? "Chrome vyžaduje přímé kliknutí uživatele: aktivuj kartu s videem a zkus znovu."
        : `Nelze spustit PiP: ${error?.message || "neznámá chyba"}`
    };
  }

  function score(video) {
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
})();
