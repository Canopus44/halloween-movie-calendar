import { useEffect, useState } from 'react';
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
  onToggleWatched: (watched: boolean) => void;
  onSetRating: (persona: Persona, value: number) => void;
  onSetNotes: (persona: Persona, text: string) => void;
  stale?: boolean;
}

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
}: DayDetailModalProps) {
  const [notesP1, setNotesP1] = useState('');
  const [notesP2, setNotesP2] = useState('');
  const panelRef = useModalA11y(open, onClose);

  useEffect(() => {
    if (open) {
      setNotesP1(entry?.notes_p1 || '');
      setNotesP2(entry?.notes_p2 || '');
    }
  }, [open, entry?.notes_p1, entry?.notes_p2]);

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
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Día ${day}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel detail-modal" ref={panelRef}>
        <div className="modal-header">
          <h2>Día {day} de Octubre</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {stale && (
          <div className="banner banner-error">
            ⚠️ Este día fue modificado por otra persona. Revisa antes de guardar cambios.
          </div>
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
                  onChange={(e) => {
                    setNotesP1(e.target.value);
                    onSetNotes('p1', e.target.value);
                  }}
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
                  onChange={(e) => {
                    setNotesP2(e.target.value);
                    onSetNotes('p2', e.target.value);
                  }}
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
