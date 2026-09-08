import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Persona, Movie } from '../types';
import { buildOctoberDays } from '../utils/date';
import { computeStats } from '../utils/stats';
import { usePersona } from '../hooks/usePersona';
import { useCalendar, SaveResult } from '../hooks/useCalendar';
import PersonaPicker from '../components/PersonaPicker';
import StatsBar from '../components/StatsBar';
import FilterTabs, { FilterValue } from '../components/FilterTabs';
import SyncButton from '../components/SyncButton';
import CalendarGrid from '../components/CalendarGrid';
import MovieModal from '../components/MovieModal';
import DayDetailModal from '../components/DayDetailModal';
import Footer from '../components/Footer';

const CONFLICT_MESSAGE = 'Este día fue modificado por otra persona. Tus cambios no se guardaron.';

export default function CalendarPage() {
  const navigate = useNavigate();
  const { persona, setPersona, clearPersona, personaLabel } = usePersona();
  const calendar = useCalendar();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [movieModalDay, setMovieModalDay] = useState<number | null>(null);
  const [detailDay, setDetailDay] = useState<number | null>(null);
  const [detailLoadedAt, setDetailLoadedAt] = useState<string | null>(null);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const days = useMemo(() => buildOctoberDays(), []);
  const stats = useMemo(() => computeStats(calendar.entries), [calendar.entries]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await calendar.syncNow();
    } finally {
      setSyncing(false);
    }
  }, [calendar]);

  /** Await a save: on success advance the modal baseline so later saves of the
   *  same modal session are not mistaken for conflicts. On a genuine conflict,
   *  surface the message and leave the baseline untouched. */
  const runSave = useCallback(async (save: Promise<SaveResult>): Promise<boolean> => {
    const result = await save;
    if (result.conflict) {
      setConflictMsg(CONFLICT_MESSAGE);
      return false;
    }
    if (result.entry?.updated_at) setDetailLoadedAt(result.entry.updated_at);
    setConflictMsg(null);
    return true;
  }, []);

  const handleSelectMovie = useCallback(
    async (movie: Movie): Promise<boolean> => {
      if (movieModalDay == null) return true;
      const dateKey = days[movieModalDay - 1]?.dateKey;
      if (!dateKey) return true;
      const result = await calendar.setMovie(
        movieModalDay,
        { ...movie, genres: movie.genres ?? [] },
        persona,
        detailLoadedAt
      );
      if (result.conflict) return false; // keep MovieModal open with its message
      if (result.entry?.updated_at) setDetailLoadedAt(result.entry.updated_at);
      setMovieModalDay(null);
      return true;
    },
    [movieModalDay, days, persona, calendar, detailLoadedAt]
  );

  const handleToggleWatched = useCallback(
    async (watched: boolean) => {
      if (detailDay == null) return;
      const dateKey = `${days[detailDay - 1].dateKey}`;
      await runSave(calendar.markWatched(dateKey, watched, persona, detailLoadedAt));
    },
    [detailDay, days, persona, calendar, detailLoadedAt, runSave]
  );

  const handleSetRating = useCallback(
    async (p: Persona, value: number) => {
      if (detailDay == null) return;
      const dateKey = `${days[detailDay - 1].dateKey}`;
      await runSave(calendar.setRating(dateKey, p, value, detailLoadedAt));
    },
    [detailDay, days, persona, calendar, detailLoadedAt, runSave]
  );

  const handleSetNotes = useCallback(
    async (p: Persona, text: string): Promise<boolean> => {
      if (detailDay == null) return true;
      const dateKey = `${days[detailDay - 1].dateKey}`;
      return runSave(calendar.setNotes(dateKey, p, text, detailLoadedAt));
    },
    [detailDay, days, persona, calendar, detailLoadedAt, runSave]
  );

  const openDetail = useCallback(
    (day: number) => {
      const dateKey = days[day - 1]?.dateKey ?? '';
      setDetailLoadedAt(calendar.entries.get(dateKey)?.updated_at ?? null);
      setConflictMsg(null);
      setDetailDay(day);
    },
    [days, calendar.entries]
  );

  /** Re-capture the server baseline for the detail modal after a conflict. The
   *  realtime channel already merged the foreign version into entries. */
  const resolveConflict = useCallback(() => {
    if (detailDay == null) return;
    const dateKey = days[detailDay - 1]?.dateKey ?? '';
    setDetailLoadedAt(calendar.entries.get(dateKey)?.updated_at ?? null);
    setConflictMsg(null);
  }, [detailDay, days, calendar.entries]);

  const resolveMovieConflict = useCallback(() => {
    if (movieModalDay == null) return;
    const dateKey = days[movieModalDay - 1]?.dateKey;
    if (!dateKey) return;
    setDetailLoadedAt(calendar.entries.get(dateKey)?.updated_at ?? null);
  }, [movieModalDay, days, calendar.entries]);

  const detailEntry = detailDay != null ? calendar.entries.get(days[detailDay - 1]?.dateKey ?? '') : undefined;
  const detailDateKey = detailDay != null ? days[detailDay - 1]?.dateKey ?? '' : '';
  const stale = detailDay != null ? calendar.isStale(detailDateKey, detailLoadedAt) : false;

  return (
    <div className="calendar-page">
      <div className="starfield" aria-hidden="true" />
      <div className="container">
        <header className="page-header">
          <button className="page-title-btn" onClick={() => navigate('/')} aria-label="Volver al inicio">
            <h1>🎃 Halloween Movie Calendar</h1>
          </button>
          <div className="persona-area">
            {persona ? (
              <>
                <span className="persona-chip">Eres {personaLabel}</span>
                <button className="btn btn-ghost" onClick={() => setPickerOpen(true)}>
                  Cambiar usuario
                </button>
              </>
            ) : (
              <button className="btn btn-secondary" onClick={() => setPickerOpen(true)}>
                ¿Quién eres?
              </button>
            )}
          </div>
        </header>

        {calendar.demoMode && (
          <div className="banner">
            <span>⚠️ Modo demo (sin sincronización): configura Supabase para compartir el calendario.</span>
            <button className="btn btn-ghost" onClick={handleSync} disabled={syncing}>
              Reintentar
            </button>
          </div>
        )}

        {calendar.error && !calendar.demoMode && (
          <div className="banner banner-error">
            <span>⚠️ {calendar.error}</span>
            <button className="btn btn-ghost" onClick={handleSync} disabled={syncing}>
              Reintentar
            </button>
          </div>
        )}

        <SyncButton lastSynced={calendar.lastSynced} realtimeOnline={calendar.realtimeOnline} onSync={handleSync} syncing={syncing} />

        {calendar.loading ? (
          <p className="loading-text">Cargando calendario…</p>
        ) : (
          <>
            <StatsBar stats={stats} />
            <FilterTabs value={filter} onChange={setFilter} />
            <CalendarGrid days={days} entries={calendar.entries} filter={filter} onOpen={openDetail} />
          </>
        )}

        <Footer />
      </div>

      <PersonaPicker
        open={pickerOpen}
        current={persona}
        onSelect={(p) => {
          setPersona(p);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />

      <MovieModal
        open={movieModalDay != null}
        onClose={() => setMovieModalDay(null)}
        onSelect={handleSelectMovie}
        onReload={resolveMovieConflict}
      />

      <DayDetailModal
        open={detailDay != null}
        day={detailDay ?? 1}
        entry={detailEntry}
        persona={persona}
        stale={stale}
        saveConflict={conflictMsg}
        onResolveConflict={resolveConflict}
        onClose={() => setDetailDay(null)}
        onChangeMovie={() => {
          setConflictMsg(null);
          setDetailDay(null);
          setMovieModalDay(detailDay);
        }}
        onToggleWatched={handleToggleWatched}
        onSetRating={handleSetRating}
        onSetNotes={handleSetNotes}
      />
    </div>
  );
}
