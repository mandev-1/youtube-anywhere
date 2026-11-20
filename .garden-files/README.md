# .garden-files

Tuhle složku založil Dependency Garden. Jsou v ní poznámky ke změnám v projektu: Dependency Garden z nich předvyplní zprávu commitu a při vydání z nich složí patch notes. Píše je hlavně coding agent, ale může i člověk. Soubor spravuje Dependency Garden (verze konvence 3) a při aktualizaci ho přepíše.

## Jak to funguje

- V `notes/` je jedna poznámka na jednu změnu tak, jak ji uvidí uživatel. Ne na commit a ne na sezení: commit může mít víc poznámek a jedna poznámka může vznikat přes víc commitů.
- Poznámka, která ještě není v commitu, popisuje rozdělanou práci. Dependency Garden z ní vyplní commit a commitne ji s ní.
- Poznámka, která už v commitu je, čeká na vydání. Vydání její text přesune do patch notes a soubor smaže.
- Dokud poznámka existuje, změna ještě nevyšla.

## Pravidla

1. Ke každé změně založ `notes/RRRR-MM-DD-kratky-nazev.md` (malá písmena, pomlčky, bez diakritiky).
2. Než založíš novou poznámku, projdi `notes/`. Když tam už je poznámka ke stejné funkci, uprav ji. Platí to i pro opravu: funkce ještě nevyšla, takže to není „Opraveno“, jen se upraví popis.
3. Při úpravě poznámky přepiš hlavičku (`type`, `scope`, `commit`) tak, aby popisovala tuhle úpravu, třeba `type: fix` a `commit: chat drží místo při zoomu`. Hlavička je jen pro příští commit. Nadpis a tělo dál popisují celou změnu pro uživatele: doplň je, historii oprav do nich nepiš.
4. Kvůli poznámce neměň verzi ani soubor s patch notes (PATCH_NOTES.md, CHANGELOG.md). To udělá vydání.
5. Poznámku napiš nebo uprav dřív, než práci předáš.

## Tvar poznámky

```markdown
---
type: fix
scope: git
commit: zapisovat opakovaný push do auditu změn
---

### Push zkoušený znovu: v Auditu změn a bez staré chyby

- **Co je jinak:** Každý push z karty GitHub má vlastní záznam v Auditu změn…
- **Proč:** Push zkoušený znovu se nikde nezapsal…
- **Co tím získáš:** V Auditu vidíš celý příběh commitu…

<!-- tech -->
Push and pull go through `GardenStore.syncGit`, recorded as `Kind.sync`.
```

### Hlavička

Hlavička popisuje příští commit: u nové poznámky celou změnu, u upravené jen tuhle úpravu.

- `type` (povinné): typ podle Conventional Commits: `feat` nová funkce, `fix` oprava, `perf` rychlost nebo paměť, `refactor`, `docs`, `style`, `test`, `build`, `ci`, `chore`, `revert`.
- `scope` (volitelné): oblast projektu, třeba `git` nebo `katalog`.
- `breaking: true` (volitelné): změna, která rozbije něco, na co se dá spoléhat. Zpráva commitu dostane `!`.
- `commit` (povinné): zbytek první řádky commitu, malými písmeny a bez tečky na konci. Celá řádka `type(scope): commit` má být do 72 znaků.

### Tělo

- Je pro lidi, kteří projekt používají: nadpis `###` a odrážky **Co je jinak**, **Proč** a **Co tím získáš**. Piš v jazyce a tónu patch notes projektu, podívej se na ty existující.
- Oprava chyby, která už vyšla, má nadpis `### Opraveno: …`, odebraná věc `### Odebráno: …`.
- Interní změna, kterou uživatel nepozná (refactor, testy, údržba), tělo nemá. Stačí hlavička.
- Technické podrobnosti pro vývojáře (typy, soubory, proč právě takhle) patří na konec pod řádek `<!-- tech -->`. Jsou volitelné.

### Obrázky z handoffů

Když změna vychází z handoffu (návrh, mockup nebo snímek ve složce `.handoffs/`), přidej do těla poznámky obrázek, ať je v patch notes vidět, podle čeho změna vznikla:

- Samostatný řádek `![popisek](.handoffs/nazev-handoffu/obrazek.png)` pod odrážkami, před `<!-- tech -->`. Cesta je od složky projektu, popisek je krátká věta o tom, co obrázek ukazuje.
- Jen obrázky, které v projektu opravdu jsou a patří do repozitáře (png, jpg, jpeg, gif, webp, heic, tiff). Nic nekopíruj, nepřesouvej ani nepřejmenovávej a neodkazuj na soubory mimo projekt ani na web.
- Nejvýš tři obrázky na změnu: ten, který změnu ukazuje nejlíp. Když handoff obrázek nemá, řádek nepřidávej.
- Vydání řádek přenese do patch notes a záložka Changelog v Dependency Garden ho ukáže jako obrázek přes šířku textu s popiskem.

## Obrázky (`assets/`)

`assets/manifest.json` spravuje Dependency Garden: vznikne, když se do projektu uloží první obrázek z Image Studia, a patří do repozitáře. Ke každému uloženému obrázku drží cestu, prompt, model, parametry, autora (uživatel nebo druh agenta, bez relace) a otisk souboru, k tomu výchozí složku a formát projektu. Ručně ho neupravuj; když soubor obrázku smažeš nebo přesuneš, Garden u záznamu ukáže „Soubor chybí“.