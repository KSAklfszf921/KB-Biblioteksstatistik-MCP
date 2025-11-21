/**
 * API-klient för Kungliga Bibliotekets öppna biblioteksstatistik
 *
 * API-dokumentation: https://bibstat.kb.se/
 * Format: JSON-LD
 * Licens: CC0
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KB_BIBSTAT_BASE_URL = 'https://bibstat.kb.se';

// Cache för termdefinitioner
let termsCache: Term[] | null = null;

export interface ObservationQueryParams {
  term?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface Observation {
  '@id': string;
  '@type': string;
  term?: string;
  value?: any;
  library?: any;
  sampleYear?: number;
  modified?: string;
  [key: string]: any;
}

export interface Term {
  '@id': string;
  '@type': string | string[];
  label?: string | { sv?: string; '@value'?: string };
  comment?: string;
  range?: string;
  valid?: string;
  replaces?: string | string[];
  replacedBy?: string;
  [key: string]: any;
}

export interface ApiResponse<T> {
  '@context'?: any;
  '@graph'?: T[];
  [key: string]: any;
}

/**
 * Hämtar biblioteksstatistik-observationer från KB API
 */
export async function fetchObservations(params: ObservationQueryParams = {}): Promise<ApiResponse<Observation>> {
  const queryParams = new URLSearchParams();

  if (params.term) {
    queryParams.append('term', params.term);
  }

  if (params.date_from) {
    queryParams.append('date_from', params.date_from);
  }

  if (params.date_to) {
    queryParams.append('date_to', params.date_to);
  }

  if (params.limit !== undefined) {
    queryParams.append('limit', params.limit.toString());
  }

  if (params.offset !== undefined) {
    queryParams.append('offset', params.offset.toString());
  }

  const url = `${KB_BIBSTAT_BASE_URL}/data${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/ld+json'
    }
  });

  if (!response.ok) {
    throw new Error(`KB API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Hämtar alla termdefinitioner från KB API
 */
export async function fetchTerms(): Promise<ApiResponse<Term>> {
  const url = `${KB_BIBSTAT_BASE_URL}/def/terms`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/ld+json'
    }
  });

  if (!response.ok) {
    throw new Error(`KB API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Formaterar en observation till en läsbar sträng
 */
export function formatObservation(obs: Observation): string {
  const parts: string[] = [];

  if (obs.term) parts.push(`Term: ${obs.term}`);
  if (obs.sampleYear) parts.push(`År: ${obs.sampleYear}`);
  if (obs.value !== undefined) parts.push(`Värde: ${obs.value}`);
  if (obs.library) {
    const libName = typeof obs.library === 'object' ? obs.library.name || obs.library['@id'] : obs.library;
    parts.push(`Bibliotek: ${libName}`);
  }
  if (obs.modified) parts.push(`Uppdaterad: ${obs.modified}`);

  return parts.join(' | ');
}

/**
 * Formaterar en term till en läsbar sträng
 */
export function formatTerm(term: Term): string {
  const parts: string[] = [];

  parts.push(`ID: ${term['@id']}`);

  if (term.label) {
    const label = typeof term.label === 'object' ? term.label.sv || term.label['@value'] : term.label;
    parts.push(`Namn: ${label}`);
  }

  if (term.range) {
    const rangeShort = term.range.replace('xsd:', '').replace('https://schema.org/', '');
    parts.push(`Datatyp: ${rangeShort}`);
  }

  return parts.join(' | ');
}

/**
 * Formaterar en term med full detaljer
 */
export function formatTermDetailed(term: Term): string {
  let output = `## ${term['@id']}\n\n`;

  if (term.label) {
    const label = typeof term.label === 'object' ? term.label.sv || term.label['@value'] : term.label;
    output += `**Namn:** ${label}\n\n`;
  }

  if (term['@type']) {
    const types = Array.isArray(term['@type']) ? term['@type'] : [term['@type']];
    output += `**Typ:** ${types.join(', ')}\n\n`;
  }

  if (term.comment) {
    output += `**Beskrivning:** ${term.comment}\n\n`;
  }

  if (term.range) {
    output += `**Datatyp:** ${term.range}\n\n`;
  }

  if (term.valid) {
    output += `**Giltighetstid:** ${term.valid}\n\n`;
  }

  if (term.replaces) {
    const replaces = Array.isArray(term.replaces) ? term.replaces : [term.replaces];
    output += `**Ersätter:** ${replaces.join(', ')}\n\n`;
  }

  if (term.replacedBy) {
    output += `**Ersätts av:** ${term.replacedBy}\n\n`;
  }

  return output;
}

/**
 * Laddar termdefinitioner från lokal fil
 */
export async function loadTermsFromFile(): Promise<Term[]> {
  if (termsCache !== null) {
    return termsCache;
  }

  try {
    const termsPath = join(__dirname, '..', 'terms');
    const content = await readFile(termsPath, 'utf-8');
    const data = JSON.parse(content);
    termsCache = data.terms || [];
    return termsCache || [];
  } catch (error) {
    console.error('Failed to load terms from file:', error);
    termsCache = [];
    return [];
  }
}

/**
 * Söker termer baserat på kategori/prefix (ex: "Aktiv", "Besok", "Bestand")
 */
export async function searchTermsByCategory(categoryPrefix: string): Promise<Term[]> {
  const terms = await loadTermsFromFile();
  const prefix = categoryPrefix.toLowerCase();

  return terms.filter(term => {
    const id = term['@id'].toLowerCase();
    return id.startsWith(prefix);
  });
}

/**
 * Söker termer baserat på nyckelord i beskrivning eller namn
 */
export async function searchTermsByKeyword(keyword: string): Promise<Term[]> {
  const terms = await loadTermsFromFile();
  const searchTerm = keyword.toLowerCase();

  return terms.filter(term => {
    const id = term['@id'].toLowerCase();

    const label = term.label
      ? (typeof term.label === 'object' ? term.label.sv || term.label['@value'] || '' : term.label)
      : '';
    const labelMatch = label.toLowerCase().includes(searchTerm);

    const comment = term.comment || '';
    const commentMatch = comment.toLowerCase().includes(searchTerm);

    return id.includes(searchTerm) || labelMatch || commentMatch;
  });
}

/**
 * Hämtar detaljer om en specifik term
 */
export async function getTermDetails(termId: string): Promise<Term | null> {
  const terms = await loadTermsFromFile();
  return terms.find(term => term['@id'] === termId) || null;
}

/**
 * Grupperar termer baserat på prefix (första bokstäverna före siffrorna)
 */
export async function getTermCategories(): Promise<Map<string, Term[]>> {
  const terms = await loadTermsFromFile();
  const categories = new Map<string, Term[]>();

  terms.forEach(term => {
    // Extrahera prefix (bokstäver före siffror)
    const match = term['@id'].match(/^([A-Za-z]+)/);
    if (match) {
      const prefix = match[1];
      if (!categories.has(prefix)) {
        categories.set(prefix, []);
      }
      categories.get(prefix)!.push(term);
    }
  });

  return categories;
}

/**
 * Hämtar alla tillgängliga kategorier (prefix)
 */
export async function listTermCategories(): Promise<string[]> {
  const categories = await getTermCategories();
  return Array.from(categories.keys()).sort();
}
