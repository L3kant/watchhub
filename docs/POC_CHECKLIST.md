# WatchHub POC checklist

Tento checklist slouží k uzavření aktuálního stavu WatchHubu jako publikovatelného POC milestone.

Cíl není mít finální produkční aplikaci. Cíl je ověřit, že projekt jde bezpečně zveřejnit, znovu spustit a ručně zkontrolovat.

## 1. Stav repozitáře

Před publikací ověř:

```bash
git status
git log --oneline -10
```

Očekávaný stav:

- pracovní strom je čistý
- poslední commity odpovídají aktuálnímu POC stavu
- v repozitáři nejsou lokální experimentální soubory
- v repozitáři nejsou API klíče
- v repozitáři není lokální databáze

## 2. Bezpečnostní kontrola před publikací

Spusť:

```bash
git ls-files .env
git ls-files data
git ls-files "*.sqlite"
git ls-files "*.sqlite-wal"
git ls-files "*.sqlite-shm"
git ls-files "*.db"
git grep -n "TMDB_ACCESS_TOKEN"
git grep -n "MOTN_API_KEY"
git grep -n "Bearer "
```

Očekávaný výsledek:

- `.env` není trackovaný
- složka `data/` není trackovaná
- SQLite databáze není trackovaná
- skutečné API klíče nejsou v Gitu
- `TMDB_ACCESS_TOKEN` a `MOTN_API_KEY` se objevují pouze jako názvy proměnných nebo placeholdery
- žádný reálný `Bearer` token není v kódu

Povolené soubory s placeholdery:

- `.env.example`
- `README.md`
- dokumentace v `docs/`

## 3. Kontrola konfigurace

Ověř, že existuje lokální `.env`:

```bash
ls -la .env .env.example
```

Soubor `.env` musí obsahovat vlastní lokální hodnoty:

```env
PORT=3000
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_ACCESS_TOKEN=...
MOTN_BASE_URL=https://api.movieofthenight.com/v4
MOTN_API_KEY=...
MOTN_MONTHLY_QUOTA=500
```

Soubor `.env.example` musí obsahovat pouze placeholdery.

## 4. Čistá instalace závislostí

Na běžném lokálním stroji ověř:

```bash
npm install
```

Potom:

```bash
npm run check
```

Očekávaný stav:

- instalace proběhne bez chyby
- Prettier kontrola projde
- ESLint kontrola projde

Pokud formátování selže, spusť:

```bash
npm run fix
```

Potom znovu:

```bash
npm run check
```

## 5. Databázový smoke test

Pro existující lokální databázi:

```bash
npm run db:migrate
npm run db:check
```

Pro test od nuly lze lokálně smazat `data/` a znovu inicializovat:

```bash
rm -rf data
npm run db:init
npm run db:check
```

Očekávaný stav:

- vznikne `data/watchhub.sqlite`
- `db:check` vypíše tabulky
- databáze zůstane lokální
- databáze není trackovaná Gitem

## 6. TMDb sync smoke test

Základní sync providerů:

```bash
npm run tmdb:sync-providers
```

Základní sync žánrů:

```bash
npm run tmdb:sync-genres
```

Malý katalogový sync:

```bash
npm run tmdb:sync-catalog -- movie Netflix --pages=1
npm run tmdb:sync-catalog -- tv Netflix --pages=1
```

Souhrn katalogu:

```bash
npm run catalog:summary
```

Očekávaný stav:

- sync providerů doběhne
- sync žánrů doběhne
- katalogový sync vloží nebo aktualizuje tituly
- souhrn katalogu vypíše počty titulů, služeb a žánrů

## 7. Spuštění aplikace

Spusť server:

```bash
npm start
```

Otevři:

```text
http://localhost:3000
```

Očekávaný stav:

- aplikace se načte
- v konzoli serveru nejsou fatální chyby
- v prohlížeči nejsou fatální JavaScript chyby
- footer obsahuje TMDb attribution

## 8. UI smoke test

V prohlížeči ověř:

### Katalog

- katalog zobrazí tituly
- vyhledávání podle názvu funguje
- filtr služby funguje
- filtr typu funguje
- filtr žánru funguje
- karta titulu otevře modal detailu

### Detail titulu

- modal se otevře
- zobrazí se název
- zobrazí se typ
- zobrazí se rok nebo datum
- zobrazí se hodnocení
- zobrazí se původní jazyk
- zobrazí se žánry
- zobrazí se dostupné služby
- zavření modalu funguje tlačítkem
- zavření modalu funguje klávesou Escape

### Launchery

