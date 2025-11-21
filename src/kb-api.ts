/**
 * API-klient för Kungliga Bibliotekets öppna biblioteksstatistik
 *
 * API-dokumentation: https://bibstat.kb.se/
 * Format: JSON-LD
 * Licens: CC0
 */

const KB_BIBSTAT_BASE_URL = 'https://bibstat.kb.se';

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
  '@type': string;
  key?: string;
  label?: any;
  description?: any;
  category?: string;
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

  if (term.key) parts.push(`Nyckel: ${term.key}`);

  if (term.label) {
    const label = typeof term.label === 'object' ? term.label.sv || term.label['@value'] : term.label;
    parts.push(`Namn: ${label}`);
  }

  if (term.description) {
    const desc = typeof term.description === 'object' ? term.description.sv || term.description['@value'] : term.description;
    parts.push(`Beskrivning: ${desc}`);
  }

  if (term.category) parts.push(`Kategori: ${term.category}`);

  return parts.join(' | ');
}
