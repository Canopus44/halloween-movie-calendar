import { CalendarEntry, OctoberDay } from '../types';
import { posterUrl } from '../services/tmdb';
import { isToday } from '../utils/date';

interface DayCardProps {
  day: OctoberDay;
  entry?: CalendarEntry;
  onOpen: (day: number) => void;
}

export default function DayCard({ day, entry, onOpen }: DayCardProps) {
  const poster = posterUrl(entry?.poster_path, 'w342');
  const today = isToday(day.dateKey);
  const selectedBy = entry?.selected_by === 'p2' ? 'Persona 2' : entry?.selected_by === 'p1' ? 'Persona 1' : null;

  return (
    <button className={`day-card ${entry?.watched ? 'watched' : ''}`} onClick={() => onOpen(day.day)} aria-label={`Día ${day.day}${entry?.movie_title ? ', ' + entry.movie_title : ''}`}>
      <div className="day-card-top">
        <span className="day-number">Día {day.day}</span>
        {today && <span className="day-today">Hoy</span>}
      </div>

      {entry?.movie_id ? (
        <>
          {poster ? (
            <img className="day-poster" src={poster} alt={`Póster de ${entry.movie_title}`} loading="lazy" />
          ) : (
            <div className="day-poster day-poster-empty">🎬</div>
          )}
          <div className="day-meta">
            <span className="day-title">{entry.movie_title}</span>
            <span className="day-year">{entry.release_date?.slice(0, 4)}</span>
          </div>
          <div className="day-badges">
            <span className={`badge ${entry.watched ? 'badge-watched' : 'badge-pending'}`}>
              {entry.watched ? '✓ Vista' : '○ Pendiente'}
            </span>
            {entry.rating_p1 || entry.rating_p2 ? (
              <span className="badge badge-rating">
                ⭐ {(entry.rating_p1 ?? 0) + (entry.rating_p2 ?? 0) > 0
                  ? (([entry.rating_p1, entry.rating_p2].filter((v): v is number => v != null).reduce((a, b) => a + b, 0) /
                      [entry.rating_p1, entry.rating_p2].filter((v): v is number => v != null).length).toFixed(1))
                  : '0'}
              </span>
            ) : null}
          </div>
          {selectedBy && <span className="day-selected">Seleccionada por: {selectedBy}</span>}
        </>
      ) : (
        <div className="day-empty">
          <span className="day-empty-icon">👻</span>
          <span className="day-empty-text">Sin película seleccionada</span>
          <span className="day-empty-cta">+ Elegir película</span>
        </div>
      )}
    </button>
  );
}
