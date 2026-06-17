# WatchHub

WatchHub je výukový Node.js projekt pro soukromý katalog streamovacích služeb.

Cílem aplikace je zobrazit dostupné filmy a seriály z vybraných streamovacích služeb na jednom místě, evidovat lokální profily, filtrovat katalog podle profilu a otevírat tituly přes oficiální službu nebo bezpečný fallback odkaz.

Aktuální stav projektu je **POC + post-POC refaktorový milestone**, ne produkční aplikace.

Projekt je vedený postupně po malých vývojových krocích. Historie commitů má záměrně ukazovat postupný vývoj aplikace od základního Node.js projektu přes databázi, API, synchronizaci katalogu, profily, watchlist, admin diagnostiku až po refaktor frontendu a backendu.

## Funkce v aktuálním stavu

- evidence streamovacích služeb

- evidence uživatelských předplatných

- synchronizace providerů pro ČR přes TMDb

- synchronizace žánrů přes TMDb

- synchronizace katalogu filmů a seriálů přes TMDb

- zobrazení katalogu ve vanilla HTML/CSS/JavaScript UI

- filtrování podle názvu, služby, typu a žánru

- detail titulu s metadaty, plakátem, popisem, hodnocením, žánry a dostupnými službami

- přesnější datumy u filmů a seriálů

- profily s věkovým limitem

- profilový watchlist

- označení titulů jako:

  - Chci vidět
  - Zhlédnuto
  - Skrýt

- skrytí titulů podle aktivního profilu

- sekce Novinky

- sekce Můj seznam

- sekce Zhlédnuto

- základní admin diagnostika

- přehled služeb v admin části

- přehled profilů v admin části

- přehled externích odkazů v admin části

- přehled kvality katalogu v admin části

- Movie of the Night odkazy načítané ručně na vyžádání

- lokální SQLite cache pro konkrétní externí odkazy

- lokální počitadlo využití Movie of the Night API limitu

- backend katalogové routy rozdělené do menších helperů

- frontend helpery rozdělené do menších vanilla JavaScript souborů

- frontend renderery rozdělené podle odpovědnosti bez použití frameworku nebo buildu

- základní backend/API smoke testy přes vestavěný Node.js test runner

- izolovaná testovací SQLite databáze přes `WATCHHUB_DB_PATH`

- katalogová SQL fixture pro automatizované testy

- hlavní kontrolní příkaz `npm run check` spouští formátování, lint i automatizované testy

## Co aplikace není

WatchHub není přehrávač streamovaného obsahu.

Aplikace:

- nestahuje video ze streamovacích služeb
- neobchází DRM
- nezískává `.m3u8`, `.mpd` ani jiné přímé streamovací URL
- neukládá hesla, cookies ani session tokeny
- nepřehrává obsah mimo oficiální streamovací službu
- nescrapuje účty po přihlášení
- nereverse-engineeruje interní API Netflixu, Disney+, Maxu ani SkyShowtime

WatchHub slouží pouze jako katalog, přehled dostupnosti, profilový filtr, watchlist, novinkový přehled a launcher.

## Použité technologie

- JavaScript
- Node.js
- Express
- SQLite přes `node:sqlite`
- SQL
- HTML
- CSS
- vanilla JavaScript
- CommonJS

Projekt zatím záměrně nepoužívá:

- React
- Next.js
- TypeScript
- Docker
- ORM
- frontend build tools
- přihlašování uživatelů

## Struktura frontendu

Frontend je záměrně postavený bez frameworku a bez build toolů. Jednotlivé soubory se načítají přímo přes `<script>` tagy v `public/index.html`.

Hlavní rozdělení:

- `public/app.js` — stav aplikace, API orchestrace, event listenery a inicializace
- `public/js/api.js` — jednoduchý helper pro JSON requesty
- `public/js/config.js` — sdílené frontend konstanty
- `public/js/formatters.js` — formátování datumů, čísel, hodnocení a HTML escapování
- `public/js/labels.js` — převody interních hodnot na české popisky
- `public/js/domHelpers.js` — malé DOM helpery pro badge, plakát, info řádek a bezpečné odkazy
- `public/js/titleRenderers.js` — katalogové karty, novinkové karty a grid titulů
- `public/js/detailRenderers.js` — detail titulu, launchery a profilové akce v detailu
- `public/js/adminRenderers.js` — admin diagnostické karty a tabulky
- `public/js/profileRenderers.js` — vykreslení přepínače profilů

