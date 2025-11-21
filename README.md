# KB Biblioteksstatistik MCP Server v2.0

En komplett MCP (Model Context Protocol) server för att söka och analysera Kungliga Bibliotekets öppna biblioteksstatistik.

## Översikt

Denna server tillhandahåller omfattande verktyg för att söka, analysera och rapportera den officiella svenska biblioteksstatistiken via KB:s öppna data API. Data finns tillgänglig för offentligt finansierade bibliotek från verksamhetsår 2014 och framåt.

- **API**: https://bibstat.kb.se/
- **Format**: JSON-LD
- **Licens**: CC0 (Public Domain)
- **Version**: 2.0.0
- **Antal verktyg**: 20 specialiserade verktyg
- **Antal prompts**: 5 färdiga analysmallar
- **Termdatabas**: 793 termdefinitioner med 3 dimensioner
- **Datatyper**: 787 mätvariabler (integer, decimal, boolean, string)

## Funktioner

### Termsökning (6 verktyg)
- Hämta alla termdefinitioner från API
- Sök termer efter kategori/prefix (60+ kategorier)
- Sök termer med nyckelord i beskrivning
- Detaljerad terminformation med metadata
- Lista alla kategorier alphabetiskt
- Lista alla målgrupper

### Observationssökning (3 verktyg)
- Sök observationer med avancerade filter
- Hämta statistik för specifika år
- Filtrera på målgrupp (folkbibliotek, forskbibliotek, skolbibliotek)

### Biblioteksanalys (4 verktyg)
- Hämta all data för ett bibliotek
- Jämför ett bibliotek mellan olika år
- Jämför flera bibliotek samtidigt
- Lista och sök bibliotek (namn, sigel, ID)

### Avancerad analys (4 verktyg)
- Trendanalys över flera år med statistik
- Hämta flera termer samtidigt (batch)
- Aggregera per målgrupp (medel, min, max)
- Generera omfattande rapport med all statistik

### Export & Rapportering (3 verktyg)
- Exportera till CSV för Excel
- Generera rapporter med avancerad statistik
- Hämta tillgängliga år och målgrupper

### MCP Prompts (5 färdiga mallar)
- **analyze-library-trends**: Analysera bibliotekstrender över tid
- **compare-library-types**: Jämför folk-, forsk- och skolbibliotek
- **generate-annual-report**: Generera årsrapport för term
- **benchmark-libraries**: Benchmarka flera bibliotek
- **discover-terms**: Utforska termer för ämnesområde

## Installation

```bash
npm install
npm run build
```

## Användning

### Starta servern

```bash
npm start
```

### Konfigurera i Claude Desktop

Lägg till följande i din Claude Desktop konfiguration (`~/Library/Application Support/Claude/claude_desktop_config.json` på macOS):

```json
{
  "mcpServers": {
    "kb-biblioteksstatistik": {
      "command": "node",
      "args": ["/sökväg/till/KB-Biblioteksstatistik-MCP/build/index.js"]
    }
  }
}
```

## Tillgängliga verktyg

### 1. search_library_statistics

Söker i biblioteksstatistiken och returnerar observationer.

**Parametrar:**
- `term` (valfri): Filtrera på specifik term, ex: "Folk54" för antal besök
- `date_from` (valfri): Hämta observationer uppdaterade från och med datum (ISO-8601 format: YYYY-MM-DDTHH:mm:ss)
- `date_to` (valfri): Hämta observationer uppdaterade innan datum (ISO-8601)
- `limit` (valfri): Begränsa antal resultat (default: 100)
- `offset` (valfri): Paginering, startposition (default: 0)

**Exempel:**
```typescript
// Hämta de senaste 50 observationerna
{
  "limit": 50
}

// Hämta observationer för antal besök (Folk54)
{
  "term": "Folk54",
  "limit": 100
}

// Hämta observationer uppdaterade efter ett visst datum
{
  "date_from": "2024-01-01T00:00:00",
  "limit": 200
}
```

### 2. get_term_definitions

Hämtar alla tillgängliga termdefinitioner som används i biblioteksstatistiken.

