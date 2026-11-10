# Mapa vektorů útoku a bezpečnostní analýza: YouTube Mini – vlevo dole

Tento dokument slouží k evidenci a vyhodnocení bezpečnostních rizik a vektorů útoku v projektu.

## 1. Lokální spouštění procesů a skriptů
- **Projektové skripty:** Skripty definované v `package.json` nebo skripty vydání (`scripts/package.sh`, `scripts/release.sh`).
- **Externí CLI nástroje:** Volání systémových nástrojů jako `git`, `gh`, `npm`, `swift`, `xcodebuild`.
- **Doporučená opatření:**
  - Spouštět instalace se zákazem instalačních skriptů balíčků (`npm install --ignore-scripts`).
  - Nikdy nespouštět neznámé spustitelné soubory z repozitářů třetích stran.

## 2. AI Agenti a bezpečnostní kontext
- **Vstupy do promptu:** Do promptu AI agentů (Claude Code, Codex, Antigravity) mohou vstupovat výstupy buildů, chybové hlášky, commit zprávy nebo názvy závislostí.
- **Riziko nepřímé injekce (Indirect Prompt Injection):** Útočník může do chybové hlášky nebo manifestu umístit instrukce manipulující chování agenta.
- **Doporučená opatření:**
  - Vyhnout se automatickému přeskakování potvrzení (`--dangerously-skip-permissions`).
  - Pečlivě kontrolovat navržené změny před jejich provedením.

## 3. Dodavatelský řetězec a externí závislosti
- **Audit známých zranitelností:** Pravidelné dotazování na databázi známých zranitelností (Google OSV API).
- **Ochrana privátních metadat:** Zamezit náhodnému odesílání interních názvů firemních balíčků do veřejných registrů.
- **Integrita:** Zamykat verze přes `package-lock.json` a ověřovat integrity hashe.

## 4. Oprávnění a systémový přístup
- **Citlivé soubory:** Ujistit se, že `.env`, přihlašovací údaje a tokeny jsou ignorovány v `.gitignore`.
- **TCC a souborový systém:** Projekt by měl operovat pouze ve své vlastní složce bez nutnosti širokých systémových oprávnění.