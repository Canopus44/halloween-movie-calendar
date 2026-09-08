import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarEntry, Persona } from '../types';
import { posterUrl, backdropUrl } from '../services/tmdb';
import { useModalA11y } from '../hooks/useModalA11y';
import { personaConfig } from '../config';

interface DayDetailModalProps {
  open: boolean;
  day: number;
  /** date_key of the opened day — scopes pending/last-saved notes per day. */
  dateKey: string;
  entry?: CalendarEntry;
  persona: Persona | null;
  onClose: () => void;
  onChangeMovie: () => void;
  onToggleWatched: (watched: boolean) => void | Promise<void>;
  onSetRating: (persona: Persona, value: number) => void | Promise<void>;
  /** Returns false when the write was rejected by the conflict guard. */
  onSetNotes: (persona: Persona, text: string) => boolean | Promise<boolean> | void;
  stale?: boolean;
  /** Inline conflict message to show (set by the parent after a rejected save). */
  saveConflict?: string | null;
  onResolveConflict?: () => void | Promise<void>;
}

type PersonaKey = 'p1' | 'p2';

const NOTES_FLUSH_DELAY = 600;

/** Resolve a stored persona id (selected_by/updated_by) to its display label,
 *  guarding against unknown legacy values. */
function storedPersonaLabel(id: string | null | undefined): string | null {
  if (id !== 'p1' && id !== 'p2') return null;
  return personaConfig(id).display;
}

