# YouTube Mini – vlevo dole

Minimalistická Chrome extension (Manifest V3, vanilla JavaScript, **bez npm a bez buildu**).
Přesouvá **původní** YouTube video do nativního Picture-in-Picture okna, které je vidět při procházení jiných stránek i aplikací. Nevzniká další YouTube přehrávač a zvuk se neduplikuje.

## Instalace

1. Rozbal ZIP.
2. Do adresního řádku Chromu napiš `chrome://extensions`.
3. Aktivuj **Režim pro vývojáře / Developer mode**.
4. Klikni **Načíst rozbalené / Load unpacked**.
5. Vyber složku `youtube-mini-left`, ve které leží `manifest.json`.

## Použití

1. Otevři video na **youtube.com** a spusť ho.
2. Klikni na ikonu rozšíření v liště (nebo stiskni **Alt+Shift+P**).
3. Video se zobrazí v plovoucím PiP okně; přepni na jakýkoliv web.
4. Dalším kliknutím na ikonu ho můžeš vypnout; funguje i zavírací tlačítko v PiP.

### Automaticky při přepnutí záložky

Když na YouTube hraje video a přepneš na jinou záložku, video se samo otevře v PiP. Po návratu na YouTube kartu se PiP zase zavře. PiP zapnuté ručně ikonou nebo zkratkou zůstane otevřené.

- Funguje v novějším Chromu (přibližně 134+), který podporuje automatické PiP přes Media Session API. Ve starším zůstává jen ruční ovládání.
- Chrome se může poprvé zeptat, jestli automatický obraz v obraze pro YouTube povolit. Nastavení najdeš v *Nastavení stránek → Další oprávnění → Automatický obraz v obraze*.
- Video musí hrát se zvukem. Aby se PiP samo zapínalo, je potřeba YouTube karty otevřené před instalací nebo aktualizací rozšíření jednou obnovit.

Zkusit lze i kliknutí z jiné stránky – rozšíření vyhledá otevřený YouTube tab. Některé verze Chromu ale vyžadují zahájení PiP přímo z YouTube karty kvůli ochraně uživatelského gesta.

## Umístění vlevo dole

Rozšíření se pokusí okno umístit **vlevo dole v rámci aktuálního okna Chromu**, přibližně na velikost 360 × 220 px. V závislosti na systému/Chromu nemusí být nativní video PiP zpřístupněné pro programové přesouvání. **Když se otevře jinde, přetáhni ho myší vlevo dolů** – stále zůstane navrchu všech webů.

## Důležitá omezení

- Jde o samostatné nativní okno PiP, **nikoliv DOM overlay uvnitř každé stránky**. To je záměrně: přesunutí jediného přehrávaného videa mezi stránkami by jinak nebylo možné bez složitého streamování nebo duplicitního přehrávače.
- Na stránkách `chrome://`, Chrome Web Store a podobných chráněných webech nelze injektovat skripty, ale **nativní PiP okno nad nimi vidět je**.
- Zdrojová YouTube karta musí zůstat otevřená. Když ji zavřeš nebo na ní přejdeš jinam, PiP se ukončí.
- Automatické spuštění mimo přepnutí záložky není možné; Chrome PiP jinak chrání požadavkem uživatelského gesta.

## Struktura

```text
youtube-mini-left/
├── manifest.json       # MV3 manifest + oprávnění + klávesová zkratka
├── background.js       # toolbar, výběr YT záložky, pokus o pozici PiP
├── pip.js              # skutečný YouTube video element -> PiP
├── autopip.js          # automatické PiP při přepnutí záložky
├── assets/             # ikony
└── README.md
```

## Úpravy

- `PIP_SIZE` v `background.js`: požadovaná šířka/výška.
- `PLACEMENT_MARGIN`: odstup od levého a spodního okraje.
- `score()` v `pip.js`: algoritmus výběru videa, pokud jich je na stránce více.

Rozšíření neodesílá data na server ani nevyžaduje žádné externí knihovny.
