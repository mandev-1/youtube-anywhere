// Spouští se injektováním do cílové záložky YouTube po kliknutí na extension.
// Důležité: pracuje s PŮVODNÍM video elementem, nevytváří nový iframe.
(async () => {
  try {
    if (!document.pictureInPictureEnabled) {
      return { status: "error", message: "Picture-in-Picture je na této stránce zakázaný." };
    }

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return { status: "closed" };
    }

    const videos = [...document.querySelectorAll("video")];
    const video = videos
      .filter((item) => item.readyState >= HTMLMediaElement.HAVE_METADATA)
      .sort((a, b) => score(b) - score(a))[0];

    if (!video) {
      return { status: "error", message: "Na YouTube zatím neběží připravené video." };
    }

    if (video.disablePictureInPicture) {
      return { status: "error", message: "Video nepovoluje Picture-in-Picture." };
    }

    await video.requestPictureInPicture();
    return { status: "opened" };
  } catch (error) {
    return {
      status: "error",
      message: error?.name === "NotAllowedError"
        ? "Chrome vyžaduje přímé kliknutí uživatele: aktivuj YouTube tab a zkus znovu."
        : `Nelze spustit PiP: ${error?.message || "neznámá chyba"}`
    };
  }

  function score(video) {
    const rect = video.getBoundingClientRect();
    const size = Math.max(0, rect.width * rect.height);
    return (video.paused ? 0 : 1_000_000) +
      (video.muted ? 0 : 20_000) + size;
  }
})()
