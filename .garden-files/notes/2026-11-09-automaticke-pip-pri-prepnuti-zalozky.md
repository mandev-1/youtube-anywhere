---
type: fix
scope: pip
commit: spolehlivě zavírat automatické pip po návratu na youtube
---

### Video se samo přesune do PiP, když odejdeš z YouTube

- **Co je jinak:** Když na YouTube hraje video a přepneš na jinou záložku, otevře se samo v plovoucím okně. Po návratu na YouTube kartu (nebo do okna Chromu, kde je aktivní) se okno zase zavře. PiP zapnuté ručně ikonou nebo Alt+Shift+P zůstane otevřené.
- **Proč:** Klikat na ikonu před každým přepnutím záložky zdržovalo.
- **Co tím získáš:** Video máš na očích při procházení jiných webů bez jediného kliknutí. Funguje v novějším Chromu (přibližně 134+); poprvé se Chrome může zeptat na povolení.

<!-- tech -->
New content script `autopip.js` registers the Media Session `enterpictureinpicture` action handler, the only place Chrome allows `requestPictureInPicture()` without a user gesture, and reports PiP enter/leave to `background.js` so the badge stays in sync (also after closing via the PiP close button).
Closing on return lives in `background.js` (`tabs.onActivated` + `windows.onFocusChanged` → `closeAutoPip`), not in a page `visibilitychange` listener: the page may not get that event while in PiP, and PiP may have been opened by YouTube/Chrome rather than our handler. It also works in tabs opened before the extension was installed. Manual PiP is marked by `pip.js` with `globalThis.__ytMiniManualPip` in the shared isolated world and is left open.
