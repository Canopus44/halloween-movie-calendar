import { useEffect, useRef, useCallback, useState } from 'react';
import { CalendarEntry, Persona } from '../types';
import { HALLOWEEN_YEAR } from '../config';
import {
  fetchEntries,
  upsertEntry,
  subscribeToChanges,
  isSupabaseConfigured,
} from '../services/supabase';

const CACHE_KEY = 'hmc_cache';

function loadCache(): Map<string, CalendarEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return new Map();
    const arr = JSON.parse(raw) as CalendarEntry[];
    return new Map(arr.map((e) => [e.date_key, e]));
  } catch {
    return new Map();
  }
}

function saveCache(entries: Map<string, CalendarEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(entries.values())));
  } catch {
    /* ignore */
  }
}

export function useCalendar() {
  const [entries, setEntries] = useState<Map<string, CalendarEntry>>(() => loadCache());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [realtimeOnline, setRealtimeOnline] = useState(isSupabaseConfigured);
  const [demoMode, setDemoMode] = useState(!isSupabaseConfigured);
  const latestRef = useRef<Map<string, CalendarEntry>>(entries);

  const updateEntries = useCallback((updater: (prev: Map<string, CalendarEntry>) => Map<string, CalendarEntry>) => {
    setEntries((prev) => {
      const next = updater(new Map(prev));
      latestRef.current = next;
      saveCache(next);
      return next;
    });
  }, []);

  useEffect(() => {
    latestRef.current = entries;
  }, [entries]);

  const syncNow = useCallback(async () => {
    setError(null);
    try {
      const rows = await fetchEntries(HALLOWEEN_YEAR);
      const map = new Map(rows.map((e) => [e.date_key, e]));
      latestRef.current = map;
      setEntries(map);
      saveCache(map);
      setLastSynced(new Date());
      setRealtimeOnline(true);
      setDemoMode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo sincronizar');
      setRealtimeOnline(false);
      setDemoMode(true);
    }
  }, []);

  useEffect(() => {
    syncNow();
  }, [syncNow]);

  useEffect(() => {
    const unsubscribe = subscribeToChanges((entry) => {
      updateEntries((prev) => {
        const next = new Map(prev);
        next.set(entry.date_key, entry);
        return next;
      });
    });
    return unsubscribe;
  }, [updateEntries]);

  const saveEntry = useCallback(
    async (partial: Partial<CalendarEntry>) => {
      if (!partial.date_key) return;
      const current = latestRef.current.get(partial.date_key);
      const now = new Date().toISOString();
      const merged: CalendarEntry = {
        date_key: partial.date_key,
        day: partial.day ?? current?.day ?? parseInt(partial.date_key.slice(8), 10),
        year: partial.year ?? current?.year ?? HALLOWEEN_YEAR,
        movie_id: partial.movie_id ?? current?.movie_id ?? null,
        movie_title: partial.movie_title ?? current?.movie_title ?? null,
        movie_original_title: partial.movie_original_title ?? current?.movie_original_title ?? null,
        poster_path: partial.poster_path ?? current?.poster_path ?? null,
        backdrop_path: partial.backdrop_path ?? current?.backdrop_path ?? null,
        overview: partial.overview ?? current?.overview ?? null,
        release_date: partial.release_date ?? current?.release_date ?? null,
        vote_average: partial.vote_average ?? current?.vote_average ?? null,
        genres: partial.genres ?? current?.genres ?? null,
        watched: partial.watched ?? current?.watched ?? false,
        rating_p1: partial.rating_p1 !== undefined ? partial.rating_p1 : current?.rating_p1 ?? null,
        rating_p2: partial.rating_p2 !== undefined ? partial.rating_p2 : current?.rating_p2 ?? null,
        notes_p1: partial.notes_p1 !== undefined ? partial.notes_p1 : current?.notes_p1 ?? null,
        notes_p2: partial.notes_p2 !== undefined ? partial.notes_p2 : current?.notes_p2 ?? null,
        selected_by: partial.selected_by ?? current?.selected_by ?? null,
        updated_by: partial.updated_by ?? current?.updated_by ?? null,
        updated_at: now,
      };

      updateEntries((prev) => {
        const next = new Map(prev);
        next.set(merged.date_key, merged);
        return next;
      });

      if (isSupabaseConfigured) {
        try {
          await upsertEntry(merged);
          setRealtimeOnline(true);
          setDemoMode(false);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'No se pudo guardar');
          setRealtimeOnline(false);
          setDemoMode(true);
        }
      }
    },
    [updateEntries]
  );

  const markWatched = useCallback(
    (dateKey: string, watched: boolean, persona: Persona | null) => {
      return saveEntry({ date_key: dateKey, watched, updated_by: persona ?? null });
    },
    [saveEntry]
  );

  const setRating = useCallback(
    (dateKey: string, persona: Persona, value: number) => {
      const key = persona === 'p1' ? 'rating_p1' : 'rating_p2';
      return saveEntry({ date_key: dateKey, [key]: value, updated_by: persona } as Partial<CalendarEntry>);
    },
    [saveEntry]
  );

  const setNotes = useCallback(
    (dateKey: string, persona: Persona, text: string) => {
      const key = persona === 'p1' ? 'notes_p1' : 'notes_p2';
      return saveEntry({ date_key: dateKey, [key]: text, updated_by: persona } as Partial<CalendarEntry>);
    },
    [saveEntry]
  );

  const setMovie = useCallback(
    (day: number, movie: { id: number; title: string; original_title: string; poster_path: string | null; backdrop_path: string | null; overview: string; release_date: string; vote_average: number; genres: { id: number; name: string }[] }, persona: Persona | null) => {
      const dateKey = `${HALLOWEEN_YEAR}-10-${String(day).padStart(2, '0')}`;
      const genresStr = movie.genres?.map((g) => g.name).join(', ') || null;
      return saveEntry({
        date_key: dateKey,
        day,
        year: HALLOWEEN_YEAR,
        movie_id: movie.id,
        movie_title: movie.title,
        movie_original_title: movie.original_title,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        overview: movie.overview,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        genres: genresStr,
        selected_by: persona ?? null,
        updated_by: persona ?? null,
      });
    },
    [saveEntry]
  );

  return {
    entries,
    loading,
    error,
    lastSynced,
    realtimeOnline,
    demoMode,
    syncNow,
    saveEntry,
    markWatched,
    setRating,
    setNotes,
    setMovie,
  };
}
