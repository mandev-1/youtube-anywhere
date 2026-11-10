// instagram-fix.js
// Běží ve světě stránky (MAIN world) na instagram.com.
// Zabraňuje Instagramu v pozastavení videa při přepnutí záložky nebo ztrátě fokusu.
(() => {
  try {
    if (globalThis.__ytMiniInstagramFixApplied) return;
    globalThis.__ytMiniInstagramFixApplied = true;

    // 1. Původní getter viditelnosti pro spolehlivou detekci skutečně skryté karty
    const nativeVisibility = Object.getOwnPropertyDescriptor(
      Document.prototype,
      "visibilityState"
    )?.get;

    // 2. Předstíráme, že stránka je stále viditelná a má fokus
    try {
      Object.defineProperty(Document.prototype, "visibilityState", {
        get: () => "visible",
        configurable: true
      });
      Object.defineProperty(Document.prototype, "hidden", {
        get: () => false,
        configurable: true
      });
      Document.prototype.hasFocus = () => true;
      document.hasFocus = () => true;
    } catch {}

    // 3. Zablokujeme události, kterými Instagram detekuje opuštění karty
    const block = (e) => {
      e.stopImmediatePropagation();
    };

    for (const type of [
      "visibilitychange",
      "webkitvisibilitychange",
      "blur",
      "focusout",
      "pagehide"
    ]) {
      window.addEventListener(type, block, true);
    }

    // 4. Ignorujeme programatické pause() vyvolané Instagramem, když je video v PiP
    // nebo když je záložka na pozadí. Chrome nativní PiP ovládání nevolá JS pause(),
    // takže tlačítko pauzy v PiP okně zůstává funkční.
    const nativePause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function () {
      const isReallyHidden = nativeVisibility
        ? nativeVisibility.call(document) !== "visible"
        : false;
      if (document.pictureInPictureElement || isReallyHidden) {
        return Promise.resolve();
      }
      return nativePause.apply(this, arguments);
    };
  } catch (err) {
    console.debug("YouTube Mini: Instagram background fix se nezdařil:", err);
  }
})();
