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

export interface SaveResult {
  conflict: boolean;
  entry?: CalendarEntry;
}

/** User-meaningful fields saveEntry persists. A realtime echo of our own write
 *  matches these exactly; a foreign edit differs on at least one. Server-managed
 *  timestamps are excluded so column transforms never create false echoes. */
const ECHO_FIELDS: (keyof CalendarEntry)[] = [
  'date_key',
  'year',
  'day',
  'movie_id',
  'movie_title',
  'movie_original_title',
  'poster_path',
  'backdrop_path',
  'overview',
  'release_date',
  'vote_average',
  'genres',
  'watched',
  'rating_p1',
  'rating_p2',
  'notes_p1',
  'notes_p2',
  'selected_by',
  'updated_by',
];

/** Null-tolerant value comparison. Postgres may coerce numerics (int4 vs JS
 *  number) across the wire, so numeric twins count as equal. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a === 'number' || typeof b === 'number') {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  }
  return false;
}

/** True when the remote payload carries exactly the user content we last wrote
 *  for this day — an echo of our own upsert, not a foreign edit. */
function isEchoOfOwnWrite(own: CalendarEntry, remote: CalendarEntry): boolean {
  return ECHO_FIELDS.every((k) => sameValue(own[k], remote[k]));
}

/** lastFetchRef must never move backwards: it is the freshness watermark. */
function setServerUpdatedAt(map: Map<string, string>, dateKey: string, updatedAt: string) {
  if (!updatedAt) return;
  const cur = map.get(dateKey);
  if (!cur || updatedAt > cur) map.set(dateKey, updatedAt);
}