**Parametrar:** Inga

**Exempel:**
```typescript
// Hämta alla termdefinitioner
{}
```

### 3. search_terms_by_category

Söker termer baserat på kategori/prefix. Användbart för att hitta alla termer inom en viss kategori.

**Parametrar:**
- `category` (obligatorisk): Kategori/prefix att söka efter

**Exempel:**
```typescript
// Hämta alla termer för aktiva låntagare
{
  "category": "Aktiv"
}

// Hämta alla termer för besöksstatistik
{
  "category": "Besok"
}

// Hämta alla termer för beståndsdata
{
  "category": "Bestand"
}
```

**Vanliga kategorier:**
- `Aktiv` - Aktiva låntagare
- `Arsverke` - Personalstatistik (årsverken)
- `Barn` - Barn- och ungdomsrelaterad statistik
- `BemanService` - Bemannade serviceställen
- `Besok` - Besöksstatistik
- `Bestand` - Beståndsstatistik
- `Folk` - Folkbiblioteksspecifika termer
- `Forsk` - Forskningsbiblioteksspecifika termer
- `Skol` - Skolbiblioteksspecifika termer
- `Lan` - Lånestatistik
- `Oppet` - Öppettider
- `Utgift` - Utgifter och kostnader

### 4. search_terms_by_keyword

Söker termer baserat på nyckelord i beskrivning eller namn.

**Parametrar:**
- `keyword` (obligatorisk): Nyckelord att söka efter

**Exempel:**
```typescript
// Sök termer relaterade till låntagare
{
  "keyword": "låntagare"
}

// Sök termer relaterade till böcker
{
  "keyword": "bok"
}

// Sök termer relaterade till e-medier
{
  "keyword": "elektronisk"
}
```

### 5. get_term_details

Hämtar detaljerad information om en specifik term.

**Parametrar:**
- `term_id` (obligatorisk): Term-ID att hämta detaljer för

**Exempel:**
```typescript
// Hämta detaljer om Folk54 (antal besök)
{
  "term_id": "Folk54"
}

// Hämta detaljer om Aktiv01 (aktiva kvinnliga låntagare)
{
  "term_id": "Aktiv01"
}
```

### 6. list_term_categories

Listar alla tillgängliga termkategorier/prefix i biblioteksstatistiken.

**Parametrar:** Inga

**Exempel:**
```typescript
// Lista alla kategorier
{}
```

### 7. get_library_data

Hämtar all statistik för ett specifikt bibliotek.

**Parametrar:**
- `library_id` (obligatorisk): Biblioteks-ID eller del av biblioteksnamn
- `year` (valfri): Filtrera på specifikt år
- `term` (valfri): Filtrera på specifik term

**Exempel:**
```typescript
// Hämta all data för ett bibliotek
{
  "library_id": "Stockholm"
}

// Hämta data för ett specifikt år
{
  "library_id": "Uppsala",
  "year": 2022
}

// Hämta specifik term för ett bibliotek
{
  "library_id": "Göteborg",
  "term": "Folk54",
  "year": 2023
}
```

### 8. get_year_statistics

Hämtar observationer för ett specifikt år.

**Parametrar:**
- `year` (obligatorisk): Året att hämta statistik för
- `term` (valfri): Filtrera på specifik term
- `limit` (valfri): Max antal resultat (default: 1000)

**Exempel:**
```typescript
// Hämta all statistik för 2023
{
  "year": 2023
}

// Hämta besöksstatistik för 2022
{
  "year": 2022,
  "term": "Folk54"
}
```

### 9. compare_library_years

Jämför ett biblioteks statistik mellan två år och beräknar förändring.

**Parametrar:**
- `library_id` (obligatorisk): Biblioteks-ID eller del av biblioteksnamn
- `year1` (obligatorisk): Första året att jämföra
- `year2` (obligatorisk): Andra året att jämföra
- `term` (valfri): Filtrera på specifik term

**Exempel:**
```typescript
// Jämför bibliotek mellan två år
{
  "library_id": "Stockholm",
  "year1": 2021,
  "year2": 2023
}

// Jämför specifik term mellan två år
{
  "library_id": "Uppsala",
  "year1": 2020,
  "year2": 2023,
  "term": "Aktiv99"
}
```