Sdílení mezi soubory je řešené přes globální `window.WatchHub...` namespace. Je to jednoduché řešení vhodné pro aktuální výukovou fázi projektu bez bundleru.

Pořadí scriptů v `public/index.html` je důležité:

```html
<script src="js/config.js"></script>
<script src="js/formatters.js"></script>
<script src="js/labels.js"></script>
<script src="js/domHelpers.js"></script>
<script src="js/titleRenderers.js"></script>
<script src="js/detailRenderers.js"></script>
<script src="js/adminRenderers.js"></script>
<script src="js/profileRenderers.js"></script>
<script src="js/api.js"></script>
<script src="app.js"></script>
```

## Externí zdroje dat

### TMDb

TMDb je hlavní zdroj:

- providerů
- katalogových metadat
- žánrů
- plakátů
- popisů
- hodnocení
- dostupnosti podle regionu

TMDb se volá pouze z backendu. Přístupový token patří do `.env` a nesmí být uložený v Gitu.

This product uses the TMDB API but is not endorsed or certified by TMDB.

### Movie of the Night

Movie of the Night je doplňkový zdroj konkrétních webových odkazů na streamovací služby.

V aktuálním stavu:

- API se volá pouze z backendu
- odkazy se načítají ručně na vyžádání
- výsledné odkazy se ukládají do SQLite cache
- ukládají se pouze běžné bezpečné `https://` webové odkazy
- nepoužívají se ani neukládají přímé video odkazy
- lokálně se eviduje využití API limitu

## Lokální instalace

### 1. Naklonování repozitáře

```bash
git clone <URL_REPOZITARE>
cd WatchHub
```

### 2. Instalace závislostí

```bash
npm install
```

### 3. Vytvoření `.env`

Zkopíruj ukázkový soubor:

```bash
cp .env.example .env
```

Potom doplň vlastní hodnoty:

```env
PORT=3000

TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_ACCESS_TOKEN=your_tmdb_read_access_token_here

MOTN_BASE_URL=https://api.movieofthenight.com/v4
MOTN_API_KEY=your_movieofthenight_api_key_here
MOTN_MONTHLY_QUOTA=500
```

Soubor `.env` nesmí být commitnutý do Gitu.

## Databáze

Inicializace nové lokální SQLite databáze:

```bash
npm run db:init
```

Kontrola tabulek:

```bash
npm run db:check
```

Spuštění migrací nad existující databází:

```bash
npm run db:migrate
```

Lokální databáze je ukládaná do složky `data/`. Tato složka není určena k publikování do repozitáře.

## Synchronizace dat

Doporučený základní postup pro naplnění lokální databáze:

```bash
npm run tmdb:sync-providers
npm run tmdb:sync-genres
```

Ukázka synchronizace katalogu pro jednu službu:

```bash
npm run tmdb:sync-catalog -- movie Netflix --pages=1
npm run tmdb:sync-catalog -- tv Netflix --pages=1
```

Ukázka synchronizace všech aktivních služeb:

```bash
npm run tmdb:sync-catalog -- movie --all-services --pages=1
npm run tmdb:sync-catalog -- tv --all-services --pages=1
```

Přehled obsahu katalogu:

```bash
npm run catalog:summary
```

## Spuštění aplikace

```bash
npm start
```

Aplikace poběží lokálně na:

```text
http://localhost:3000
```

## Kontrola kvality kódu

Formátování, lint kontrola a automatizované testy:

```bash
npm run check
```

Automatická oprava formátování a lint chyb, pokud je možná:

```bash
npm run fix
```

## Automatizované testy

Projekt používá vestavěný Node.js test runner.

Samostatné spuštění testů:

