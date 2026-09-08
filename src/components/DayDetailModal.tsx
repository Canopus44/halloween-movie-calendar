import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarEntry, Persona } from '../types';
import { posterUrl, backdropUrl } from '../services/tmdb';
import { useModalA11y } from '../hooks/useModalA11y';

interface DayDetailModalProps {
  open: boolean;
  day: number;
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

export default function DayDetailModal({
  open,
  day,
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
  const notesDraftRef = useRef<Record<PersonaKey, string>>({ p1: '', p2: '' });
  const flushTimerRef = useRef<Record<PersonaKey, ReturnType<typeof setTimeout> | null>>({
    p1: null,
    p2: null,
  });
  // Texts whose last flush was rejected by the conflict guard — resent once the
  // parent resolves the conflict and clears the message.
  const conflictPendingRef = useRef<Partial<Record<PersonaKey, string>>>({});
  const prevOpenRef = useRef(false);
  const prevConflictRef = useRef<string | null | undefined>(null);

  const handleClose = useCallback(() => {
    // Flush any pending debounced notes before the day closes, so the trailing
    // edit is not lost.
    if (flushTimerRef.current.p1) {
      const t = flushTimerRef.current.p1;
      flushTimerRef.current.p1 = null;
      clearTimeout(t);
      onSetNotesRef.current('p1', notesDraftRef.current.p1);
    }
    if (flushTimerRef.current.p2) {
      const t = flushTimerRef.current.p2;
      flushTimerRef.current.p2 = null;
      clearTimeout(t);
      onSetNotesRef.current('p2', notesDraftRef.current.p2);
    }
    onClose();
  }, [onClose]);

  const panelRef = useModalA11y(open, handleClose, 'textarea.notes-input, .detail-empty .btn-primary');

  // Initialize local note drafts when the modal opens (and only then, so
  // realtime updates while typing do not clobber the draft).
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const p1 = entry?.notes_p1 || '';
      const p2 = entry?.notes_p2 || '';
      notesDraftRef.current = { p1, p2 };
      setNotesP1(p1);
      setNotesP2(p2);
      conflictPendingRef.current = {};
      prevConflictRef.current = saveConflict ?? null;
    }
    prevOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const clearTimer = useCallback((p: PersonaKey) => {
    if (flushTimerRef.current[p]) {
      clearTimeout(flushTimerRef.current[p]);
      flushTimerRef.current[p] = null;
    }
  }, []);

  const flushNotes = useCallback(
    async (p: PersonaKey) => {
      clearTimer(p);
      const text = notesDraftRef.current[p];
      const ok = await onSetNotesRef.current(p, text);
      if (ok === false) conflictPendingRef.current[p] = text;
    },
    [clearTimer]
  );

  const flushNotesNow = useCallback(
    (p: PersonaKey) => {
      clearTimer(p);
      flushNotes(p);
    },
    [clearTimer, flushNotes]
  );

  const scheduleNotesFlush = useCallback(
    (p: PersonaKey) => {
      clearTimer(p);
      flushTimerRef.current[p] = setTimeout(() => flushNotes(p), NOTES_FLUSH_DELAY);
    },
    [clearTimer, flushNotes]
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

  // After the parent resolves a conflict (message cleared), resend the notes
  // that were rejected so the user does not have to retype them.
  useEffect(() => {
    const wasConflict = prevConflictRef.current;
    prevConflictRef.current = saveConflict ?? null;
    if (wasConflict && !saveConflict) {
      const pending = conflictPendingRef.current;
      conflictPendingRef.current = {};
      if (pending.p1 !== undefined) onSetNotesRef.current('p1', pending.p1);
      if (pending.p2 !== undefined) onSetNotesRef.current('p2', pending.p2);
    }
  }, [saveConflict]);

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

  const selectedBy = entry?.selected_by === 'p2' ? 'Persona 2' : entry?.selected_by === 'p1' ? 'Persona 1' : null;

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
            <button className="btn btn-primary" onClick={onChangeMovie}>🎬 Elegir película</button>
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
                  <button className="btn btn-ghost" onClick={onChangeMovie}>
                    Cambiar película
                  </button>
                </div>
              </div>
            </div>

            <div className="rating-section">
              <div className="rating-block">
                <span className="rating-label">🧙 Persona 1</span>
                <div className="stars">{stars('p1')}</div>
                <textarea
                  className="notes-input"
                  placeholder="Notas de Persona 1…"
                  value={notesP1}
                  onChange={(e) => handleNotesChange('p1', e.target.value)}
                  onBlur={() => flushNotesNow('p1')}
                  rows={2}
                  aria-label="Notas de Persona 1"
                />
              </div>
              <div className="rating-block">
                <span className="rating-label">🧛 Persona 2</span>
                <div className="stars">{stars('p2')}</div>
                <textarea
                  className="notes-input"
                  placeholder="Notas de Persona 2…"
                  value={notesP2}
                  onChange={(e) => handleNotesChange('p2', e.target.value)}
                  onBlur={() => flushNotesNow('p2')}
                  rows={2}
                  aria-label="Notas de Persona 2"
                />
              </div>
            </div>
          </>
        )}

        <div className="detail-footer">
          {selectedBy && <span>Seleccionada por: {selectedBy}</span>}
          {entry?.updated_by && <span>Actualizado por: {entry.updated_by === 'p1' ? 'Persona 1' : entry.updated_by === 'p2' ? 'Persona 2' : entry.updated_by}</span>}
          {entry?.updated_at && <span>Última actualización: {new Date(entry.updated_at).toLocaleString()}</span>}
          {persona && <span className="detail-you">Eres {persona === 'p1' ? 'Persona 1' : 'Persona 2'}</span>}
        </div>
      </div>
    </div>
  );
}
