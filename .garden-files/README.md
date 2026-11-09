# .garden-files

Tuhle složku založil Dependency Garden. Jsou v ní poznámky ke změnám v projektu: Dependency Garden z nich předvyplní zprávu commitu a při vydání z nich složí patch notes. Píše je hlavně coding agent, ale může i člověk. Soubor spravuje Dependency Garden (verze konvence 2) a při aktualizaci ho přepíše.

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

## Obrázky (`assets/`)

`assets/manifest.json` spravuje Dependency Garden: vznikne, když se do projektu uloží první obrázek z Image Studia, a patří do repozitáře. Ke každému uloženému obrázku drží cestu, prompt, model, parametry, autora (uživatel nebo druh agenta, bez relace) a otisk souboru, k tomu výchozí složku a formát projektu. Ručně ho neupravuj; když soubor obrázku smažeš nebo přesuneš, Garden u záznamu ukáže „Soubor chybí“.