export default function DayDetailModal({
  open,
  day,
  dateKey,
  entry,
  persona,
  onClose,
  onChangeMovie,
  onToggleWatched,
  onSetRating,
  onSetNotes,
  stale,
  saveConflict,
  onResolveConflict,
}: DayDetailModalProps) {
  const [notesP1, setNotesP1] = useState('');
  const [notesP2, setNotesP2] = useState('');

  // Latest props through refs so debounced/async flushes always use the current
  // baseline and handlers, never a stale closure from the scheduling render.
  const onSetNotesRef = useRef(onSetNotes);
  onSetNotesRef.current = onSetNotes;
  const openRef = useRef(open);
  openRef.current = open;
  const dateKeyRef = useRef(dateKey);
  dateKeyRef.current = dateKey;
  const entryRef = useRef(entry);
  entryRef.current = entry;

  const notesDraftRef = useRef<Record<PersonaKey, string>>({ p1: '', p2: '' });
  const flushTimerRef = useRef<Record<PersonaKey, ReturnType<typeof setTimeout> | null>>({
    p1: null,
    p2: null,
  });
  // Text currently being sent for each persona (null when idle). Used to drop
  // duplicate invocations of the same text; a NEWER draft passes through and is
  // serialized by useCalendar's per-date_key write queue.
  const notesSendingRef = useRef<Record<PersonaKey, string | null>>({ p1: null, p2: null });
  // Last confirmed server value per date_key/persona. A blur/close that did not
  // change a draft must not trigger a write (no server call, no updated_by churn).
  const lastSavedNotesRef = useRef<Map<string, Partial<Record<PersonaKey, string>>>>(new Map());
  // Texts rejected by the conflict guard per date_key/persona. They survive a
  // close + reopen so unsaved notes are never silently dropped.
  const pendingNotesRef = useRef<Map<string, Partial<Record<PersonaKey, string>>>>(new Map());
  const prevOpenRef = useRef(false);
  const prevConflictRef = useRef<string | null | undefined>(null);

  const clearTimer = useCallback((p: PersonaKey) => {
    if (flushTimerRef.current[p]) {
      clearTimeout(flushTimerRef.current[p]);
      flushTimerRef.current[p] = null;
    }
  }, []);

  /** Single funnel for every notes write (debounce fire, blur, close, movie
   *  switch, conflict-resend). Skips when the draft still equals the last
   *  confirmed server value or the text is already being sent; a genuinely new
   *  draft passes through and is ordered by useCalendar's per-date_key queue. */
  const flushPersona = useCallback(
    async (p: PersonaKey): Promise<boolean> => {
      // Defensive: no legitimate flush should fire while the modal is closed.
      if (!openRef.current) return true;
      clearTimer(p);
      const dayKey = dateKeyRef.current;
      const text = notesDraftRef.current[p];
      const saved = lastSavedNotesRef.current.get(dayKey)?.[p];
      if (text === saved) return true; // no edit since the last confirmed save
      if (notesSendingRef.current[p] === text) return true; // already sending it
      notesSendingRef.current[p] = text;
      try {
        const ok = await onSetNotesRef.current(p, text);
        if (ok === false) {
          // Conflict guard rejected the write: keep the text pending so a later
          // explicit resolve (or a reopen of the same day) can resend it.
          const pending = pendingNotesRef.current.get(dayKey) ?? {};
          pending[p] = text;
          pendingNotesRef.current.set(dayKey, pending);
          return false;
        }
        const savedBase = lastSavedNotesRef.current.get(dayKey) ?? {};
        savedBase[p] = text;
        lastSavedNotesRef.current.set(dayKey, savedBase);
        const pending = pendingNotesRef.current.get(dayKey);
        if (pending) {
          delete pending[p];
          if (Object.keys(pending).length === 0) pendingNotesRef.current.delete(dayKey);
        }
        return true;
      } finally {
        // Only clear when this is still the newest text being sent — a newer
        // flush may have taken over while this request was in flight.
        if (notesSendingRef.current[p] === text) notesSendingRef.current[p] = null;
      }
    },
    [clearTimer]
  );

  const scheduleNotesFlush = useCallback(
    (p: PersonaKey) => {
      clearTimer(p);
      flushTimerRef.current[p] = setTimeout(() => void flushPersona(p), NOTES_FLUSH_DELAY);
    },
    [clearTimer, flushPersona]
  );

  const handleNotesChange = useCallback(
    (p: PersonaKey, value: string) => {
      notesDraftRef.current[p] = value;
      if (p === 'p1') setNotesP1(value);
      else setNotesP2(value);
      scheduleNotesFlush(p);
    },
    [scheduleNotesFlush]
  );

  const flushBoth = useCallback(() => {
    void flushPersona('p1');
    void flushPersona('p2');
  }, [flushPersona]);

  const handleClose = useCallback(() => {
    // Flush any pending debounced notes before the day closes so the trailing
    // edit is not lost. Routes through flushPersona so a conflict-rejected text
    // is recorded as pending and survives a reopen.
    flushBoth();
    onClose();
  }, [flushBoth, onClose]);

  /** Change-movie closes this modal without going through handleClose: flush
   *  pending notes first so the parent cannot clear the conflict message and
   *  drop them. */
  const handleChangeMovie = useCallback(() => {
    flushBoth();
    onChangeMovie();
  }, [flushBoth, onChangeMovie]);

  const panelRef = useModalA11y(open, handleClose, 'textarea.notes-input, .detail-empty .btn-primary');

  // Open-session init: seed the drafts from the last confirmed entry, EXCEPT
  // when the same day still holds unsaved pending text from an earlier rejected
  // write — that text must survive a reopen so the user does not retype it.
  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      clearTimer('p1');
      clearTimer('p2');
      return;
    }
    if (prevOpenRef.current) return; // realtime updates while open must not clobber drafts
    prevOpenRef.current = true;

    const pending = pendingNotesRef.current.get(dateKey);
    const current = entryRef.current;
    const p1 = pending?.p1 !== undefined ? pending.p1 : (current?.notes_p1 ?? '');
    const p2 = pending?.p2 !== undefined ? pending.p2 : (current?.notes_p2 ?? '');
    notesDraftRef.current = { p1, p2 };
    setNotesP1(p1);
    setNotesP2(p2);
    // The freshly shown values are the server baseline for the personas that
    // have no pending text; blurring an untouched field must not rewrite them.
    const savedBase = lastSavedNotesRef.current.get(dateKey) ?? {};
    if (pending?.p1 === undefined) savedBase.p1 = p1;
    if (pending?.p2 === undefined) savedBase.p2 = p2;
    lastSavedNotesRef.current.set(dateKey, savedBase);
    prevConflictRef.current = saveConflict ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dateKey]);

  // After the parent resolves a conflict (message cleared while this day is
  // still open), resend the notes the guard had rejected. Guarded on `open` so
  // clearing the message while the modal is closed cannot fire into the wrong
  // context or drop pending text.
  useEffect(() => {
    const wasConflict = prevConflictRef.current;
    prevConflictRef.current = saveConflict ?? null;
    if (!open) return;
    if (wasConflict && !saveConflict) {
      flushBoth();
    }
  }, [saveConflict, open, flushBoth]);

  if (!open) return null;

  const poster = posterUrl(entry?.poster_path, 'w342');
  const backdrop = backdropUrl(entry?.backdrop_path, 'w780');
  const rating = (p: 'p1' | 'p2') => (p === 'p1' ? entry?.rating_p1 : entry?.rating_p2);

  const stars = (p: 'p1' | 'p2') => {
    const val = rating(p) ?? 0;
    return [1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        className={`star ${n <= val ? 'filled' : ''}`}
        onClick={() => onSetRating(p, n)}
        aria-label={`Calificar ${n} de 5`}
      >
        ★
      </button>
    ));
  };

  const selectedBy = storedPersonaLabel(entry?.selected_by);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Día ${day}`} onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal-panel detail-modal" ref={panelRef}>
        <div className="modal-header">
          <h2>Día {day} de Octubre</h2>
          <button className="btn btn-ghost" onClick={handleClose} aria-label="Cerrar">✕</button>
        </div>

        {saveConflict ? (
          <div className="banner banner-error">
            <span>⚠️ {saveConflict}</span>
            <button className="btn btn-ghost" onClick={() => onResolveConflict?.()}>
              Recargar y reintentar
            </button>
          </div>
        ) : (
          stale && (
            <div className="banner banner-error">
              ⚠️ Este día fue modificado por otra persona. Revisa antes de guardar cambios.
            </div>
          )
        )}

        {!entry?.movie_id ? (
          <div className="detail-empty">
            <p className="detail-empty-text">Sin película seleccionada todavía.</p>
            <button className="btn btn-primary" onClick={handleChangeMovie}>🎬 Elegir película</button>
          </div>
        ) : (
          <>
            {backdrop && <img className="detail-backdrop" src={backdrop} alt="" />}
            <div className="detail-body">
              {poster && <img className="detail-poster" src={poster} alt={`Póster de ${entry.movie_title}`} />}
              <div className="detail-info">
                <h3 className="detail-title">{entry.movie_title}</h3>
                <div className="detail-meta">
                  {entry.release_date && <span>{entry.release_date.slice(0, 4)}</span>}
                  {entry.genres && <span>{entry.genres}</span>}
                  {entry.vote_average != null && <span>⭐ {entry.vote_average.toFixed(1)}</span>}
                </div>
                {entry.overview && <p className="detail-overview">{entry.overview}</p>}
                <div className="detail-actions">
                  <button
                    className={`btn ${entry.watched ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => onToggleWatched(!entry.watched)}
                  >
                    {entry.watched ? 'Desmarcar como vista' : '✓ Marcar como vista'}
                  </button>
                  <button className="btn btn-ghost" onClick={handleChangeMovie}>
                    Cambiar película
                  </button>
                </div>
              </div>
            </div>

            <div className="rating-section">
              <div className="rating-block">
                <span className="rating-label">{personaConfig('p1').display}</span>
                <div className="stars">{stars('p1')}</div>
                <textarea
                  className="notes-input"
                  placeholder={`Notas de ${personaConfig('p1').name}…`}
                  value={notesP1}
                  onChange={(e) => handleNotesChange('p1', e.target.value)}
                  onBlur={() => void flushPersona('p1')}
                  rows={2}
                  aria-label={`Notas de ${personaConfig('p1').name}`}
                />
              </div>
              <div className="rating-block">
                <span className="rating-label">{personaConfig('p2').display}</span>
                <div className="stars">{stars('p2')}</div>
                <textarea
                  className="notes-input"
                  placeholder={`Notas de ${personaConfig('p2').name}…`}
                  value={notesP2}
                  onChange={(e) => handleNotesChange('p2', e.target.value)}
                  onBlur={() => void flushPersona('p2')}
                  rows={2}
                  aria-label={`Notas de ${personaConfig('p2').name}`}
                />
              </div>
            </div>
          </>
        )}

        <div className="detail-footer">
          {selectedBy && <span>Seleccionada por: {selectedBy}</span>}
          {entry?.updated_by && (
            <span>Actualizado por: {storedPersonaLabel(entry.updated_by) ?? entry.updated_by}</span>
          )}
          {entry?.updated_at && <span>Última actualización: {new Date(entry.updated_at).toLocaleString()}</span>}
          {persona && <span className="detail-you">Eres {personaConfig(persona).display}</span>}
        </div>
      </div>
    </div>
  );
}