- Netflix používá bezpečný search fallback
- Max používá bezpečný search fallback
- Disney+ používá bezpečný fallback přes TMDb watch stránku, pokud není konkrétní odkaz
- SkyShowtime používá bezpečný fallback přes TMDb watch stránku, pokud není konkrétní odkaz
- odkazy se otevírají do nové záložky
- aplikace nepracuje s přímými video URL

### Movie of the Night

- konkrétní odkazy se nenačítají automaticky při otevření detailu
- tlačítko pro načtení konkrétních odkazů je ruční akce
- po ručním načtení se odkazy uloží do SQLite cache
- admin přehled ukazuje lokální stav využití Movie of the Night limitu

### Profily

- přepínač profilů se načte
- vytvoření profilu funguje
- aktivní profil ovlivňuje katalog
- věkový limit profilu se respektuje
- skryté tituly se nezobrazují pro daný profil

### Watchlist

- akce Chci vidět funguje
- titul se objeví v sekci Můj seznam
- akce Zhlédnuto funguje
- titul se objeví v sekci Zhlédnuto
- akce Skrýt funguje
- skrytý titul zmizí z katalogu pro daný profil
- zrušení stavu funguje

### Novinky

- sekce Novinky se načte
- Nově dostupné funguje
- Nové filmy funguje
- Nové seriály funguje
- filtr služby ovlivňuje novinky

### Admin

- admin status se načte
- přehled služeb se načte
- přehled profilů se načte
- přehled externích odkazů se načte
- kvalita katalogu se načte
- tlačítko Obnovit admin přehled funguje

## 9. API smoke test

Při běžícím serveru ověř základní endpointy:

```bash
curl "http://localhost:3000/api/services"
curl "http://localhost:3000/api/profiles"
curl "http://localhost:3000/api/catalog?limit=5"
curl "http://localhost:3000/api/catalog/genres"
curl "http://localhost:3000/api/catalog/new?limit=5"
curl "http://localhost:3000/api/catalog/new-movies?limit=5"
curl "http://localhost:3000/api/catalog/new-series?limit=5"
curl "http://localhost:3000/api/admin/status"
curl "http://localhost:3000/api/admin/services"
curl "http://localhost:3000/api/admin/profiles"
curl "http://localhost:3000/api/admin/external-links"
curl "http://localhost:3000/api/admin/catalog-quality"
curl "http://localhost:3000/api/admin/movie-of-the-night/quota"
```

Očekávaný stav:

- endpointy vrací JSON
- běžné GET endpointy nevrací 500
- katalogové endpointy respektují limit
- admin endpointy vrací diagnostická data

## 10. Dokumentace před publikací

Ověř, že existují:

- `README.md`
- `.env.example`
- `.gitignore`
- `docs/POC_CHECKLIST.md`

README musí obsahovat:

- účel projektu
- lokální instalaci
- konfiguraci `.env`
- základní sync příkazy
- bezpečnostní poznámky
- legální rozsah aplikace
- TMDb attribution
- známé limity
- roadmapu

## 11. GitHub publish checklist

Před prvním pushnutím na GitHub:

```bash
git status
npm run check
```

Potom ještě jednou ověř citlivé soubory:

```bash
git ls-files .env
git ls-files data
git ls-files "*.sqlite"
git ls-files "*.db"
```

Očekávaný výsledek:

- příkazy nevypíšou žádné trackované tajné nebo lokální datové soubory

## 12. Doporučený commit

Po doplnění tohoto checklistu:

```bash
git add docs/POC_CHECKLIST.md
git commit -m "Add POC checklist"
```

## 13. Doporučený tag pro POC

Po dokončení POC kontroly:

```bash
git tag v0.1.0-poc
```

Kontrola tagu:

```bash
git tag
git show v0.1.0-poc --stat
```

Push na GitHub včetně tagu:

```bash
git push origin master
git push origin v0.1.0-poc
```

Pokud bude repozitář používat větev `main`, použij místo `master`:

```bash
git push origin main
```

## 14. Výsledek POC checkpointu

POC je připravený k publikaci, pokud platí:

- projekt má README
- projekt má publish checklist
- lokální spuštění je popsané
- databáze jde inicializovat
- TMDb sync je popsaný
- katalog funguje
- detail funguje
- novinky fungují
- profily fungují
- watchlist funguje
- admin diagnostika funguje
- Movie of the Night se nevolá automaticky
- API klíče nejsou v repozitáři
- lokální databáze není v repozitáři
- právní rozsah aplikace je jasně popsaný
- `npm run check` projde
- repozitář má čistý `git status`

## 15. Další fáze po POC

Po publikaci POC pokračovat:

1. refaktor `routes/catalog.js`
2. rozdělení `public/app.js` na menší vanilla JS soubory
3. cleanup `routes/admin.js`
4. UX navigace
5. lepší loading, empty a error stavy
6. v1 checklist
