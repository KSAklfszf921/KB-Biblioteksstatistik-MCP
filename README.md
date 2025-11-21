# KB Biblioteksstatistik MCP Server

En MCP (Model Context Protocol) server för att söka i Kungliga Bibliotekets öppna biblioteksstatistik.

## Översikt

Denna server tillhandahåller verktyg för att söka i den officiella svenska biblioteksstatistiken via KB:s öppna data API. Data finns tillgänglig för offentligt finansierade bibliotek från verksamhetsår 2014 och framåt.

- **API**: https://bibstat.kb.se/
- **Format**: JSON-LD
- **Licens**: CC0 (Public Domain)
- **Antal verktyg**: 14 specialiserade verktyg
- **Termdatabas**: 793 termdefinitioner

## Funktioner

### Termsökning (6 verktyg)
- Hämta alla termdefinitioner
- Sök termer efter kategori/prefix
- Sök termer med nyckelord
- Detaljerad terminformation
- Lista alla kategorier

### Observationssökning (2 verktyg)
- Sök observationer med avancerade filter
- Hämta statistik för specifika år

### Biblioteksanalys (4 verktyg)
- Hämta all data för ett bibliotek
- Jämför bibliotek mellan olika år
- Lista och sök bibliotek
- Hämta tillgängliga år

### Avancerad analys (2 verktyg)
- Trendanalys över flera år
- Hämta flera termer samtidigt

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
