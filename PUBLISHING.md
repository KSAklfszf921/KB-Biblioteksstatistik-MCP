# Publiceringsguide för npm

Denna guide beskriver hur man publicerar KB Biblioteksstatistik MCP Server till npm.

## Förberedelser

### 1. Kontrollera att allt är redo

```bash
# Se till att alla ändringar är committade
git status

# Kör tester (om du har några)
npm test

# Bygg projektet
npm run build

# Kontrollera vad som kommer att publiceras
npm pack --dry-run
```

### 2. Uppdatera version

```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch

# Minor version (1.0.0 -> 1.1.0)
npm version minor

# Major version (1.0.0 -> 2.0.0)
npm version major
```

Detta uppdaterar automatiskt `package.json` och skapar en git tag.

### 3. Logga in på npm

```bash
npm login
```

Ange ditt npm användarnamn, lösenord och email.

## Publicering

### Första gången

```bash
# Publicera som public package
npm publish --access public
```

### Uppdateringar

```bash
# Uppdatera version först
npm version patch  # eller minor/major

# Publicera
npm publish
```

### Pusha till git

```bash
# Pusha commits och tags
git push && git push --tags
```

## Efter publicering

### Verifiera installation

```bash
# Testa global installation
npm install -g kb-biblioteksstatistik-mcp

# Testa npx
npx kb-biblioteksstatistik-mcp --help

# Avinstallera test-installation
npm uninstall -g kb-biblioteksstatistik-mcp
```

### Uppdatera dokumentation

Kontrollera att följande dokument är uppdaterade:
- [x] README.md - npx instruktioner fungerar
- [x] INSTALL.md - korrekt installation guide
- [x] mcp-config-examples.json - korrekt package name

## Versionshantering

Vi följer [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (0.X.0): Nya features (backwards compatible)
- **PATCH** (0.0.X): Bug fixes

### Version history

- `2.0.0` - Första publika versionen med:
  - 20 specialiserade verktyg
  - 5 MCP prompts
  - Lokal och remote server support
  - Fullständig dokumentation

## Filer som inkluderas i paketet

Definierat i `package.json` under `files`:

```json
"files": [
  "build/",
  "terms",
  "README.md",
  "LICENSE"
]
```

Följande filer/mappar är INKLUDERADE:
- `build/` - Kompilerad TypeScript
- `terms` - Termdefinitioner
- `README.md` - Dokumentation
- `LICENSE` - Licensfil
- `package.json` - Automatiskt inkluderad

Följande är EXKLUDERADE (via .npmignore):
- `src/` - Källkod (endast kompilerad kod behövs)
- `tsconfig.json` - TypeScript config
- `.env` - Environment filer
- Development filer

## npm Scripts

Efter publicering kan användare köra:

```bash
# Direct execution
npx kb-biblioteksstatistik-mcp

# Global installation
npm install -g kb-biblioteksstatistik-mcp
kb-biblioteksstatistik-mcp

# Lokal installation
npm install kb-biblioteksstatistik-mcp
```

## Package.json viktiga fält

```json
{
  "name": "kb-biblioteksstatistik-mcp",
  "version": "2.0.0",
  "main": "build/index.js",
  "bin": {
    "kb-biblioteksstatistik-mcp": "build/index.js"
  },
  "files": ["build/", "terms", "README.md", "LICENSE"],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- `main`: Entry point för require/import
- `bin`: Kommando som blir tillgängligt globalt
- `files`: Vad som inkluderas i paketet
- `engines`: Node.js version requirement

## Best Practices

1. **Alltid testa före publicering**
   ```bash
   npm pack
   tar -xzf kb-biblioteksstatistik-mcp-2.0.0.tgz
   cd package
   npm install
   node build/index.js
   ```

2. **Använd npm version för versionshantering**
   - Skapar git tag automatiskt
   - Uppdaterar package.json
   - Förhindrar manuella fel

3. **Dokumentera breaking changes**
   - Uppdatera CHANGELOG.md
   - Skriv migration guide om nödvändigt

4. **Testa på olika plattformar**
   - macOS
   - Linux
   - Windows

## Unpublishing (Varning!)

⚠️ **Använd endast i nödfall!**

```bash
# Unpublish en specifik version (inom 72 timmar)
npm unpublish kb-biblioteksstatistik-mcp@2.0.0

# Unpublish helt paket (inom 72 timmar, endast om inga beroenden)
npm unpublish kb-biblioteksstatistik-mcp --force
```

**OBS**: Efter 72 timmar kan du INTE unpublisha. Deprecate istället:

```bash
npm deprecate kb-biblioteksstatistik-mcp@2.0.0 "Använd version 2.0.1 istället"
```

## Support & Underhåll

- Issues: https://github.com/KSAklfszf921/KB-Biblioteksstatistik-MCP/issues
- npm: https://www.npmjs.com/package/kb-biblioteksstatistik-mcp
- Dokumentation: Se README.md och INSTALL.md

## Checklista före publicering

- [ ] Alla tester passerar
- [ ] `npm run build` fungerar
- [ ] Version uppdaterad (npm version)
- [ ] CHANGELOG.md uppdaterad
- [ ] README.md uppdaterad
- [ ] Alla commits pushade till git
- [ ] `npm pack --dry-run` verifierad
- [ ] LICENSE fil finns
- [ ] .npmignore korrekt konfigurerad
- [ ] Testat med `npm link` lokalt
- [ ] Dokumentation komplett
