import { Movie } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, KEYWORD_QUERIES, MovieCategory } from '../config';

const TOKEN = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN as string | undefined;
const LOCAL_GENRES_KEY = 'hmc_genres_cache';
const LOCAL_KEYWORD_PREFIX = 'hmc_kw_';

export function hasTmdbToken(): boolean {
  return Boolean(TOKEN);
}

export class TmdbError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'TmdbError';
    this.status = status;
  }
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!TOKEN) {
    throw new TmdbError('Configura el token de TMDB en .env.local');
  }
  const url = new URL(TMDB_BASE_URL + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  if (res.status === 429) {
    throw new TmdbError('TMDB está saturado. Espera un momento e inténtalo de nuevo.', 429);
  }
  if (!res.ok) {
    throw new TmdbError(`TMDB respondió con error ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export function posterUrl(path: string | null | undefined, size = 'w342'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function backdropUrl(path: string | null | undefined, size = 'w780'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export async function searchMovies(query: string): Promise<Movie[]> {
  if (!query.trim()) return [];
  const data = await tmdbFetch<{ results: Movie[] }>('/search/movie', {
    query: query.trim(),
    language: 'es-ES',
  });
  return data.results || [];
}

export async function getMovieDetails(id: number): Promise<Movie | null> {
  try {
    const data = await tmdbFetch<Movie>(`/movie/${id}`, { language: 'es-ES' });
    return data;
  } catch {
    return null;
  }
}

export async function discoverMovies(params: Record<string, string>): Promise<Movie[]> {
  const data = await tmdbFetch<{ results: Movie[] }>('/discover/movie', {
    language: 'es-ES',
    include_adult: 'false',
    ...params,
  });
  return data.results || [];
}

interface Genre {
  id: number;
  name: string;
}

let genresCache: Map<number, string> | null = null;

function loadGenresFromStorage(): Map<number, string> | null {
  try {
    const raw = localStorage.getItem(LOCAL_GENRES_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw) as Genre[];
    if (!Array.isArray(arr)) return null;
    return new Map(arr.map((g) => [g.id, g.name]));
  } catch {
    return null;
  }
}

export async function getGenres(): Promise<Map<number, string>> {
  if (genresCache) return genresCache;
  const stored = loadGenresFromStorage();
  if (stored) {
    genresCache = stored;
    return stored;
  }
  try {
    const data = await tmdbFetch<{ genres: Genre[] }>('/genre/movie/list', { language: 'es-ES' });
    const map = new Map(data.genres.map((g) => [g.id, g.name]));
    genresCache = map;
    try {
      localStorage.setItem(LOCAL_GENRES_KEY, JSON.stringify(data.genres));
    } catch {
      /* ignore storage errors */
    }
    return map;
  } catch {
    return new Map();
  }
}

interface Keyword {
  id: number;
  name: string;
}

export async function resolveKeywordId(name: string): Promise<number | null> {
  const cacheKey = LOCAL_KEYWORD_PREFIX + name;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const n = parseInt(cached, 10);
      if (!Number.isNaN(n)) return n;
    }
  } catch {
    /* ignore */
  }

  const query = KEYWORD_QUERIES[name] || name;
  try {
    const data = await tmdbFetch<{ results: Keyword[] }>('/search/keyword', { query });
    const match = (data.results || []).find((k) => k.name.toLowerCase() === query.toLowerCase()) || data.results?.[0];
    if (match) {
      try {
        localStorage.setItem(cacheKey, String(match.id));
      } catch {
        /* ignore */
      }
      return match.id;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function discoverCategory(category: MovieCategory): Promise<Movie[]> {
  const params = { ...category.params };
  if (params.with_keywords !== undefined) {
    if (params.with_keywords === '' && KEYWORD_QUERIES[category.label]) {
      const kwId = await resolveKeywordId(category.label);
      if (kwId) {
        params.with_keywords = String(kwId);
      } else {
        delete params.with_keywords;
      }
    } else {
      delete params.with_keywords;
    }
  }
  return discoverMovies(params);
}

const cache: Map<string, { data: Movie[]; ts: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export async function discoverMoviesCached(params: Record<string, string>): Promise<Movie[]> {
  const key = JSON.stringify(params);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  const data = await discoverMovies(params);
  cache.set(key, { data, ts: Date.now() });
  return data;
}
