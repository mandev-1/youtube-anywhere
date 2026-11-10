# YouTube Mini – vlevo dole

Minimalistická Chrome extension (Manifest V3, vanilla JavaScript, **bez npm a bez buildu**).
Přesouvá **původní** video z **YouTube**, **Kicku** (např. `kick.com/xqc`) nebo **Instagramu (Reels)** do nativního Picture-in-Picture okna, které je vidět při procházení jiných stránek i aplikací. Nevzniká další přehrávač a zvuk se neduplikuje.

## Instalace

1. Rozbal ZIP.
2. Do adresního řádku Chromu napiš `chrome://extensions`.
3. Aktivuj **Režim pro vývojáře / Developer mode**.
4. Klikni **Načíst rozbalené / Load unpacked**.
5. Vyber složku s rozšířením, ve které leží `manifest.json`.

## Použití

1. Otevři video na **youtube.com**, stream na **kick.com** nebo Reels na **instagram.com** a spusť ho.
2. Klikni na ikonu rozšíření v liště (nebo stiskni **Alt+Shift+P**).
3. Video se zobrazí v plovoucím PiP okně; přepni na jakýkoliv web.
4. Dalším kliknutím na ikonu ho můžeš vypnout; funguje i zavírací tlačítko v PiP.

### Podpora pro Reels a Shorts (scrollování)

Při sledování Instagram Reels nebo YouTube Shorts v plovoucím okně můžeš snadno přecházet mezi videi:

1. **Přímo v PiP okně:** Kliknutím na tlačítka pro další/předchozí stopu (ikony ⏭ a ⏮) přímo v ovládání plovoucího okna.
2. **Klávesovou zkratkou:** Stiskni **Alt+Shift+Down** pro další reel nebo **Alt+Shift+Up** pro předchozí reel odkudkoliv v Chromu.
3. **Scrollováním na stránce:** Pokud scrolluješ kolečkem myši, touchpadem nebo šipkami přímo na záložce s Reels či Shorts, plovoucí PiP okno se automaticky plynule přepne na právě zobrazený reel.
4. **Přehrávání na pozadí:** Instagram běžně videa při přepnutí karty pozastavuje – rozšíření toto chování eliminuje, takže Reels hrají nerušeně dál i v PiP.

### Automaticky při přepnutí záložky

Když na YouTube, Kicku nebo Instagramu hraje video a přepneš na jinou záložku, video se samo otevře v PiP. Po návratu na kartu s videem se PiP zase zavře. PiP zapnuté ručně ikonou nebo zkratkou zůstane otevřené.

- Funguje v novějším Chromu (přibližně 134+), který podporuje automatické PiP přes Media Session API. Ve starším zůstává jen ruční ovládání.
- Chrome se může poprvé zeptat, jestli automatický obraz v obraze pro daný web povolit. Nastavení najdeš v *Nastavení stránek → Další oprávnění → Automatický obraz v obraze*.
- Video musí hrát se zvukem. Kick i Instagram spouští videa občas ztlumené, takže je nejdřív odtlum. Aby se PiP samo zapínalo, je potřeba karty otevřené před instalací nebo aktualizací rozšíření jednou obnovit.

Zkusit lze i kliknutí z jiné stránky – rozšíření vyhledá otevřenou kartu s videem. Některé verze Chromu ale vyžadují zahájení PiP přímo z karty s videem kvůli ochraně uživatelského gesta.

## Umístění vlevo dole

Rozšíření se pokusí okno umístit **vlevo dole v rámci aktuálního okna Chromu**, přibližně na velikost 360 × 220 px. V závislosti na systému/Chromu nemusí být nativní video PiP zpřístupněné pro programové přesouvání. **Když se otevře jinde, přetáhni ho myší vlevo dolů** – stále zůstane navrchu všech webů.

## Důležitá omezení

- Jde o samostatné nativní okno PiP, **nikoliv DOM overlay uvnitř každé stránky**. To je záměrně: přesunutí jediného přehrávaného videa mezi stránkami by jinak nebylo možné bez složitého streamování nebo duplicitního přehrávače.
- Na stránkách `chrome://`, Chrome Web Store a podobných chráněných webech nelze injektovat skripty, ale **nativní PiP okno nad nimi vidět je**.
- Zdrojová karta s videem musí zůstat otevřená. Když ji zavřeš nebo na ní přejdeš jinam, PiP se ukončí.
- Automatické spuštění mimo přepnutí záložky není možné; Chrome PiP jinak chrání požadavkem uživatelského gesta.

## Struktura

```text
youtube-mini-left/
├── manifest.json       # MV3 manifest + oprávnění + klávesové zkratky
├── background.js       # toolbar, správa záložek, PiP zkratky a pozice
├── pip.js              # skutečný video element -> PiP
├── autopip.js          # automatické PiP a ovládání Reels / Shorts v PiP
├── instagram-fix.js    # běh Instagramu na pozadí ve světě stránky (MAIN world)
├── assets/             # ikony
└── README.md
```

## Úpravy

- `PIP_SIZE` v `background.js`: požadovaná šířka/výška.
- `PLACEMENT_MARGIN`: odstup od levého a spodního okraje.
- `score()` v `pip.js` a `scoreVideo()` v `autopip.js`: algoritmus výběru nejvhodnějšího videa.

Rozšíření neodesílá data na server ani nevyžaduje žádné externí knihovny.
