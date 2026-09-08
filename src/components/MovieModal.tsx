import { useEffect, useState } from 'react';
import { Movie } from '../types';
import { MOVIE_CATEGORIES } from '../config';
import { posterUrl } from '../services/tmdb';
import { useMovies, useDebouncedSearch, useGenres } from '../hooks/useMovies';

interface MovieModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (movie: Movie) => void;
}

export default function MovieModal({ open, onClose, onSelect }: MovieModalProps) {
  const { results, loading, error, search, loadCategory, loadRecs } = useMovies();
  const genres = useGenres();
  const debounce = useDebouncedSearch(400);
  const [query, setQuery] = useState('');
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadCategory(MOVIE_CATEGORIES[0]);
      setActiveLabel(MOVIE_CATEGORIES[0].label);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) return;
    debounce(() => search(q));
  }, [query, open, debounce, search]);

  const handleCategory = (label: string) => {
    const cat = MOVIE_CATEGORIES.find((c) => c.label === label);
    if (!cat) return;
    setActiveLabel(label);
    loadCategory(cat);
  };

  const handleRecs = (label: string, params: Record<string, string>) => {
    setActiveLabel(label);
    loadRecs(params);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Elegir película" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel movie-modal">
        <div className="modal-header">
          <h2>Elegir película</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <input
          className="search-input"
          type="search"
          placeholder="Buscar película…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar película"
        />

        <div className="category-row">
          {MOVIE_CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              className={`chip ${activeLabel === cat.label && !query ? 'active' : ''}`}
              onClick={() => handleCategory(cat.label)}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
          <button className={`chip ${activeLabel === 'reco' ? 'active' : ''}`} onClick={() => handleRecs('reco', { with_genres: '27', sort_by: 'popularity.desc', 'vote_count.gte': '100' })}>
            🎃 Recomendaciones para esta noche
          </button>
          <button className={`chip ${activeLabel === 'clasicos' ? 'active' : ''}`} onClick={() => handleRecs('clasicos', { with_genres: '27', 'primary_release_date.lte': '1980-12-31', sort_by: 'vote_average.desc', 'vote_count.gte': '100' })}>
            🎃 Clásicos de Halloween
          </button>
        </div>

        {error && <p className="inline-error">👻 {error}</p>}
        {loading && <p className="loading-text">Cargando películas…</p>}

        {!loading && results.length === 0 && !error && (
          <p className="empty-movies">No encontramos películas. 👻</p>
        )}

        <div className="movie-results">
          {results.map((m) => (
            <div key={m.id} className="movie-card">
              {posterUrl(m.poster_path) ? (
                <img className="movie-poster" src={posterUrl(m.poster_path)!} alt={`Póster de ${m.title}`} loading="lazy" />
              ) : (
                <div className="movie-poster movie-poster-empty">🎬</div>
              )}
              <div className="movie-info">
                <div className="movie-title-line">
                  <span className="movie-title">{m.title}</span>
                  <span className="movie-year">{m.release_date?.slice(0, 4)}</span>
                </div>
                <div className="movie-sub">
                  <span className="movie-rating">⭐ {m.vote_average?.toFixed(1)}</span>
                  <span className="movie-genres">
                    {(m.genre_ids || []).slice(0, 3).map((id) => genres.get(id)).filter(Boolean).join(', ')}
                  </span>
                </div>
                <p className="movie-overview">{m.overview?.slice(0, 140)}{(m.overview?.length ?? 0) > 140 ? '…' : ''}</p>
                <button className="btn btn-primary movie-select" onClick={() => onSelect(m)}>
                  Seleccionar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