### 10. get_term_trend

Analyserar trender för en term över flera år med statistik.

**Parametrar:**
- `term_id` (obligatorisk): Term-ID att analysera
- `start_year` (obligatorisk): Startår för analys
- `end_year` (obligatorisk): Slutår för analys

**Exempel:**
```typescript
// Analysera besöksutveckling 2014-2023
{
  "term_id": "Folk54",
  "start_year": 2014,
  "end_year": 2023
}

// Analysera aktiva låntagare över tid
{
  "term_id": "Aktiv99",
  "start_year": 2018,
  "end_year": 2023
}
```

### 11. get_multiple_terms

Hämtar observationer för flera termer samtidigt.

**Parametrar:**
- `term_ids` (obligatorisk): Array med term-ID:n
- `year` (valfri): Filtrera på specifikt år
- `limit` (valfri): Max antal resultat per term (default: 1000)

**Exempel:**
```typescript
// Hämta flera relaterade termer
{
  "term_ids": ["Folk54", "Aktiv01", "Aktiv02", "Lan101"]
}

// Hämta flera termer för ett specifikt år
{
  "term_ids": ["Bestand101", "Bestand102", "Bestand103"],
  "year": 2023
}
```

### 12. list_libraries

Listar tillgängliga bibliotek i statistiken.

**Parametrar:**
- `limit` (valfri): Max antal observationer att söka igenom (default: 1000)

**Exempel:**
```typescript
// Lista bibliotek
{
  "limit": 2000
}
```

### 13. search_libraries

Söker efter bibliotek baserat på namn, sigel eller ID.

**Parametrar:**
- `search_term` (obligatorisk): Sökterm

**Exempel:**
```typescript
// Sök efter bibliotek
{
  "search_term": "Stockholm"
}

// Sök med sigel
{
  "search_term": "S"
}
```

### 14. get_available_years

Hämtar lista över alla tillgängliga år i statistiken.

**Parametrar:**
- `limit` (valfri): Max antal observationer att söka igenom (default: 2000)

**Exempel:**
```typescript
// Hämta tillgängliga år
{}
```

### 15. get_observations_by_target_group

Hämtar observationer filtrerade på målgrupp (folkbibliotek, forskbibliotek, skolbibliotek).

**Parametrar:**
- `target_group` (obligatorisk): Målgrupp att filtrera på
- `year` (valfri): Filtrera på specifikt år
- `term` (valfri): Filtrera på specifik term
- `limit` (valfri): Max antal resultat (default: 1000)

**Exempel:**
```typescript
// Hämta all folkbiblioteksstatistik för 2023
{
  "target_group": "folkbibliotek",
  "year": 2023
}

// Hämta besöksstatistik för forskbibliotek
{
  "target_group": "forskbibliotek",
  "term": "Folk54"
}

// Hämta skolbiblioteksdata
{
  "target_group": "skolbibliotek",
  "year": 2022,
  "limit": 500
}
```

### 16. aggregate_by_target_group

Aggregerar statistik per målgrupp med medelvärde, min och max.

**Parametrar:**
- `term_id` (obligatorisk): Term-ID att aggregera
- `year` (valfri): Filtrera på specifikt år

**Exempel:**
```typescript
// Aggregera besöksstatistik per bibliotekstyp
{
  "term_id": "Folk54",
  "year": 2023
}

// Aggregera aktiva låntagare per målgrupp
{
  "term_id": "Aktiv99"
}
```

### 17. compare_multiple_libraries

Jämför flera bibliotek samtidigt för en specifik term och år.

**Parametrar:**
- `library_ids` (obligatorisk): Array med biblioteks-ID:n eller biblioteksnamn
- `term_id` (obligatorisk): Term att jämföra
- `year` (obligatorisk): År att jämföra

