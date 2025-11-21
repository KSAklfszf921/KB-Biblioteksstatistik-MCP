# Installation & Deployment Guide

KB Biblioteksstatistik MCP Server kan användas både lokalt och som remote server. Denna guide täcker båda användningsfallen.

## Innehållsförteckning

1. [Lokal Installation](#lokal-installation)
2. [Remote Deployment (Render)](#remote-deployment-render)
3. [MCP Klient-konfiguration](#mcp-klient-konfiguration)
4. [Verifiering](#verifiering)

---

## Lokal Installation

Den lokala installationen kräver endast **@modelcontextprotocol/sdk** och är mycket lätt. Remote server dependencies (express, cors, dotenv) är optional och installeras inte för lokal användning.

### Förutsättningar

- Node.js >= 18.0.0
- npm eller yarn

### Alternativ 1: Från GitHub (Rekommenderat för utveckling)

```bash
# Klona repot
git clone https://github.com/KSAklfszf921/KB-Biblioteksstatistik-MCP.git
cd KB-Biblioteksstatistik-MCP

# Installera endast nödvändiga dependencies för lokal användning
npm install --omit=optional

# Eller använd npm script
npm run install:local

# Bygg projektet
npm run build
```

### Alternativ 2: Global NPM installation (Efter publicering)

```bash
# Installera globalt via npm
npm install -g kb-biblioteksstatistik-mcp

# Eller använd direkt med npx (ingen installation behövs)
npx kb-biblioteksstatistik-mcp
```

### Alternativ 3: Lokal NPM länkning (För utveckling)

```bash
# I projektkatalogen
npm link

# Nu kan du använda kommandot globalt
kb-biblioteksstatistik-mcp
```

### Steg 2: Konfigurera MCP-klient

#### Claude Desktop

Lägg till följande i din Claude Desktop konfiguration (`~/Library/Application Support/Claude/claude_desktop_config.json` på macOS eller `%APPDATA%\Claude\claude_desktop_config.json` på Windows):

```json
{
  "mcpServers": {
    "kb-biblioteksstatistik": {
      "command": "node",
      "args": ["/absolut/sökväg/till/KB-Biblioteksstatistik-MCP/build/index.js"],
      "description": "Kungliga Bibliotekets öppna biblioteksstatistik"
    }
  }
}
```

#### Cline (VSCode Extension)

Öppna Cline settings och lägg till:

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

#### Cursor IDE

I Cursor IDE settings (MCP-sektion):

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

#### NPX (Efter publicering till npm)

Det enklaste sättet - ingen lokal installation behövs:

```json
{
  "mcpServers": {
    "kb-biblioteksstatistik": {
      "command": "npx",
      "args": ["-y", "kb-biblioteksstatistik-mcp"],
      "description": "Kungliga Bibliotekets öppna biblioteksstatistik"
    }
  }
}
```

#### Global installation

Om du installerat globalt med npm:

```json
{
  "mcpServers": {
    "kb-biblioteksstatistik": {
      "command": "kb-biblioteksstatistik-mcp",
      "description": "Kungliga Bibliotekets öppna biblioteksstatistik"
    }
  }
}
```

### Steg 3: Starta om klienten

Starta om din MCP-klient (Claude Desktop, Cline, etc.) för att ladda servern.

### Viktigt för lokal användning

⚠️ **Lokal installation använder INTE remote server dependencies**

- Endast `@modelcontextprotocol/sdk` installeras (required)
- `express`, `cors`, `dotenv` är optional (endast för remote server)
- Total storlek för lokal installation: ~5 MB
- Servern körs via stdio transport (direktkommunikation)

---

## Remote Deployment (Render)

Denna server kan deployas som en remote MCP server med SSE (Server-Sent Events) transport.

⚠️ **OBS**: Remote deployment kräver alla dependencies inklusive express, cors, dotenv.

### Förutsättningar

- Render account (gratis tier fungerar)
- Git repository (GitHub, GitLab, etc.)

### Installation för remote deployment

```bash
# Installera ALLA dependencies (inklusive optional)
npm install

# Eller använd npm script
npm run install:remote

# Bygg projektet
npm run build
```

### Metod 1: Deploy via Render Dashboard

1. **Skapa nytt Web Service på Render**
   - Gå till [Render Dashboard](https://dashboard.render.com/)
   - Klicka "New +" → "Web Service"
   - Anslut ditt GitHub/GitLab repo

2. **Konfigurera service:**
   - **Name**: kb-biblioteksstatistik-mcp
   - **Region**: Frankfurt (eller närmare dig)
   - **Branch**: main
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:server`
   - **Plan**: Free

3. **Sätt Environment Variables:**
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render tilldelar automatiskt)
   - `HOST` = `0.0.0.0`

4. **Deploy**
   - Klicka "Create Web Service"
   - Vänta på deployment (2-5 minuter)

### Metod 2: Deploy via render.yaml (Infrastructure as Code)

1. Filen `render.yaml` finns redan i projektet

2. Deploy via Render Blueprint:
   - Gå till Render Dashboard
   - Välj "New Blueprint Instance"
   - Anslut repo och välj `render.yaml`
   - Klicka "Apply"

### Metod 3: Deploy via Render CLI

```bash
# Installera Render CLI (om inte redan gjort)
npm install -g @render/cli

# Logga in
render login

# Deploy
render blueprint push
```

### Verifiera deployment

När deployment är klar, testa health endpoint:

```bash
curl https://your-app-name.onrender.com/health
```

Förväntat svar:
```json
{
  "status": "healthy",
  "service": "kb-biblioteksstatistik-mcp",
  "version": "2.0.0",
  "timestamp": "2025-11-21T10:00:00.000Z"
}
```

### Konfigurera MCP-klient för remote server

#### Claude Desktop (Remote)

```json
{
  "mcpServers": {
    "kb-biblioteksstatistik": {
      "url": "https://your-app-name.onrender.com/sse",
      "description": "KB Biblioteksstatistik (Remote)"
    }
  }
}
```

#### Custom HTTP Client

För custom implementationer, använd SSE endpoint:

```javascript
const eventSource = new EventSource('https://your-app-name.onrender.com/sse');

eventSource.onmessage = (event) => {
  console.log('Message from MCP server:', event.data);
};
```

---

## MCP Klient-konfiguration

### Supporterade klienter

- ✅ Claude Desktop (Anthropic)
- ✅ Cline (VSCode Extension)
- ✅ Cursor IDE
- ✅ Continue.dev
- ✅ Andra MCP-kompatibla klienter

### Fullständiga konfigurationsexempel

Se `mcp-config-examples.json` för detaljerade exempel för olika klienter och användningsfall.

---

## Verifiering

### Lokal server

Efter installation, verifiera att servern fungerar:

```bash
# Testa direkt (ska visa logs)
node build/index.js
```

Du bör se:
```
KB Biblioteksstatistik MCP Server is running
API: https://bibstat.kb.se/
Licens: CC0
```

### Remote server

```bash
# Health check
curl https://your-app-name.onrender.com/health

# Info endpoint
curl https://your-app-name.onrender.com/

# SSE connection test (öppnar en stream)
curl -N https://your-app-name.onrender.com/sse
```

### MCP-klient

När servern är konfigurerad i din MCP-klient, verifiera genom att:

1. Öppna klienten (Claude Desktop, Cline, etc.)
2. Kontrollera att servern laddats (se MCP status)
3. Testa ett kommando:
   ```
   Använd KB biblioteksstatistik servern för att lista tillgängliga år
   ```

---

## Troubleshooting

### Lokal installation

**Problem**: "Cannot find module"
- **Lösning**: Kör `npm install && npm run build`

**Problem**: MCP-klienten hittar inte servern
- **Lösning**: Kontrollera att sökvägen i konfigurationen är absolut och korrekt

### Remote deployment

**Problem**: Deployment misslyckas
- **Lösning**: Kontrollera build logs i Render Dashboard

**Problem**: Health check returnerar 503
- **Lösning**: Vänta 1-2 minuter efter deployment (cold start)

**Problem**: SSE connection timeout
- **Lösning**: Kontrollera att PORT environment variable är satt till 10000

---

## Miljövariabler

### .env.example

Kopiera `.env.example` till `.env` och anpassa:

```bash
cp .env.example .env
```

### Tillgängliga variabler

| Variabel | Beskrivning | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `HOST` | Server host | 0.0.0.0 |
| `NODE_ENV` | Environment | development |
| `LOG_LEVEL` | Log nivå | info |

---

## Uppdatering

### Lokal installation

```bash
cd KB-Biblioteksstatistik-MCP
git pull origin main
npm install
npm run build
```

Starta om MCP-klienten.

### Remote deployment

Render auto-deployas vid push till main branch. Manuell re-deploy:

1. Gå till Render Dashboard
2. Välj din service
3. Klicka "Manual Deploy" → "Deploy latest commit"

---

## Support & Documentation

- **GitHub**: https://github.com/KSAklfszf921/KB-Biblioteksstatistik-MCP
- **KB API Docs**: https://bibstat.kb.se/
- **MCP Protocol**: https://modelcontextprotocol.io/

---

## Licens

- Server-kod: MIT
- KB API-data: CC0 (Public Domain)
