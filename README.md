# WatchHub

WatchHub je výukový Node.js projekt pro soukromý katalog streamovacích služeb.

Cílem aplikace je zobrazit dostupné filmy a seriály z vybraných streamovacích služeb na jednom místě, evidovat lokální profily, filtrovat katalog podle profilu a otevírat tituly přes oficiální službu nebo bezpečný fallback odkaz.

Aktuální stav projektu je **POC / výukový milestone**, ne produkční aplikace.

## Funkce v aktuálním POC

* evidence streamovacích služeb
* evidence uživatelských předplatných
* synchronizace providerů pro ČR přes TMDb
* synchronizace žánrů přes TMDb
* synchronizace katalogu filmů a seriálů přes TMDb
* zobrazení katalogu ve vanilla HTML/CSS/JavaScript UI
* filtrování podle názvu, služby, typu a žánru
* detail titulu s metadaty, plakátem, popisem, hodnocením, žánry a dostupnými službami
* profily s věkovým limitem
* profilový watchlist
* označení titulů jako:

  * Chci vidět
  * Zhlédnuto
  * Skrýt
* skrytí titulů podle aktivního profilu
* sekce Novinky
* sekce Můj seznam
* sekce Zhlédnuto
* základní admin diagnostika
* Movie of the Night odkazy načítané ručně na vyžádání
* lokální SQLite cache pro konkrétní externí odkazy
* lokální počitadlo využití Movie of the Night API limitu

## Co aplikace není

WatchHub není přehrávač streamovaného obsahu.

Aplikace:

* nestahuje video ze streamovacích služeb
* neobchází DRM
* nezískává `.m3u8`, `.mpd` ani jiné přímé streamovací URL
* neukládá hesla, cookies ani session tokeny
* nepřehrává obsah mimo oficiální streamovací službu
* nescrapuje účty po přihlášení
* nereverse-engineeruje interní API Netflixu, Disney+, Maxu ani SkyShowtime

WatchHub slouží pouze jako katalog, přehled dostupnosti, profilový filtr, watchlist, novinkový přehled a launcher.

## Použité technologie

* JavaScript
* Node.js
* Express
* SQLite přes `node:sqlite`
* SQL
* HTML
* CSS
* vanilla JavaScript
* CommonJS

Projekt zatím záměrně nepoužívá:

* React
* Next.js
* TypeScript
* Docker
* ORM
* frontend build tools
* přihlašování uživatelů

## Externí zdroje dat

### TMDb

TMDb je hlavní zdroj:

* providerů
* katalogových metadat
* žánrů
* plakátů
* popisů
* hodnocení
* dostupnosti podle regionu

TMDb se volá pouze z backendu. Přístupový token patří do `.env` a nesmí být uložený v Gitu.

This product uses the TMDB API but is not endorsed or certified by TMDB.

### Movie of the Night

Movie of the Night je doplňkový zdroj konkrétních webových odkazů na streamovací služby.

V aktuálním POC:

* API se volá pouze z backendu
* odkazy se načítají ručně na vyžádání
* výsledné odkazy se ukládají do SQLite cache
* ukládají se pouze běžné bezpečné `https://` webové odkazy
* nepoužívají se ani neukládají přímé video odkazy

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

Formátování a lint kontrola:

```bash
npm run check
```

Automatická oprava formátování a lint chyb, pokud je možná:

```bash
npm run fix
```

## Ruční smoke test

Před publikací POC zkontroluj:

* `npm install` proběhne bez chyby
* `.env` existuje lokálně a není commitnutý
* `npm run db:init` vytvoří databázi
* `npm run db:check` vypíše tabulky
* `npm run tmdb:sync-providers` doběhne úspěšně
* `npm run tmdb:sync-genres` doběhne úspěšně
* `npm run tmdb:sync-catalog -- movie Netflix --pages=1` doběhne úspěšně
* `npm run catalog:summary` vypíše souhrn katalogu
* `npm start` spustí server
* `http://localhost:3000` zobrazí UI
* katalog zobrazuje tituly
* filtr podle služby funguje
* filtr podle typu funguje
* filtr podle žánru funguje
* detail titulu se otevře v modalu
* launcher tlačítka otevírají pouze bezpečné webové odkazy
* tlačítko pro načtení konkrétních odkazů nevolá Movie of the Night automaticky
* profilový přepínač funguje
* Můj seznam funguje
* Zhlédnuto funguje
* Skrýt odstraní titul z katalogu pro daný profil
* Novinky se načítají
* Admin přehled se načítá
* `npm run check` projde

## Bezpečnost před publikací

Před zveřejněním repozitáře ověř:

```bash
git status
git ls-files .env
git ls-files data
git ls-files "*.sqlite"
git ls-files "*.db"
```

Očekávaný stav:

* `git status` je čistý
* `.env` není trackovaný
* `data/` není trackovaná
* žádná SQLite databáze není trackovaná
* žádný API token není v commitech

## Známé limity POC

* aplikace je určená pro lokální soukromé použití
* neobsahuje autentizaci
* neobsahuje automatizované testy
* UI je základní a zatím bez většího UX refaktoru
* `public/app.js` je zatím větší monolitický soubor
* `routes/catalog.js` obsahuje část duplicitní logiky
* profilová správa je základní
* věkové ratingy nejsou plně doplněné
* runtime u titulů nemusí být doplněný
* Movie of the Night odkazy se načítají ručně pro konkrétní titul
* dávkový Movie of the Night sync zatím není implementovaný
* Filmtoro integrace zatím není implementovaná
* iVysílání a Stream zatím nejsou implementované

## Roadmapa

### Nejbližší kroky po POC

1. publikovat POC checkpoint na GitHub
2. označit Git tagem, například `v0.1.0-poc`
3. refaktorovat backend katalogové routy
4. rozdělit frontend vanilla JavaScript do menších souborů bez buildu
5. zlepšit navigaci a UX
6. doplnit lepší loading a empty stavy
7. připravit v1 checklist

### Pozdější rozvoj

* automatizované testy
* sync history / `sync_runs`
* dávkový Movie of the Night sync
* rozšíření o další zdroje
* PWA
* browser extension
* případné vyhodnocení React/Vite frontendu
* případný deployment mimo lokální stroj

## Licence

MIT
