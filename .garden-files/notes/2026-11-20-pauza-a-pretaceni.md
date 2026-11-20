---
type: feat
scope: pip
commit: pauza a přetáčení v pip na kicku a twitchi
---

### Pauza a přetáčení v plovoucím okně na Kicku a Twitchi

- **Co je jinak:** V PiP okně jde na Kicku a Twitchi pozastavit i živé vysílání. Když kanál přetáčení dovoluje (VOD, nebo živé vysílání, ve kterém se dá vrátit zpět), ukáže novější Chrome v PiP i tlačítka ±10 s a posuvník. Nové klávesové zkratky *Pozastavit / pustit* a *Přetočit o 10 s zpět / dopředu* fungují na všech podporovaných webech odkudkoli v Chromu, jen si je nastav v `chrome://extensions/shortcuts`. Na Kicku a Twitchi už PiP neukazuje tlačítka další/předchozí, která tam nic nedělala.
- **Proč:** Chrome u živého vysílání tlačítko pauzy skrývá a přetáčet šlo jen na kartě se streamem.
- **Co tím získáš:** Stream nebo VOD ovládáš přímo z malého okna, bez přepínání na kartu.

<!-- tech -->
New content script `media-controls.js` (all video sites). On Kick/Twitch it registers Media Session `play`/`pause` (Chrome then shows play/pause in PiP even when `duration === Infinity`) and, only while `seekRange()` allows it, `seekbackward`/`seekforward`/`seekto` plus `setPositionState`. Live streams count as seekable only with a seekable window ≥ 120 s, so a player's back buffer doesn't look like DVR; on live DVR the position state covers just the seekable window. Handlers are re-registered on media events and every 5 s because sites overwrite them. On Twitch pause goes through the player's own play/pause button to keep its UI state in sync. YouTube/Instagram keep their own handlers; there the script only serves the `media-control` messages from the new `play_pause` / `seek_backward` / `seek_forward` commands (no default keys, Chrome allows only 4 suggested ones). `background.js` `handleNavigationCommand` became the generic `sendToVideoTab(message)`. `autopip.js` skips `nexttrack`/`previoustrack` on Kick/Twitch.
