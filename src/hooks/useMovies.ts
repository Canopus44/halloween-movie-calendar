import { useEffect, useRef, useState, useCallback } from 'react';
import { Movie } from '../types';
import { MovieCategory } from '../config';
import {
  searchMovies,
  discoverMoviesCached,
  discoverCategory,
  getGenres,
} from '../services/tmdb';

export function useMovies() {
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const movies = await searchMovies(query);
      if (id !== requestId.current) return;
      setResults(movies);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof Error ? e.message : 'Error de búsqueda');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  const loadCategory = useCallback(async (category: MovieCategory) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const movies = await discoverCategory(category);
      if (id !== requestId.current) return;
      setResults(movies);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof Error ? e.message : 'Error al cargar películas');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  const loadRecs = useCallback(
    async (params: Record<string, string>) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const movies = await discoverMoviesCached(params);
        if (id !== requestId.current) return;
        setResults(movies);
      } catch (e) {
        if (id !== requestId.current) return;
        setError(e instanceof Error ? e.message : 'Error al cargar recomendaciones');
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    []
  );

  return { results, loading, error, search, loadCategory, loadRecs };
}

export function useGenres() {
  const [genres, setGenres] = useState<Map<number, string>>(new Map());
  useEffect(() => {
    getGenres().then(setGenres).catch(() => {});
  }, []);
  return genres;
}

export function useDebouncedSearch(delay = 400) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounce = useCallback(
    (fn: () => void) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(fn, delay);
    },
    [delay]
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return debounce;
}
