---
type: feat
scope: weby
commit: podporovat streamy z kick.com
---

### YouTube Mini funguje i pro streamy na Kicku

- **Co je jinak:** Plovoucí okno umí kromě YouTube i streamy z kick.com (třeba kick.com/xqc). Funguje ruční zapnutí ikonou nebo Alt+Shift+P i automatické zapnutí a vypnutí při přepínání záložek.
- **Proč:** Na Kicku chceš stream sledovat stejně jako YouTube, i když děláš něco jiného.
- **Co tím získáš:** Stream máš na očích při procházení jiných webů. Automatické PiP potřebuje stream se zvukem, takže ho na Kicku nejdřív odtlum.

<!-- tech -->
`kick.com` and `www.kick.com` added to `host_permissions` and `content_scripts` in `manifest.json`. `background.js` uses `VIDEO_SITE_PATTERNS` / `VIDEO_SITE_URL` instead of the YouTube-only regex; keep both in sync with the manifest when adding sites. Video selection in `pip.js` / `autopip.js` is site-agnostic (largest playing `<video>`).