export function useCalendar() {
  const [entries, setEntries] = useState<Map<string, CalendarEntry>>(() => loadCache());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [realtimeOnline, setRealtimeOnline] = useState(isSupabaseConfigured);
  const [demoMode, setDemoMode] = useState(!isSupabaseConfigured);
  const latestRef = useRef<Map<string, CalendarEntry>>(entries);
  // Server-authoritative updated_at per date_key (from fetch / realtime / confirmed upsert).
  const lastFetchRef = useRef<Map<string, string>>(new Map());
  // Full row we last wrote per date_key — used to recognize realtime echoes of
  // our own saves by payload equality (a time window is unsafe: a foreign write
  // landing within ±2s of ours must not be swallowed).
  const ownLastSavedRef = useRef<Map<string, CalendarEntry>>(new Map());
  // Serializes network writes per date_key so two overlapping upserts from this
  // client cannot commit out of order on the server.
  const pendingWritesRef = useRef<Map<string, Promise<SaveResult>>>(new Map());

  // Compute the next map from the source-of-truth ref, then persist via effect —
  // no side effects inside the state updater.
  const updateEntries = useCallback((updater: (prev: Map<string, CalendarEntry>) => Map<string, CalendarEntry>) => {
    const next = updater(latestRef.current);
    latestRef.current = next;
    setEntries(next);
  }, []);

  useEffect(() => {
    saveCache(entries);
  }, [entries]);

  const syncNow = useCallback(async () => {
    setError(null);
    try {
      const rows = await fetchEntries(HALLOWEEN_YEAR);
      const map = new Map(rows.map((e) => [e.date_key, e]));
      latestRef.current = map;
      setEntries(map);
      lastFetchRef.current = new Map(rows.map((e) => [e.date_key, e.updated_at ?? '']));
      // Fresh authoritative state: no stale own-write markers survive a sync.
      ownLastSavedRef.current.clear();
      setLastSynced(new Date());
      setRealtimeOnline(true);
      setDemoMode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo sincronizar');
      setRealtimeOnline(false);
      setDemoMode(true);
    } finally {
      // Initial mount sync and every manual retry must clear the loading state.
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncNow();
  }, [syncNow]);

  useEffect(() => {
    const unsubscribe = subscribeToChanges((entry) => {
      const dateKey = entry.date_key;
      const ownWritten = ownLastSavedRef.current.get(dateKey);
      // Realtime echo of a save we just made ourselves: the exact payload we
      // wrote is already applied optimistically and the watermark advanced.
      // Do not treat it as a foreign edit.
      if (ownWritten && isEchoOfOwnWrite(ownWritten, entry)) {
        return;
      }
      // Genuine change from another client: forget our own-write marker so a
      // future write of ours is recognized again as ours, then merge and
      // advance the freshness watermark.
      ownLastSavedRef.current.delete(dateKey);
      setServerUpdatedAt(lastFetchRef.current, dateKey, entry.updated_at ?? '');
      updateEntries((prev) => {
        const next = new Map(prev);
        next.set(dateKey, entry);
        return next;
      });
    });
    return unsubscribe;
  }, [updateEntries]);

  const isStale = useCallback((dateKey: string, loadedUpdatedAt: string | null): boolean => {
    if (!loadedUpdatedAt) return false;
    const server = lastFetchRef.current.get(dateKey);
    return !!server && server > loadedUpdatedAt;
  }, []);

  /** Single network write attempt. The conflict guard runs here — at execution
   *  time, against the latest watermark — so writes queued behind our own saves
   *  are re-checked against reality instead of a stale enqueue-time snapshot. */
  const doSave = useCallback(
    async (partial: Partial<CalendarEntry>, loadedUpdatedAt?: string | null): Promise<SaveResult> => {
      if (!partial.date_key) return { conflict: false };
      const dateKey = partial.date_key;

      if (loadedUpdatedAt) {
        const server = lastFetchRef.current.get(dateKey);
        const ownWritten = ownLastSavedRef.current.get(dateKey);
        // A watermark newer than the caller baseline is only a conflict when a
        // foreign write caused it. If our own write is the one that advanced
        // the watermark (marker present and at least as new), queued sibling
        // writes from the same burst are legitimate, not conflicts.
        const ownWriteExplainsAdvance =
          !!ownWritten?.updated_at && !!server && server <= ownWritten.updated_at;
        if (server && server > loadedUpdatedAt && !ownWriteExplainsAdvance) {
          return { conflict: true };
        }
      }

      const current = latestRef.current.get(dateKey);
      const now = new Date().toISOString();
      const merged: CalendarEntry = {
        date_key: dateKey,
        day: partial.day ?? current?.day ?? parseInt(dateKey.slice(8), 10),
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
        // Remember the FULL row as ours BEFORE the write lands so a realtime
        // echo racing the HTTP response is still recognized as our own (and so
        // a foreign write is detected by payload difference, not timestamp).
        ownLastSavedRef.current.set(merged.date_key, merged);
        try {
          await upsertEntry(merged);
          setServerUpdatedAt(lastFetchRef.current, merged.date_key, merged.updated_at ?? '');
          setRealtimeOnline(true);
          setDemoMode(false);
        } catch (e) {
          ownLastSavedRef.current.delete(merged.date_key);
          setError(e instanceof Error ? e.message : 'No se pudo guardar');
          setRealtimeOnline(false);
          setDemoMode(true);
        }
      }

      return { conflict: false, entry: merged };
    },
    [updateEntries]
  );

  /** Serializes writes per date_key: each save chains onto the previous one so
   *  overlapping full-row upserts from this client cannot commit out of order. */
  const saveEntry = useCallback(
    (partial: Partial<CalendarEntry>, loadedUpdatedAt?: string | null): Promise<SaveResult> => {
      if (!partial.date_key) return Promise.resolve({ conflict: false });
      const dateKey = partial.date_key;

      const prev = pendingWritesRef.current.get(dateKey) ?? Promise.resolve({ conflict: false });
      const next = prev.then(
        () => doSave(partial, loadedUpdatedAt),
        () => doSave(partial, loadedUpdatedAt)
      );
      pendingWritesRef.current.set(dateKey, next);
      return next.finally(() => {
        if (pendingWritesRef.current.get(dateKey) === next) pendingWritesRef.current.delete(dateKey);
      });
    },
    [doSave]
  );

  const markWatched = useCallback(
    (dateKey: string, watched: boolean, persona: Persona | null, loadedUpdatedAt?: string | null) => {
      return saveEntry({ date_key: dateKey, watched, updated_by: persona ?? null }, loadedUpdatedAt);
    },
    [saveEntry]
  );

  const setRating = useCallback(
    (dateKey: string, persona: Persona, value: number, loadedUpdatedAt?: string | null) => {
      const key = persona === 'p1' ? 'rating_p1' : 'rating_p2';
      return saveEntry({ date_key: dateKey, [key]: value, updated_by: persona } as Partial<CalendarEntry>, loadedUpdatedAt);
    },
    [saveEntry]
  );

  const setNotes = useCallback(
    (dateKey: string, persona: Persona, text: string, loadedUpdatedAt?: string | null) => {
      const key = persona === 'p1' ? 'notes_p1' : 'notes_p2';
      return saveEntry({ date_key: dateKey, [key]: text, updated_by: persona } as Partial<CalendarEntry>, loadedUpdatedAt);
    },
    [saveEntry]
  );

  const setMovie = useCallback(
    (day: number, movie: { id: number; title: string; original_title: string; poster_path: string | null; backdrop_path: string | null; overview: string; release_date: string; vote_average: number; genres: { id: number; name: string }[] }, persona: Persona | null, loadedUpdatedAt?: string | null) => {
      const dateKey = `${HALLOWEEN_YEAR}-10-${String(day).padStart(2, '0')}`;
      const genresStr = movie.genres?.map((g) => g.name).join(', ') || null;
      return saveEntry(
        {
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
        },
        loadedUpdatedAt
      );
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
    isStale,
  };
}