```bash
npm test
```

Hlavní kontrolní příkaz pro vývoj:

```bash
npm run check
```

`npm run check` aktuálně spouští:

1. kontrolu formátování přes Prettier,
2. lint přes ESLint,
3. automatizované testy přes `npm test`.

Testy jsou zatím zaměřené na základní backend/API smoke scénáře. Cíl není plná test coverage, ale bezpečnostní síť pro další refaktor katalogu, profilů a admin endpointů.

Testy nepoužívají běžnou lokální databázi `data/watchhub.sqlite`.

Místo toho se pro testovací běh vytvoří dočasná izolovaná SQLite databáze. Cesta k ní se aplikaci předává přes proměnnou prostředí `WATCHHUB_DB_PATH`.

Testovací databáze se skládá ze dvou vrstev:

```text
database/schema.sql
tests/fixtures/catalogSeed.sql
```

`database/schema.sql` vytvoří databázovou strukturu.  
`tests/fixtures/catalogSeed.sql` doplní malou sadu mock dat pro katalogové API testy.

Aktuálně testy pokrývají zejména:

- základní běh test runneru,
- inicializaci izolované SQLite databáze,
- health endpoint,
- základní katalogový API smoke test,
- skrytí titulů podle profilového statusu `hidden`,
- filtrování katalogu podle věkového limitu profilu,
- filtrování katalogu podle blokovaných služeb profilu.

Automatické testy nesmí volat externí API. Konkrétně netestují:

- TMDb requesty,
- Movie of the Night requesty,
- endpointy vyžadující reálný API klíč nebo internetové připojení.

Externí integrace se ověřují ručně přes lokální smoke testy.

## Základní smoke test

Po lokálním spuštění ověř:

- aplikace se načte na `http://localhost:3000`
- katalog zobrazí tituly
- filtry fungují
- detail titulu se otevře v modalu
- launcher odkazy používají bezpečné webové URL
- profily, Můj seznam, Zhlédnuto a Skrýt fungují
- Novinky se načítají
- Admin přehled se načítá
- Movie of the Night se nevolá automaticky při otevření detailu
- `npm run check` projde včetně automatizovaných testů

Podrobný POC checklist je v `docs/POC_CHECKLIST.md`.

## Bezpečnost před publikací

Před zveřejněním repozitáře nebo vytvořením tagu ověř:

```bash
git status
git ls-files .env
git ls-files data
git ls-files "*.sqlite"
git ls-files "*.db"
git grep -n "TMDB_ACCESS_TOKEN"
git grep -n "MOTN_API_KEY"
git grep -n "Bearer "
```

Očekávaný stav:

- `git status` je čistý
- `.env` není trackovaný
- `data/` není trackovaná
- žádná SQLite databáze není trackovaná
- skutečné API klíče nejsou v Gitu
- `TMDB_ACCESS_TOKEN` a `MOTN_API_KEY` se objevují pouze jako názvy proměnných nebo placeholdery
- žádný reálný `Bearer` token není v kódu

## Známé limity

- aplikace je určená pro lokální soukromé použití
- neobsahuje autentizaci
- automatizované testy zatím pokrývají jen základní backend/API smoke scénáře
- UI je základní a zatím bez většího UX refaktoru
- `public/app.js` stále obsahuje hlavní orchestrace aplikace a event listenery
- frontend používá globální `window.WatchHub...` namespace místo ES modulů nebo bundleru
- `routes/catalog.js` stále obsahuje část složitější katalogové logiky
- `routes/admin.js` obsahuje více diagnostických endpointů v jednom souboru
- profilová správa je základní
- věkové ratingy nejsou plně doplněné
- runtime u titulů nemusí být doplněný
- Movie of the Night odkazy se načítají ručně pro konkrétní titul
- dávkový Movie of the Night sync zatím není implementovaný
- Filmtoro integrace zatím není implementovaná
- iVysílání a Stream zatím nejsou implementované
- aplikace zatím nemá samostatnou navigaci ani výraznější UX strukturu

## Vývojové milníky

### Dokončeno

