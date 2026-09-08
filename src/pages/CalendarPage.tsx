import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Persona, Movie } from '../types';
import { buildOctoberDays } from '../utils/date';
import { computeStats } from '../utils/stats';
import { usePersona } from '../hooks/usePersona';
import { useCalendar } from '../hooks/useCalendar';
import PersonaPicker from '../components/PersonaPicker';
import StatsBar from '../components/StatsBar';
import FilterTabs, { FilterValue } from '../components/FilterTabs';
import SyncButton from '../components/SyncButton';
import CalendarGrid from '../components/CalendarGrid';
import MovieModal from '../components/MovieModal';
import DayDetailModal from '../components/DayDetailModal';
import Footer from '../components/Footer';

export default function CalendarPage() {
  const navigate = useNavigate();
  const { persona, setPersona, clearPersona, personaLabel } = usePersona();
  const calendar = useCalendar();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [movieModalDay, setMovieModalDay] = useState<number | null>(null);
  const [detailDay, setDetailDay] = useState<number | null>(null);
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

  const handleSelectMovie = useCallback(
    (movie: Movie) => {
      if (movieModalDay != null) {
        calendar.setMovie(movieModalDay, { ...movie, genres: movie.genres ?? [] }, persona);
      }
      setMovieModalDay(null);
    },
    [movieModalDay, persona, calendar]
  );

  const handleToggleWatched = useCallback(
    (watched: boolean) => {
      if (detailDay == null) return;
      const dateKey = `${days[detailDay - 1].dateKey}`;
      calendar.markWatched(dateKey, watched, persona);
    },
    [detailDay, days, persona, calendar]
  );

  const handleSetRating = useCallback(
    (p: Persona, value: number) => {
      if (detailDay == null) return;
      const dateKey = `${days[detailDay - 1].dateKey}`;
      calendar.setRating(dateKey, p, value);
    },
    [detailDay, days, persona, calendar]
  );

  const handleSetNotes = useCallback(
    (p: Persona, text: string) => {
      if (detailDay == null) return;
      const dateKey = `${days[detailDay - 1].dateKey}`;
      calendar.setNotes(dateKey, p, text);
    },
    [detailDay, days, persona, calendar]
  );

  const detailEntry = detailDay != null ? calendar.entries.get(days[detailDay - 1]?.dateKey ?? '') : undefined;

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
            <CalendarGrid days={days} entries={calendar.entries} filter={filter} onOpen={setDetailDay} />
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

      <MovieModal open={movieModalDay != null} onClose={() => setMovieModalDay(null)} onSelect={handleSelectMovie} />

      <DayDetailModal
        open={detailDay != null}
        day={detailDay ?? 1}
        entry={detailEntry}
        persona={persona}
        onClose={() => setDetailDay(null)}
        onChangeMovie={() => {
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