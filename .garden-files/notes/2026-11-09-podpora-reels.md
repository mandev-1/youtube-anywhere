---
type: feat
scope: reels
commit: podpora pro instagram reels a scrollovani v pip
---

### Podpora pro Instagram Reels a scrollování na další video v PiP

- **Co je jinak:** Rozšíření nově podporuje Instagram a jeho Reels feed. Při přehrávání v Picture-in-Picture lze na další i předchozí reel přecházet pomocí tlačítek přímo v PiP okně, klávesovými zkratkami Alt+Shift+Down / Alt+Shift+Up nebo scrollováním na stránce. Plovoucí okno se při scrollování automaticky přeladí na nově zobrazený reel a Instagram nepřestane hrát při přepnutí záložky.
- **Proč:** Při sledování krátkých videí v plovoucím okně je nepraktické se kvůli každému dalšímu videu vracet na původní kartu.
- **Co tím získáš:** Pohodlné procházení Reels i Shorts v malém okně v rohu obrazovky, i když pracuješ v jiných záložkách nebo aplikacích.

<!-- tech -->
Added Instagram to `host_permissions`, `content_scripts`, and `background.js`. Created `instagram-fix.js` running in `world: "MAIN"` to defuse Instagram's tab-blur pause logic (Page Visibility API and blur events) and unblock `disablePictureInPicture`. Extended `autopip.js` with Media Session `nexttrack` and `previoustrack` action handlers and registered `commands` in `manifest.json` (`next_video` and `prev_video`) wired through `background.js`. PiP seamlessly transfers to newly active video elements on `play` and debounced `scroll`.
