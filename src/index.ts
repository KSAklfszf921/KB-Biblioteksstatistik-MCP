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
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
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
  getObservationsByTargetGroup,
  aggregateByTargetGroup,
  compareMultipleLibraries,
  generateTermReport,
  exportToCSV,
  listTargetGroups,
  type ObservationQueryParams,
  type Library
} from './kb-api.js';

/**
 * Skapar och konfigurerar MCP-servern
 */
const server = new Server(
  {
    name: 'kb-biblioteksstatistik-mcp',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
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
      {
        name: 'get_observations_by_target_group',
        description: 'Hämtar observationer filtrerade på målgrupp (folkbibliotek, forskningsbibliotek, skolbibliotek, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            target_group: {
              type: 'string',
              description: 'Målgrupp (ex: "folkbibliotek", "forskbibliotek", "skolbibliotek")',
            },
            year: {
              type: 'number',
              description: 'Filtrera på specifikt år (valfri)',
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
          required: ['target_group'],
        },
      },
      {
        name: 'aggregate_by_target_group',
        description: 'Aggregerar statistik för en term uppdelat per målgrupp. Visar medel, min, max per typ av bibliotek.',
        inputSchema: {
          type: 'object',
          properties: {
            term_id: {
              type: 'string',
              description: 'Term-ID att aggregera',
            },
            year: {
              type: 'number',
              description: 'Filtrera på specifikt år (valfri)',
            },
          },
          required: ['term_id'],
        },
      },
      {
        name: 'compare_multiple_libraries',
        description: 'Jämför flera bibliotek för samma term och år. Visar värden sida vid sida.',
        inputSchema: {
          type: 'object',
          properties: {
            library_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Lista med biblioteks-ID:n att jämföra',
            },
            term_id: {
              type: 'string',
              description: 'Term-ID att jämföra',
            },
            year: {
              type: 'number',
              description: 'Året att jämföra',
            },
          },
          required: ['library_ids', 'term_id', 'year'],
        },
      },
      {
        name: 'generate_term_report',
        description: 'Genererar en omfattande rapport för en term inkl. statistik, top 10 bibliotek, och uppdelning per målgrupp.',
        inputSchema: {
          type: 'object',
          properties: {
            term_id: {
              type: 'string',
              description: 'Term-ID att generera rapport för',
            },
            year: {
              type: 'number',
              description: 'Året att generera rapport för',
            },
          },
          required: ['term_id', 'year'],
        },
      },
      {
        name: 'export_to_csv',
        description: 'Exporterar observationer till CSV-format för vidare analys i Excel eller andra verktyg.',
        inputSchema: {
          type: 'object',
          properties: {
            term: {
              type: 'string',
              description: 'Term att exportera',
            },
            year: {
              type: 'number',
              description: 'År att exportera (valfri)',
            },
            limit: {
              type: 'number',
              description: 'Max antal observationer (default: 1000)',
              default: 1000,
            },
          },
          required: ['term'],
        },
      },
      {
        name: 'list_target_groups',
        description: 'Listar alla tillgängliga målgrupper i statistiken (folkbibliotek, forskningsbibliotek, etc.).',
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
 * Handler för att lista tillgängliga prompts (instruction templates)
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'analyze-library-trends',
        description: 'Analysera trender för ett bibliotek över flera år',
        arguments: [
          {
            name: 'library_name',
            description: 'Namnet på biblioteket att analysera',
            required: true,
          },
          {
            name: 'start_year',
            description: 'Startår för analys',
            required: true,
          },
          {
            name: 'end_year',
            description: 'Slutår för analys',
            required: true,
          },
        ],
      },
      {
        name: 'compare-library-types',
        description: 'Jämför olika typer av bibliotek (folk, forsk, skol) för en specifik term',
        arguments: [
          {
            name: 'term_id',
            description: 'Term att jämföra (ex: Folk54)',
            required: true,
          },
          {
            name: 'year',
            description: 'År att jämföra',
            required: true,
          },
        ],
      },
      {
        name: 'generate-annual-report',
        description: 'Generera en årsrapport för en specifik term med full statistik',
        arguments: [
          {
            name: 'term_id',
            description: 'Term att rapporten (ex: Aktiv99)',
            required: true,
          },
          {
            name: 'year',
            description: 'År för rapporten',
            required: true,
          },
        ],
      },
      {
        name: 'benchmark-libraries',
        description: 'Jämför flera bibliotek mot varandra för benchmarking',
        arguments: [
          {
            name: 'library_names',
            description: 'Kommaseparerad lista med biblioteksnamn',
            required: true,
          },
          {
            name: 'terms',
            description: 'Kommaseparerad lista med termer att jämföra',
            required: true,
          },
          {
            name: 'year',
            description: 'År för jämförelse',
            required: true,
          },
        ],
      },
      {
        name: 'discover-terms',
        description: 'Utforska och hitta relevanta termer för ett specifikt ämnesområde',
        arguments: [
          {
            name: 'topic',
            description: 'Ämnesområde (ex: "besök", "låntagare", "personal", "bestånd")',
            required: true,
          },
        ],
      },
    ],
  };
});

