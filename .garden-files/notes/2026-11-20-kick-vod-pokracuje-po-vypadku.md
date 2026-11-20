---
type: feat
scope: kick
commit: kick vod po výpadku pokračuje tam, kde bylo
---

### Kick VOD po výpadku pokračuje, kde bylo

- **Co je jinak:** Když se při sledování VOD na Kicku přehrávač kvůli výpadku spojení nebo chybě načte znovu, video se vrátí tam, kde bylo, místo aby hrálo od začátku. Pozice vydrží i obnovení stránky ve stejné kartě. Dokoukané video začne příště od začátku a odkaz s časem (`?t=…`) má přednost.
- **Proč:** Po každém zakolísání spojení začal Kick VOD od nuly a správné místo se muselo hledat ručně.
- **Co tím získáš:** Dlouhé VOD dokoukáš bez hledání, kde jsi skončil.

<!-- tech -->
New content script `kick-vod.js` (kick.com only, VOD paths `/<channel>/videos/<id>` and `/video/<id>`). It records `currentTime` of the main (largest / PiP) `<video>` into `sessionStorage` (`ytMini:kickVod:<id>`, 12 h TTL). A restart is detected by `loadstart`/`emptied`/`error`, a replaced `<video>` element, or a jump below 3 s without user input (pointer/key within 2 s, or `globalThis.__ytMiniUserSeekAt` set by `media-controls.js` for PiP/shortcut seeks). It then seeks back once the seekable range reaches the saved time, retrying up to 4× within 90 s in case the player resets to 0 again. Verified with a headless Chromium test against a local page (source reload, new element, silent jump to 0, user seek to start, page reload, SPA switch to another VOD); not yet tried against the real Kick player.
