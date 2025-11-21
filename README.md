# KB Biblioteksstatistik MCP Server

En MCP (Model Context Protocol) server för att söka i Kungliga Bibliotekets öppna biblioteksstatistik.

## Översikt

Denna server tillhandahåller verktyg för att söka i den officiella svenska biblioteksstatistiken via KB:s öppna data API. Data finns tillgänglig för offentligt finansierade bibliotek från verksamhetsår 2014 och framåt.

- **API**: https://bibstat.kb.se/
- **Format**: JSON-LD
- **Licens**: CC0 (Public Domain)

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
