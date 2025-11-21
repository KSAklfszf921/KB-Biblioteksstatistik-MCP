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
  searchTermsByCategory,
  searchTermsByKeyword,
  getTermDetails,
  listTermCategories,
  type ObservationQueryParams
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
