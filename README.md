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

## Resurser

### kb://terms

Ger tillgång till alla termdefinitioner i läsbar format.

## API-endpoints som används

1. **Observationer**: `https://bibstat.kb.se/data`
   - Returnerar mätpunkter för bibliotek, år och termer

2. **Termer**: `https://bibstat.kb.se/def/terms`
   - Returnerar definitioner av alla termer

## Exempel på vanliga termer

- `Folk54`: Antal besök folkbibliotek
- `Skol24`: Data om skolbibliotek
- `Forsk12`: Forskarbibliotek data

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
