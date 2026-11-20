---
type: feat
scope: weby
commit: podporovat streamy a vod z twitch.tv
---

### YouTube Mini funguje i pro Twitch

- **Co je jinak:** Plovoucí okno umí i streamy a VOD z twitch.tv (třeba twitch.tv/shroud). Funguje ruční zapnutí ikonou nebo Alt+Shift+P i automatické zapnutí a vypnutí při přepínání záložek.
- **Proč:** Twitch chceš sledovat stejně jako YouTube nebo Kick, i když děláš něco jiného.
- **Co tím získáš:** Stream máš na očích při procházení jiných webů. Karty s Twitchem otevřené před aktualizací rozšíření je potřeba jednou obnovit.

<!-- tech -->
`www.twitch.tv`, `m.twitch.tv` and `twitch.tv` added to `host_permissions` and `content_scripts` in `manifest.json` and to `VIDEO_SITE_PATTERNS` / `VIDEO_SITE_URL` in `background.js`. Embedded players (`player.twitch.tv` iframes on other sites) are not covered.