- ~~založit Node.js projekt~~
- ~~přidat Express server~~
- ~~vytvořit statické HTML rozhraní~~
- ~~navrhnout SQLite databázi~~
- ~~přidat první REST API endpointy~~
- ~~evidovat streamovací služby a předplatná~~
- ~~přidat TMDb klienta~~
- ~~synchronizovat providery pro ČR~~
- ~~synchronizovat žánry~~
- ~~synchronizovat katalog filmů a seriálů~~
- ~~zobrazit katalog v UI~~
- ~~přidat detail titulu~~
- ~~přidat launchery na služby~~
- ~~přidat Movie of the Night on-demand odkazy~~
- ~~ukládat konkrétní odkazy do SQLite cache~~
- ~~přidat profily a věkové limity~~
- ~~přidat novinky, nové filmy a nové seriály~~
- ~~přidat profilové statusy: Chci vidět, Zhlédnuto, Skrýt~~
- ~~přidat základní admin diagnostiku~~
- ~~přidat POC checklist~~
- ~~publikovat POC checkpoint~~
- ~~označit POC tagem `v0.1.0-poc`~~
- ~~refaktorovat backend katalogové routy~~
- ~~extrahovat frontend helpery~~
- ~~rozdělit frontend renderery do tematických souborů bez buildu~~
- ~~přidat základní backend/API smoke testy~~
- ~~zapojit automatizované testy do `npm run check`~~

### Aktuální post-POC refaktor

Frontend renderery jsou rozdělené podle odpovědnosti:

- `titleRenderers.js`
- `detailRenderers.js`
- `adminRenderers.js`
- `profileRenderers.js`

Backend má základní safety net pro další cleanup:

- izolovanou testovací SQLite databázi
- testovací server helper
- katalogovou SQL fixture
- základní API smoke testy
- kontrolu profilové viditelnosti v katalogu

Tento refaktorový milník navazuje na POC stav a připravuje projekt na další backend cleanup bez změny technologického stacku.

## Roadmapa

### Nejbližší kroky po aktuálním refaktoru

1. pokračovat backend optimalizací
2. zmenšit a zpřehlednit `routes/catalog.js`
3. zmenšit a zpřehlednit `routes/admin.js`
4. oddělit opakovanou validaci query parametrů
5. oddělit opakovanou profilovou logiku
6. sjednotit mapování databázových řádků na API response
7. zachovat jednoduchý CommonJS/Express/SQLite stack bez ORM
8. až potom řešit větší UX fázi
9. připravit v1 checklist

### Backend optimalizace

Doporučený směr další práce:

- zmenšit `routes/catalog.js`
- zmenšit `routes/admin.js`
- oddělit opakovanou profilovou logiku
- oddělit opakované parsování query parametrů
- sjednotit mapování databázových řádků na API response
- zjednodušit práci s blokovanými službami
- ponechat CommonJS a jednoduchou strukturu bez ORM
- zachovat parametrizované SQL dotazy

Backend refaktor má prioritu před UX, protože aplikace už funkčně drží pohromadě a další UX vrstva bude bezpečnější nad přehlednějším backendem.

### UX / frontend zlepšení později

UX fázi je vhodné řešit až po backend cleanupu.

Možné směry:

- lepší navigace mezi sekcemi
- sbalení nebo oddělení admin části
- lepší loading stavy
- lepší empty stavy
- lepší error stavy
- přehlednější detail titulu
- lepší práce s profily
- responzivnější layout
- vizuální odlišení služeb
- jasnější akce watchlistu

Zatím není nutné přecházet na React, Next.js, TypeScript ani frontend build tools.

### Pozdější rozvoj

- rozšíření automatizovaných testů o další katalogové, profilové a admin scénáře
- sync history / `sync_runs`
- dávkový Movie of the Night sync
- rozšíření o další zdroje
- iVysílání a Stream
- volitelná Filmtoro integrace, pokud bude dostupný API key
- PWA
- browser extension
- případné vyhodnocení React/Vite frontendu
- případný deployment mimo lokální stroj

## Licence

MIT