**Exempel:**
```typescript
// Jämför tre storstadsbibliotek
{
  "library_ids": ["Stockholm", "Göteborg", "Malmö"],
  "term_id": "Folk54",
  "year": 2023
}

// Jämför universitetsbibliotek
{
  "library_ids": ["Uppsala", "Lund", "Linköping"],
  "term_id": "Bestand101",
  "year": 2022
}
```

### 18. generate_term_report

Genererar en omfattande rapport för en term med detaljerad statistik.

**Parametrar:**
- `term_id` (obligatorisk): Term-ID att generera rapport för
- `year` (obligatorisk): År för rapporten

**Rapport innehåller:**
- Termdefinition och metadata
- Totalt antal observationer
- Fullständig statistik (medel, median, standardavvikelse, percentiler)
- Uppdelning per målgrupp
- Topp 10 bibliotek

**Exempel:**
```typescript
// Generera rapport för besöksstatistik 2023
{
  "term_id": "Folk54",
  "year": 2023
}

// Generera rapport för aktiva låntagare
{
  "term_id": "Aktiv99",
  "year": 2022
}
```

### 19. export_to_csv

Exporterar observationer till CSV-format för Excel eller dataanalys.

**Parametrar:**
- `term` (valfri): Filtrera på specifik term
- `year` (valfri): Filtrera på specifikt år
- `target_group` (valfri): Filtrera på målgrupp
- `limit` (valfri): Max antal observationer (default: 5000)

**Exempel:**
```typescript
// Exportera all folkbiblioteksstatistik 2023 till CSV
{
  "year": 2023,
  "target_group": "folkbibliotek",
  "limit": 10000
}

// Exportera besöksstatistik till CSV
{
  "term": "Folk54",
  "year": 2022
}
```

### 20. list_target_groups

Listar alla tillgängliga målgrupper i statistiken.

**Parametrar:**
- `limit` (valfri): Max antal observationer att söka igenom (default: 2000)

**Exempel:**
```typescript
// Lista alla målgrupper
{}
```

## MCP Prompts (Analysmallar)

Servern tillhandahåller 5 färdiga analysmallar (prompts) för vanliga analysuppgifter:

### analyze-library-trends
Analyserar trender för ett bibliotek över flera år.

**Parametrar:**
- `library_name`: Biblioteksnamn eller ID
- `start_year`: Startår
- `end_year`: Slutår
- `terms`: Kommaseparerad lista med term-ID:n (valfri)

### compare-library-types
Jämför olika typer av bibliotek (folk-, forsk-, skolbibliotek) för en specifik term.

**Parametrar:**
- `term_id`: Term-ID att jämföra
- `year`: År för jämförelsen

### generate-annual-report
Genererar en årlig rapport för en term med fullständig statistik.

**Parametrar:**
- `term_id`: Term-ID
- `year`: År för rapporten

### benchmark-libraries
Benchmarkar flera bibliotek mot varandra.

**Parametrar:**
- `library_names`: Kommaseparerad lista med biblioteksnamn
- `terms`: Kommaseparerad lista med term-ID:n
- `year`: År för benchmarking

### discover-terms
Utforska och hitta relevanta termer för ett ämnesområde.

**Parametrar:**
- `topic`: Ämnesområde eller kategori (ex: "besök", "lån", "bestånd")

## Resurser

### kb://terms

Ger tillgång till alla termdefinitioner i läsbar format.

## API-endpoints och datakällor

1. **Observationer**: `https://bibstat.kb.se/data`
   - Returnerar mätpunkter för bibliotek, år och termer
   - Tillgänglig via `search_library_statistics` verktyget

2. **Termer**: `https://bibstat.kb.se/def/terms`
   - Returnerar definitioner av alla termer
   - Tillgänglig via `get_term_definitions` verktyget

3. **Lokal termdatabas**: `terms` (fil i projektroten)
   - Innehåller 793 termdefinitioner med detaljerad metadata
   - Används av `search_terms_by_category`, `search_terms_by_keyword`, `get_term_details` och `list_term_categories`
   - Cachad i minnet för snabba sökningar

## Exempel på vanliga termer

**Folkbibliotek:**
- `Folk54`: Antal besök folkbibliotek
- `Aktiv01`: Antal aktiva kvinnliga låntagare
- `Aktiv02`: Antal aktiva manliga låntagare
- `Lan101`: Utlån av böcker

