#!/usr/bin/env node

/**
 * MCP Server för Kungliga Bibliotekets öppna biblioteksstatistik
 *
 * Tillhandahåller verktyg för att söka i svensk biblioteksstatistik
 * via KB:s öppna data API.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import {
  fetchObservations,
  fetchTerms,
  formatObservation,
  formatTerm,
  formatTermDetailed,
  formatComparison,
  searchTermsByCategory,
  searchTermsByKeyword,
  getTermDetails,
  listTermCategories,
  getLibraryObservations,
  getObservationsByYear,
  compareLibraryYears,
  getMultipleTerms,
  getTermTrend,
  listLibraries,
  searchLibraries,
  getAvailableYears,
  type ObservationQueryParams,
  type Library
} from './kb-api.js';

/**
 * Skapar och konfigurerar MCP-servern
 */
const server = new Server(
  {
    name: 'kb-biblioteksstatistik-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

/**
 * Handler för att lista tillgängliga verktyg
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_library_statistics',
        description: 'Söker i svensk biblioteksstatistik från Kungliga Biblioteket. Returnerar observationer för bibliotek, mätår och termer. Data finns från verksamhetsår 2014 och framåt.',
        inputSchema: {
          type: 'object',
          properties: {
            term: {
              type: 'string',
              description: 'Filtrera på specifik term, ex: Folk54 (antal besök). Om den utelämnas hämtas alla termer.',
            },
            date_from: {
              type: 'string',
              description: 'Hämta endast observationer uppdaterade från och med detta datum. Format: ISO-8601 (YYYY-MM-DDTHH:mm:ss), ex: 2014-07-03T07:39:27',
            },
            date_to: {
              type: 'string',
              description: 'Hämta endast observationer uppdaterade innan detta datum. Format: ISO-8601 (YYYY-MM-DDTHH:mm:ss)',
            },
            limit: {
              type: 'number',
              description: 'Begränsa antalet returnerade observationer (default: 100, max rekommenderat: 1000)',
              default: 100,
            },
            offset: {
              type: 'number',
              description: 'Paginering: position för första returnerade observation (default: 0)',
              default: 0,
            },
          },
        },
      },
      {
        name: 'get_term_definitions',
        description: 'Hämtar alla termdefinitioner som används i biblioteksstatistiken. Använd detta för att se vilka termer som finns tillgängliga (ex: Folk54 för besök, Skol24 för skolbibliotek, etc.)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_terms_by_category',
        description: 'Söker termer baserat på kategori/prefix. Använd detta för att hitta alla termer inom en viss kategori, t.ex. "Aktiv" för aktiva låntagare, "Besok" för besöksstatistik, "Bestand" för beståndsdata, "Arsverke" för personalstatistik.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Kategori/prefix att söka efter (ex: "Aktiv", "Besok", "Bestand", "Arsverke", "Folk", "Forsk", "Skol")',
            },
          },
          required: ['category'],
        },
      },
      {
        name: 'search_terms_by_keyword',
        description: 'Söker termer baserat på nyckelord i beskrivning eller namn. Använd detta för att hitta termer relaterade till ett specifikt ämne (ex: "låntagare", "besök", "böcker", "personal").',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: 'Nyckelord att söka efter i termdefinitioner',
            },
          },
          required: ['keyword'],
        },
      },
      {
        name: 'get_term_details',
        description: 'Hämtar detaljerad information om en specifik term inkl. beskrivning, datatyp, giltighetstid och eventuella ersättningar.',
        inputSchema: {
          type: 'object',
          properties: {
            term_id: {
              type: 'string',
              description: 'Term-ID att hämta detaljer för (ex: "Folk54", "Aktiv01", "Bestand101")',
            },
          },
          required: ['term_id'],
        },
      },
      {
        name: 'list_term_categories',
        description: 'Listar alla tillgängliga termkategorier/prefix i biblioteksstatistiken.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_library_data',
        description: 'Hämtar all statistik för ett specifikt bibliotek. Kan filtreras på år och term.',
        inputSchema: {
          type: 'object',
          properties: {
            library_id: {
              type: 'string',
              description: 'Biblioteks-ID eller del av biblioteksnamn',
            },
            year: {
              type: 'number',
              description: 'Filtrera på specifikt år (valfri)',
            },
            term: {
              type: 'string',
              description: 'Filtrera på specifik term (valfri)',
            },
          },
          required: ['library_id'],
        },
      },
      {
        name: 'get_year_statistics',
        description: 'Hämtar observationer för ett specifikt år. Kan filtreras på term.',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'Året att hämta statistik för',
            },
            term: {
              type: 'string',
              description: 'Filtrera på specifik term (valfri)',
            },
            limit: {
              type: 'number',
              description: 'Max antal resultat (default: 1000)',
              default: 1000,
            },
          },
          required: ['year'],
        },
      },
      {
        name: 'compare_library_years',
        description: 'Jämför ett biblioteks statistik mellan två år och beräknar förändring.',
        inputSchema: {
          type: 'object',
          properties: {
            library_id: {
              type: 'string',
              description: 'Biblioteks-ID eller del av biblioteksnamn',
            },
            year1: {
              type: 'number',
              description: 'Första året att jämföra',
            },
            year2: {
              type: 'number',
              description: 'Andra året att jämföra',
            },
            term: {
              type: 'string',
              description: 'Filtrera på specifik term (valfri)',
            },
          },
          required: ['library_id', 'year1', 'year2'],
        },
      },
      {
        name: 'get_term_trend',
        description: 'Analyserar trender för en term över flera år. Visar statistik per år (medel, min, max, summa).',
        inputSchema: {
          type: 'object',
          properties: {
            term_id: {
              type: 'string',
              description: 'Term-ID att analysera (ex: "Folk54", "Aktiv01")',
            },
            start_year: {
              type: 'number',
              description: 'Startår för analys',
            },
            end_year: {
              type: 'number',
              description: 'Slutår för analys',
            },
          },
          required: ['term_id', 'start_year', 'end_year'],
        },
      },
      {
        name: 'get_multiple_terms',
        description: 'Hämtar observationer för flera termer samtidigt. Användbart för att jämföra relaterade termer.',
        inputSchema: {
          type: 'object',
          properties: {
            term_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Lista med term-ID:n att hämta (ex: ["Folk54", "Aktiv01", "Lan101"])',
            },
            year: {
              type: 'number',
              description: 'Filtrera på specifikt år (valfri)',
            },
            limit: {
              type: 'number',
              description: 'Max antal resultat per term (default: 1000)',
              default: 1000,
            },
          },
          required: ['term_ids'],
        },
      },
      {
        name: 'list_libraries',
        description: 'Listar tillgängliga bibliotek i statistiken.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Max antal observationer att söka igenom (default: 1000)',
              default: 1000,
            },
          },
        },
      },
      {
        name: 'search_libraries',
        description: 'Söker efter bibliotek baserat på namn, sigel eller ID.',
        inputSchema: {
          type: 'object',
          properties: {
            search_term: {
              type: 'string',
              description: 'Sökterm (namn, sigel eller ID)',
            },
          },
          required: ['search_term'],
        },
      },
      {
        name: 'get_available_years',
        description: 'Hämtar lista över alla tillgängliga år i statistiken.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Max antal observationer att söka igenom (default: 2000)',
              default: 2000,
            },
          },
        },
      },
    ],
  };
});

/**
 * Handler för att lista tillgängliga resurser
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'kb://terms',
        mimeType: 'application/json',
        name: 'Biblioteksstatistik Termdefinitioner',
        description: 'Lista över alla termer som används i svensk biblioteksstatistik',
      },
    ],
  };
});

/**
 * Handler för att läsa resurser
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri.toString();

  if (uri === 'kb://terms') {
    try {
      const termsData = await fetchTerms();
      const terms = termsData['@graph'] || [];

      let content = '# Biblioteksstatistik Termdefinitioner\n\n';
      content += `Totalt antal termer: ${terms.length}\n\n`;

      terms.forEach((term) => {
        content += `## ${term.key || 'Okänd'}\n`;
        content += formatTerm(term) + '\n\n';
      });

      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: content,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch terms: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
});

/**
 * Handler för att utföra verktygsanrop
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'search_library_statistics') {
      const params: ObservationQueryParams = {
        term: args?.term as string | undefined,
        date_from: args?.date_from as string | undefined,
        date_to: args?.date_to as string | undefined,
        limit: args?.limit as number | undefined,
        offset: args?.offset as number | undefined,
      };

      const data = await fetchObservations(params);
      const observations = data['@graph'] || [];

      let result = `# Biblioteksstatistik\n\n`;
      result += `Antal observationer: ${observations.length}\n\n`;

      if (params.term) result += `Filtrerat på term: ${params.term}\n`;
      if (params.date_from) result += `Datum från: ${params.date_from}\n`;
      if (params.date_to) result += `Datum till: ${params.date_to}\n`;
      if (params.limit) result += `Begränsning: ${params.limit}\n`;
      if (params.offset) result += `Offset: ${params.offset}\n`;

      result += `\n## Observationer\n\n`;

      observations.forEach((obs, index) => {
        result += `${index + 1}. ${formatObservation(obs)}\n`;
      });

      if (observations.length === 0) {
        result += 'Inga observationer hittades med de angivna parametrarna.\n';
      }

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (name === 'get_term_definitions') {
      const termsData = await fetchTerms();
      const terms = termsData['@graph'] || [];

      let result = `# Termdefinitioner för Biblioteksstatistik\n\n`;
      result += `Totalt antal termer: ${terms.length}\n\n`;

      terms.forEach((term, index) => {
        result += `${index + 1}. ${formatTerm(term)}\n`;
      });

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (name === 'search_terms_by_category') {
      const category = args?.category as string;

      if (!category) {
        throw new McpError(ErrorCode.InvalidParams, 'Parameter "category" är obligatorisk');
      }

      const terms = await searchTermsByCategory(category);

      let result = `# Termer i kategori: ${category}\n\n`;
      result += `Antal termer funna: ${terms.length}\n\n`;

      if (terms.length > 0) {
        result += `## Termer\n\n`;
        terms.forEach((term, index) => {
          result += `${index + 1}. ${formatTerm(term)}\n`;
        });
      } else {
        result += `Inga termer hittades som börjar med "${category}".\n`;
      }

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (name === 'search_terms_by_keyword') {
      const keyword = args?.keyword as string;

      if (!keyword) {
        throw new McpError(ErrorCode.InvalidParams, 'Parameter "keyword" är obligatorisk');
      }

      const terms = await searchTermsByKeyword(keyword);

      let result = `# Termer som matchar nyckelord: "${keyword}"\n\n`;
      result += `Antal termer funna: ${terms.length}\n\n`;

      if (terms.length > 0) {
        result += `## Termer\n\n`;
        terms.forEach((term, index) => {
          result += `${index + 1}. ${formatTerm(term)}\n`;
        });
      } else {
        result += `Inga termer hittades som matchar "${keyword}".\n`;
      }

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (name === 'get_term_details') {
      const termId = args?.term_id as string;

      if (!termId) {
        throw new McpError(ErrorCode.InvalidParams, 'Parameter "term_id" är obligatorisk');
      }

      const term = await getTermDetails(termId);

      if (!term) {
        return {
          content: [
            {
              type: 'text',
              text: `# Term hittades inte\n\nIngen term med ID "${termId}" kunde hittas i biblioteksstatistiken.`,
            },
          ],
        };
      }

      const result = `# Termdetaljer\n\n${formatTermDetailed(term)}`;

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (name === 'list_term_categories') {
      const categories = await listTermCategories();

      let result = `# Termkategorier i Biblioteksstatistiken\n\n`;
      result += `Totalt antal kategorier: ${categories.length}\n\n`;
      result += `## Tillgängliga kategorier\n\n`;

      categories.forEach((category, index) => {
        result += `${index + 1}. **${category}** - Använd "search_terms_by_category" för att se alla termer i denna kategori\n`;
      });

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (name === 'get_library_data') {
      const libraryId = args?.library_id as string;
      const year = args?.year as number | undefined;
      const term = args?.term as string | undefined;

      if (!libraryId) {
        throw new McpError(ErrorCode.InvalidParams, 'Parameter "library_id" är obligatorisk');
      }

      const observations = await getLibraryObservations(libraryId, year, term);

      let result = `# Biblioteksdata\n\n`;
      result += `Bibliotek: ${libraryId}\n`;
      if (year) result += `År: ${year}\n`;
      if (term) result += `Term: ${term}\n`;
      result += `Antal observationer: ${observations.length}\n\n`;

      if (observations.length > 0) {
        result += `## Observationer\n\n`;
        observations.forEach((obs, index) => {
          result += `${index + 1}. ${formatObservation(obs)}\n`;
        });
      } else {
        result += 'Inga observationer hittades för detta bibliotek.\n';
      }

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (name === 'get_year_statistics') {
      const year = args?.year as number;
      const term = args?.term as string | undefined;
      const limit = (args?.limit as number | undefined) || 1000;

      if (!year) {
        throw new McpError(ErrorCode.InvalidParams, 'Parameter "year" är obligatorisk');
      }

      const observations = await getObservationsByYear(year, term, limit);

      let result = `# Statistik för år ${year}\n\n`;
      if (term) result += `Filtrerat på term: ${term}\n`;
      result += `Antal observationer: ${observations.length}\n\n`;

      if (observations.length > 0) {
        result += `## Observationer\n\n`;
        observations.slice(0, 50).forEach((obs, index) => {
          result += `${index + 1}. ${formatObservation(obs)}\n`;
        });

        if (observations.length > 50) {
          result += `\n... och ${observations.length - 50} observationer till\n`;
        }
      } else {
        result += 'Inga observationer hittades för detta år.\n';
      }

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (name === 'compare_library_years') {
      const libraryId = args?.library_id as string;
      const year1 = args?.year1 as number;
      const year2 = args?.year2 as number;
      const term = args?.term as string | undefined;

      if (!libraryId || !year1 || !year2) {
        throw new McpError(ErrorCode.InvalidParams, 'Parametrar "library_id", "year1" och "year2" är obligatoriska');
      }

      const comparisonData = await compareLibraryYears(libraryId, year1, year2, term);

      let result = `# Jämförelse: ${libraryId}\n\n`;
      result += `Jämför år ${year1} med år ${year2}\n`;
      if (term) result += `Filtrerat på term: ${term}\n`;
      result += `\n## Jämförelse\n\n`;

      result += formatComparison(comparisonData.comparison);

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (name === 'get_term_trend') {
      const termId = args?.term_id as string;
      const startYear = args?.start_year as number;
      const endYear = args?.end_year as number;

      if (!termId || !startYear || !endYear) {
        throw new McpError(ErrorCode.InvalidParams, 'Parametrar "term_id", "start_year" och "end_year" är obligatoriska');
      }

      const trend = await getTermTrend(termId, startYear, endYear);

      let result = `# Trendanalys: ${termId}\n\n`;
      result += `Period: ${startYear} - ${endYear}\n`;
      result += `Antal år med data: ${trend.years.length}\n\n`;

      result += `## Statistik per år\n\n`;

      trend.statistics.forEach(stat => {
        result += `**År ${stat.year}**\n`;
        result += `  Antal observationer: ${stat.count}\n`;
        if (stat.sum !== undefined) result += `  Summa: ${stat.sum.toFixed(2)}\n`;
        if (stat.average !== undefined) result += `  Medel: ${stat.average.toFixed(2)}\n`;
        if (stat.min !== undefined) result += `  Min: ${stat.min}\n`;
        if (stat.max !== undefined) result += `  Max: ${stat.max}\n`;
        result += '\n';
      });

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (name === 'get_multiple_terms') {
      const termIds = args?.term_ids as string[];
      const year = args?.year as number | undefined;
      const limit = (args?.limit as number | undefined) || 1000;

      if (!termIds || !Array.isArray(termIds) || termIds.length === 0) {
        throw new McpError(ErrorCode.InvalidParams, 'Parameter "term_ids" måste vara en icke-tom array');
      }

      const termsData = await getMultipleTerms(termIds, year, limit);

      let result = `# Flera termer\n\n`;
      result += `Antal termer: ${termIds.length}\n`;
      if (year) result += `Filtrerat på år: ${year}\n`;
      result += '\n';

      termsData.forEach((observations, termId) => {
        result += `## ${termId}\n\n`;
        result += `Antal observationer: ${observations.length}\n\n`;

        if (observations.length > 0) {
          observations.slice(0, 10).forEach((obs, index) => {
            result += `${index + 1}. ${formatObservation(obs)}\n`;
          });

          if (observations.length > 10) {
            result += `\n... och ${observations.length - 10} observationer till\n`;
          }
        }
        result += '\n';
      });

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (name === 'list_libraries') {
      const limit = (args?.limit as number | undefined) || 1000;

      const libraries = await listLibraries(limit);

      let result = `# Bibliotek i statistiken\n\n`;
      result += `Antal unika bibliotek: ${libraries.length}\n\n`;

      libraries.slice(0, 100).forEach((lib, index) => {
        result += `${index + 1}. `;
        result += `ID: ${lib['@id']}`;
        if (lib.name) result += ` | Namn: ${lib.name}`;
        if (lib.sigel) result += ` | Sigel: ${lib.sigel}`;
        if (lib.municipality) result += ` | Kommun: ${lib.municipality}`;
        result += '\n';
      });

      if (libraries.length > 100) {
        result += `\n... och ${libraries.length - 100} bibliotek till\n`;
      }

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (name === 'search_libraries') {
      const searchTerm = args?.search_term as string;

      if (!searchTerm) {
        throw new McpError(ErrorCode.InvalidParams, 'Parameter "search_term" är obligatorisk');
      }

      const libraries = await searchLibraries(searchTerm);

      let result = `# Bibliotekssökning: "${searchTerm}"\n\n`;
      result += `Antal träffar: ${libraries.length}\n\n`;

      if (libraries.length > 0) {
        libraries.forEach((lib, index) => {
          result += `${index + 1}. `;
          result += `ID: ${lib['@id']}`;
          if (lib.name) result += ` | Namn: ${lib.name}`;
          if (lib.sigel) result += ` | Sigel: ${lib.sigel}`;
          if (lib.municipality) result += ` | Kommun: ${lib.municipality}`;
          result += '\n';
        });
      } else {
        result += `Inga bibliotek hittades som matchar "${searchTerm}".\n`;
      }

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (name === 'get_available_years') {
      const limit = (args?.limit as number | undefined) || 2000;

      const years = await getAvailableYears(limit);

      let result = `# Tillgängliga år i statistiken\n\n`;
      result += `Antal år: ${years.length}\n\n`;

      result += `## År (nyast till äldst)\n\n`;
      years.forEach((year, index) => {
        result += `${index + 1}. ${year}\n`;
      });

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

/**
 * Startar servern
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('KB Biblioteksstatistik MCP Server is running');
  console.error('API: https://bibstat.kb.se/');
  console.error('Licens: CC0');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
