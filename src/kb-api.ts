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
  published?: string;
  targetGroup?: string;
  [key: string]: any;
}

export interface Library {
  '@id': string;
  name?: string;
  sigel?: string;
  municipality?: string;
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

/**
 * Hämtar observationer för ett specifikt bibliotek
 */
export async function getLibraryObservations(
  libraryId: string,
  year?: number,
  termFilter?: string
): Promise<Observation[]> {
  const params: ObservationQueryParams = {
    limit: 1000,
  };

  if (termFilter) {
    params.term = termFilter;
  }

  const data = await fetchObservations(params);
  const observations = data['@graph'] || [];

  // Filtrera baserat på bibliotek och år
  return observations.filter(obs => {
    const libMatch = obs.library &&
      (typeof obs.library === 'string' ? obs.library.includes(libraryId) : obs.library['@id']?.includes(libraryId));

    const yearMatch = year ? obs.sampleYear === year : true;

    return libMatch && yearMatch;
  });
}

/**
 * Hämtar observationer för ett specifikt år
 */
export async function getObservationsByYear(
  year: number,
  termFilter?: string,
  limit: number = 1000
): Promise<Observation[]> {
  const params: ObservationQueryParams = {
    limit,
  };

  if (termFilter) {
    params.term = termFilter;
  }

  const data = await fetchObservations(params);
  const observations = data['@graph'] || [];

  return observations.filter(obs => obs.sampleYear === year);
}

/**
 * Jämför ett biblioteks data mellan två år
 */
export async function compareLibraryYears(
  libraryId: string,
  year1: number,
  year2: number,
  termFilter?: string
): Promise<{
  year1Data: Observation[];
  year2Data: Observation[];
  comparison: Array<{
    term: string;
    year1Value: any;
    year2Value: any;
    change?: number;
    percentChange?: number;
  }>;
}> {
  const year1Data = await getLibraryObservations(libraryId, year1, termFilter);
  const year2Data = await getLibraryObservations(libraryId, year2, termFilter);

  // Skapa jämförelsedata
  const comparison: Array<{
    term: string;
    year1Value: any;
    year2Value: any;
    change?: number;
    percentChange?: number;
  }> = [];

  const termsMap = new Map<string, { year1?: any; year2?: any }>();

  year1Data.forEach(obs => {
    if (obs.term) {
      termsMap.set(obs.term, { year1: obs.value });
    }
  });

  year2Data.forEach(obs => {
    if (obs.term) {
      const existing = termsMap.get(obs.term) || {};
      termsMap.set(obs.term, { ...existing, year2: obs.value });
    }
  });

  termsMap.forEach((values, term) => {
    const comparisonItem: any = {
      term,
      year1Value: values.year1,
      year2Value: values.year2,
    };

    // Beräkna förändring om båda värdena är numeriska
    if (typeof values.year1 === 'number' && typeof values.year2 === 'number') {
      comparisonItem.change = values.year2 - values.year1;
      if (values.year1 !== 0) {
        comparisonItem.percentChange = ((values.year2 - values.year1) / values.year1) * 100;
      }
    }

    comparison.push(comparisonItem);
  });

  return {
    year1Data,
    year2Data,
    comparison,
  };
}

/**
 * Hämtar observationer för flera termer samtidigt
 */
export async function getMultipleTerms(
  termIds: string[],
  year?: number,
  limit: number = 1000
): Promise<Map<string, Observation[]>> {
  const result = new Map<string, Observation[]>();

  for (const termId of termIds) {
    const params: ObservationQueryParams = {
      term: termId,
      limit,
    };

    const data = await fetchObservations(params);
    let observations = data['@graph'] || [];

    if (year) {
      observations = observations.filter(obs => obs.sampleYear === year);
    }

    result.set(termId, observations);
  }

  return result;
}

/**
 * Aggregerar statistik för en term över flera år
 */
export async function getTermTrend(
  termId: string,
  startYear: number,
  endYear: number
): Promise<{
  term: string;
  years: number[];
  statistics: Array<{
    year: number;
    count: number;
    sum?: number;
    average?: number;
    min?: number;
    max?: number;
  }>;
}> {
  const params: ObservationQueryParams = {
    term: termId,
    limit: 5000,
  };

  const data = await fetchObservations(params);
  const observations = data['@graph'] || [];

  // Filtrera och gruppera per år
  const yearMap = new Map<number, number[]>();

  observations.forEach(obs => {
    if (obs.sampleYear && obs.sampleYear >= startYear && obs.sampleYear <= endYear) {
      if (typeof obs.value === 'number') {
        if (!yearMap.has(obs.sampleYear)) {
          yearMap.set(obs.sampleYear, []);
        }
        yearMap.get(obs.sampleYear)!.push(obs.value);
      }
    }
  });

  const years = Array.from(yearMap.keys()).sort();
  const statistics = years.map(year => {
    const values = yearMap.get(year) || [];
    const sum = values.reduce((a, b) => a + b, 0);
    const average = values.length > 0 ? sum / values.length : undefined;
    const min = values.length > 0 ? Math.min(...values) : undefined;
    const max = values.length > 0 ? Math.max(...values) : undefined;

    return {
      year,
      count: values.length,
      sum,
      average,
      min,
      max,
    };
  });

  return {
    term: termId,
    years,
    statistics,
  };
}

/**
 * Listar unika bibliotek från observationer
 */
export async function listLibraries(limit: number = 1000): Promise<Library[]> {
  const params: ObservationQueryParams = { limit };
  const data = await fetchObservations(params);
  const observations = data['@graph'] || [];

  const librariesMap = new Map<string, Library>();

  observations.forEach(obs => {
    if (obs.library) {
      const lib = typeof obs.library === 'object' ? obs.library : { '@id': obs.library };
      const id = lib['@id'] || lib.toString();

      if (!librariesMap.has(id)) {
        librariesMap.set(id, {
          '@id': id,
          name: lib.name,
          sigel: lib.sigel,
          municipality: lib.municipality,
        });
      }
    }
  });

  return Array.from(librariesMap.values());
}

/**
 * Söker bibliotek baserat på namn eller sigel
 */
export async function searchLibraries(searchTerm: string): Promise<Library[]> {
  const libraries = await listLibraries(2000);
  const search = searchTerm.toLowerCase();

  return libraries.filter(lib => {
    const name = (lib.name || '').toLowerCase();
    const sigel = (lib.sigel || '').toLowerCase();
    const id = lib['@id'].toLowerCase();

    return name.includes(search) || sigel.includes(search) || id.includes(search);
  });
}

/**
 * Hämtar tillgängliga år i statistiken
 */
export async function getAvailableYears(limit: number = 2000): Promise<number[]> {
  const params: ObservationQueryParams = { limit };
  const data = await fetchObservations(params);
  const observations = data['@graph'] || [];

  const years = new Set<number>();
  observations.forEach(obs => {
    if (obs.sampleYear) {
      years.add(obs.sampleYear);
    }
  });

  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Formaterar jämförelsedata till läsbar text
 */
export function formatComparison(comparison: Array<{
  term: string;
  year1Value: any;
  year2Value: any;
  change?: number;
  percentChange?: number;
}>): string {
  let output = '';

  comparison.forEach(item => {
    output += `**${item.term}**\n`;
    output += `  År 1: ${item.year1Value !== undefined ? item.year1Value : 'N/A'}\n`;
    output += `  År 2: ${item.year2Value !== undefined ? item.year2Value : 'N/A'}\n`;

    if (item.change !== undefined) {
      const changeSymbol = item.change >= 0 ? '+' : '';
      output += `  Förändring: ${changeSymbol}${item.change.toFixed(2)}`;

      if (item.percentChange !== undefined) {
        output += ` (${changeSymbol}${item.percentChange.toFixed(1)}%)`;
      }
      output += '\n';
    }
    output += '\n';
  });

  return output;
}
