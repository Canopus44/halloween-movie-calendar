import { useCallback, useEffect, useRef, useState } from 'react';
import { Movie } from '../types';
import { MOVIE_CATEGORIES, MovieCategory } from '../config';
import { posterUrl } from '../services/tmdb';
import { useMovies, useDebouncedSearch, useGenres } from '../hooks/useMovies';
import { useModalA11y } from '../hooks/useModalA11y';

interface MovieModalProps {
  open: boolean;
  onClose: () => void;
  /** Returns false when the save was rejected because another person edited the day first. */
  onSelect: (movie: Movie) => Promise<boolean> | boolean | void;
  /** Re-captures the server baseline for the day being edited, offered after a conflict. */
  onReload?: () => Promise<void> | void;
}

export default function MovieModal({ open, onClose, onSelect, onReload }: MovieModalProps) {
  const { results, loading, error, search, loadCategory, loadRecs } = useMovies();
  const genres = useGenres();
  const { debounce, cancel } = useDebouncedSearch(400);
  const panelRef = useModalA11y(open, onClose, 'input[type=search]');
  const [query, setQuery] = useState('');
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<MovieCategory | null>(null);
  const [activeRecsParams, setActiveRecsParams] = useState<Record<string, string> | null>(null);
  const [selectError, setSelectError] = useState(false);
  const wasSearching = useRef(false);

  useEffect(() => {
    if (open) {
      const first = MOVIE_CATEGORIES[0];
      setActiveCat(first);
      setActiveRecsParams(null);
      setActiveLabel(first.label);
      loadCategory(first);
      setSelectError(false);
    }
  }, [open, loadCategory]);

  const reloadActive = useCallback(() => {
    if (activeCat) {
      loadCategory(activeCat);
    } else if (activeRecsParams) {
      loadRecs(activeRecsParams);
    }
  }, [activeCat, activeRecsParams, loadCategory, loadRecs]);

  useEffect(() => {
    if (!open) {
      // Drop any pending search scheduled before the modal closed.
      cancel();
      return;
    }
    const q = query.trim();
    if (!q) {
      // Clearing the input must also cancel a pending debounced search, or the
      // ghost query would fire and replace the category results.
      cancel();
      if (wasSearching.current) {
        wasSearching.current = false;
        reloadActive();
      }
      return;
    }
    wasSearching.current = true;
    debounce(() => search(q));
  }, [query, open, debounce, cancel, search, reloadActive]);

  const handleCategory = (label: string) => {
    const cat = MOVIE_CATEGORIES.find((c) => c.label === label);
    if (!cat) return;
    setSelectError(false);
    setActiveLabel(label);
    setActiveCat(cat);
    setActiveRecsParams(null);
    loadCategory(cat);
  };

  const handleRecs = (label: string, params: Record<string, string>) => {
    setSelectError(false);
    setActiveLabel(label);
    setActiveCat(null);
    setActiveRecsParams(params);
    loadRecs(params);
  };

  const handleSelectClick = async (movie: Movie) => {
    const ok = await onSelect(movie);
    if (ok === false) setSelectError(true);
  };

  const handleReload = async () => {
    await onReload?.();
    setSelectError(false);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Elegir película" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel movie-modal" ref={panelRef}>
        <div className="modal-header">
          <h2>Elegir película</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {selectError && (
          <div className="banner banner-error">
            <span>⚠️ Este día fue modificado por otra persona. Tus cambios no se guardaron.</span>
            <button className="btn btn-ghost" onClick={handleReload}>
              Recargar y reintentar
            </button>
          </div>
        )}

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
                <button className="btn btn-primary movie-select" onClick={() => handleSelectClick(m)}>
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