**Forskningsbibliotek:**
- `Forsk12`: Forskningsbibliotek data
- `Bestand101`: Antal böcker i bestånd

**Skolbibliotek:**
- `Skol24`: Skolbibliotek data

**Personal:**
- `Arsverke01`: Bibliotekarier och dokumentalister (årsverken)
- `Arsverke02`: Biblioteksassistenter (årsverken)

## Installation & Deployment

Servern kan användas både **lokalt** (lätt, minimal installation) och som **remote server** (Render deployment). Se [INSTALL.md](INSTALL.md) för fullständig guide.

### 🚀 Snabbstart - Lokal installation

Lokal installation kräver endast `@modelcontextprotocol/sdk` (~5 MB). Remote server dependencies är optional.

```bash
# Klona repot
git clone https://github.com/KSAklfszf921/KB-Biblioteksstatistik-MCP.git
cd KB-Biblioteksstatistik-MCP

# Installera endast nödvändiga dependencies (exkluderar express, cors, dotenv)
npm install --omit=optional

# Bygg projektet
npm run build
```

### 📦 NPM Installation (Efter publicering)

```bash
# Global installation
npm install -g kb-biblioteksstatistik-mcp

# Eller använd direkt med npx (rekommenderat)
npx kb-biblioteksstatistik-mcp
```

### MCP Klient-konfiguration

#### Claude Desktop - Lokal (från GitHub)

Lägg till i `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kb-biblioteksstatistik": {
      "command": "node",
      "args": ["/absolut/sökväg/till/KB-Biblioteksstatistik-MCP/build/index.js"]
    }
  }
}
```

#### Claude Desktop - NPX (rekommenderat)

Enklaste sättet - ingen lokal installation behövs:

```json
{
  "mcpServers": {
    "kb-biblioteksstatistik": {
      "command": "npx",
      "args": ["-y", "kb-biblioteksstatistik-mcp"]
    }
  }
}
```

#### Claude Desktop (Remote via Render)

```json
{
  "mcpServers": {
    "kb-biblioteksstatistik": {
      "url": "https://your-app.onrender.com/sse"
    }
  }
}
```

#### Andra MCP-klienter

Servern fungerar med:
- ✅ Claude Desktop
- ✅ Cline (VSCode)
- ✅ Cursor IDE
- ✅ Continue.dev
- ✅ Annan MCP-kompatibel klient

Se `mcp-config-examples.json` för fler exempel.

### Remote Deployment (Render)

Servern kan deployas som remote MCP server med SSE transport:

1. **Skapa Web Service på Render**
   - Anslut GitHub repo
   - Build command: `npm install && npm run build`
   - Start command: `npm run start:server`
   - Plan: Free tier fungerar

2. **Sätt Environment Variables**
   ```
   NODE_ENV=production
   PORT=10000
   HOST=0.0.0.0
   ```

3. **Verifiera deployment**
   ```bash
   curl https://your-app.onrender.com/health
   ```

Se `render.yaml` för Infrastructure as Code deployment.

### Endpoints (Remote Server)

När servern körs som remote server:

- **Health Check**: `GET /health`
- **Server Info**: `GET /`
- **SSE (MCP)**: `GET /sse`
- **Message**: `POST /message`

## Utveckling

### Bygga projektet

```bash
npm run build
```

### Watch-läge

```bash
npm run watch
```

## Teknisk information

- **Språk**: TypeScript
- **Runtime**: Node.js
- **MCP SDK**: @modelcontextprotocol/sdk
- **API-format**: JSON-LD
- **TypeScript target**: ES2022

## Licensinformation

- **Server-kod**: MIT
- **KB API-data**: CC0 (Public Domain)

## Länkar

- [Kungliga Bibliotekets biblioteksstatistik](https://bibstat.kb.se/)
- [MCP (Model Context Protocol)](https://modelcontextprotocol.io/)
- [KB Öppen data](https://www.kb.se/samverkan-och-utveckling/oppen-data.html)