/**
 * Handler för att hämta specifikt prompt
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'analyze-library-trends') {
    const libraryName = args?.library_name as string;
    const startYear = args?.start_year as string;
    const endYear = args?.end_year as string;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analysera trender för ${libraryName} från ${startYear} till ${endYear}:

1. Använd search_libraries för att hitta biblioteket
2. Använd list_term_categories för att se tillgängliga kategorier
3. För viktiga termer som Folk54 (besök), Aktiv99 (aktiva låntagare), och Lan101 (utlån):
   - Använd get_term_trend för att se utveckling över tid
   - Använd compare_library_years för att jämföra ${startYear} med ${endYear}
4. Sammanfatta trenderna och identifiera eventuella förändringsmönster
5. Ge rekommendationer baserat på data`,
          },
        },
      ],
    };
  }

  if (name === 'compare-library-types') {
    const termId = args?.term_id as string;
    const year = args?.year as string;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Jämför olika bibliotekstyper för ${termId} år ${year}:

1. Använd get_term_details för att förstå vad ${termId} betyder
2. Använd list_target_groups för att se tillgängliga målgrupper
3. Använd aggregate_by_target_group med term_id="${termId}" och year=${year}
4. Analysera skillnaderna mellan folkbibliotek, forskningsbibliotek och skolbibliotek
5. Identifiera vilken typ av bibliotek som presterar bäst för denna term
6. Förklara möjliga orsaker till skillnaderna`,
          },
        },
      ],
    };
  }

  if (name === 'generate-annual-report') {
    const termId = args?.term_id as string;
    const year = args?.year as string;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generera en omfattande årsrapport för ${termId} år ${year}:

1. Använd generate_term_report med term_id="${termId}" och year=${year}
2. Komplettera med:
   - get_term_details för fullständig beskrivning
   - aggregate_by_target_group för målgruppsanalys
   - list_libraries för att se vilka bibliotek som rapporterar
3. Presentera rapporten strukturerat med:
   - Översikt och nyckeltal
   - Statistisk analys (medel, median, standardavvikelse)
   - Top 10 bibliotek
   - Analys per målgrupp
   - Slutsatser och trender`,
          },
        },
      ],
    };
  }

  if (name === 'benchmark-libraries') {
    const libraryNames = args?.library_names as string;
    const terms = args?.terms as string;
    const year = args?.year as string;

    const libArray = libraryNames.split(',').map(s => s.trim());
    const termArray = terms.split(',').map(s => s.trim());

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Benchmarka biblioteken ${libraryNames} för år ${year}:

1. För varje term i [${terms}]:
   - Använd compare_multiple_libraries med library_ids=${JSON.stringify(libArray)}, term_id=<term>, year=${year}
   - Identifiera vilket bibliotek som presterar bäst
2. Skapa en sammanfattande jämförelsetabell
3. Analysera styrkor och svagheter för varje bibliotek
4. Ge rekommendationer för förbättringsområden
5. Identifiera best practices från topppresterande bibliotek`,
          },
        },
      ],
    };
  }

  if (name === 'discover-terms') {
    const topic = args?.topic as string;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Utforska termer relaterade till "${topic}":

1. Använd search_terms_by_keyword med keyword="${topic}"
2. Använd list_term_categories för att se alla kategorier
3. För relevanta termer:
   - Använd get_term_details för att få fullständig beskrivning
   - Visa exempel på data med search_library_statistics
4. Gruppera termerna efter kategori
5. Förklara hur termerna kan användas för analys
6. Ge exempel på användbara kombinationer av termer`,
          },
        },
      ],
    };
  }

  throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
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

    if (name === 'get_observations_by_target_group') {
      const targetGroup = args?.target_group as string;
      const year = args?.year as number | undefined;
      const term = args?.term as string | undefined;
      const limit = (args?.limit as number | undefined) || 1000;

      if (!targetGroup) {
        throw new McpError(ErrorCode.InvalidParams, 'Parameter "target_group" är obligatorisk');
      }

      const observations = await getObservationsByTargetGroup(targetGroup, year, term, limit);

      let result = `# Observationer för målgrupp: ${targetGroup}\n\n`;
      if (year) result += `År: ${year}\n`;
      if (term) result += `Term: ${term}\n`;
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
        result += 'Inga observationer hittades för denna målgrupp.\n';
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

    if (name === 'aggregate_by_target_group') {
      const termId = args?.term_id as string;
      const year = args?.year as number | undefined;

      if (!termId) {
        throw new McpError(ErrorCode.InvalidParams, 'Parameter "term_id" är obligatorisk');
      }

      const aggregated = await aggregateByTargetGroup(termId, year);

      let result = `# Aggregering per målgrupp: ${termId}\n\n`;
      if (year) result += `År: ${year}\n`;
      result += `Antal målgrupper: ${aggregated.size}\n\n`;

      result += `## Statistik per målgrupp\n\n`;

      aggregated.forEach((stats, targetGroup) => {
        result += `**${targetGroup}**\n`;
        result += `  Antal observationer: ${stats.count}\n`;
        if (stats.sum !== undefined) result += `  Summa: ${stats.sum.toFixed(2)}\n`;
        if (stats.average !== undefined) result += `  Medel: ${stats.average.toFixed(2)}\n`;
        if (stats.min !== undefined) result += `  Min: ${stats.min}\n`;
        if (stats.max !== undefined) result += `  Max: ${stats.max}\n`;
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

    if (name === 'compare_multiple_libraries') {
      const libraryIds = args?.library_ids as string[];
      const termId = args?.term_id as string;
      const year = args?.year as number;

      if (!libraryIds || !Array.isArray(libraryIds) || libraryIds.length === 0) {
        throw new McpError(ErrorCode.InvalidParams, 'Parameter "library_ids" måste vara en icke-tom array');
      }

      if (!termId || !year) {
        throw new McpError(ErrorCode.InvalidParams, 'Parametrar "term_id" och "year" är obligatoriska');
      }

      const comparison = await compareMultipleLibraries(libraryIds, termId, year);

      let result = `# Jämförelse av bibliotek\n\n`;
      result += `Term: ${termId}\n`;
      result += `År: ${year}\n`;
      result += `Antal bibliotek: ${libraryIds.length}\n\n`;

      result += `## Resultat\n\n`;

      comparison.forEach((item, index) => {
        result += `${index + 1}. **${item.libraryId}**\n`;
        result += `   Värde: ${item.value !== null ? item.value : 'Ingen data'}\n`;
        if (item.observation) {
          result += `   Bibliotek: ${typeof item.observation.library === 'object' ? item.observation.library.name || item.observation.library['@id'] : item.observation.library}\n`;
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

    if (name === 'generate_term_report') {
      const termId = args?.term_id as string;
      const year = args?.year as number;

      if (!termId || !year) {
        throw new McpError(ErrorCode.InvalidParams, 'Parametrar "term_id" och "year" är obligatoriska');
      }

      const report = await generateTermReport(termId, year);

      let result = `# Rapport: ${termId} (${year})\n\n`;

      if (report.termDetails) {
        result += `## Termbeskrivning\n\n`;
        result += formatTermDetailed(report.termDetails);
      }

      result += `## Översikt\n\n`;
      result += `Totalt antal observationer: ${report.totalObservations}\n\n`;

      if (report.statistics) {
        result += `## Statistisk analys\n\n`;
        const stats = report.statistics;
        result += `- Antal: ${stats.count}\n`;
        result += `- Summa: ${stats.sum.toFixed(2)}\n`;
        result += `- Medel: ${stats.mean.toFixed(2)}\n`;
        result += `- Median: ${stats.median.toFixed(2)}\n`;
        result += `- Standardavvikelse: ${stats.standardDeviation.toFixed(2)}\n`;
        result += `- Min: ${stats.min}\n`;
        result += `- Max: ${stats.max}\n`;
        result += `- Spridning: ${stats.range}\n`;
        result += `- 25:e percentil: ${stats.percentile25}\n`;
        result += `- 75:e percentil: ${stats.percentile75}\n`;
        if (stats.mode !== null) result += `- Typvärde: ${stats.mode}\n`;
        result += '\n';
      }

      if (report.byTargetGroup.size > 0) {
        result += `## Per målgrupp\n\n`;
        report.byTargetGroup.forEach((stats, group) => {
          result += `**${group}**\n`;
          result += `  Antal: ${stats.count}`;
          if (stats.average !== undefined) result += `, Medel: ${stats.average.toFixed(2)}`;
          result += '\n';
        });
        result += '\n';
      }

      if (report.topLibraries.length > 0) {
        result += `## Top 10 bibliotek\n\n`;
        report.topLibraries.forEach((lib, index) => {
          result += `${index + 1}. ${lib.library}: ${lib.value}\n`;
        });
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

    if (name === 'export_to_csv') {
      const term = args?.term as string;
      const year = args?.year as number | undefined;
      const limit = (args?.limit as number | undefined) || 1000;

      if (!term) {
        throw new McpError(ErrorCode.InvalidParams, 'Parameter "term" är obligatorisk');
      }

      const params: ObservationQueryParams = {
        term,
        limit,
      };

      const data = await fetchObservations(params);
      let observations = data['@graph'] || [];

      if (year) {
        observations = observations.filter(obs => obs.sampleYear === year);
      }

      const csv = exportToCSV(observations);

      let result = `# CSV Export\n\n`;
      result += `Term: ${term}\n`;
      if (year) result += `År: ${year}\n`;
      result += `Antal observationer: ${observations.length}\n\n`;
      result += `## CSV Data\n\n\`\`\`csv\n${csv}\n\`\`\`\n`;

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    if (name === 'list_target_groups') {
      const limit = (args?.limit as number | undefined) || 2000;

      const targetGroups = await listTargetGroups(limit);

      let result = `# Målgrupper i biblioteksstatistiken\n\n`;
      result += `Antal målgrupper: ${targetGroups.length}\n\n`;

      result += `## Tillgängliga målgrupper\n\n`;
      targetGroups.forEach((group, index) => {
        result += `${index + 1}. ${group}\n`;
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
