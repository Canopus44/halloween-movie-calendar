import { AppStats } from '../types';

interface StatsBarProps {
  stats: AppStats;
}

export default function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="stats-bar">
      <div className="stats-row">
        <span className="stat-item">🎬 {stats.total} películas</span>
        <span className="stat-item">✓ {stats.watched} vistas</span>
        <span className="stat-item">⏳ {stats.pending} pendientes</span>
        <span className="stat-item">⭐ {stats.avgRating.toFixed(1)}</span>
      </div>
      <div className="progress-block">
        <span className="progress-label">Progreso de Halloween</span>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuenow={stats.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso ${stats.progress}%`}
        >
          <div className="progress-fill" style={{ width: `${stats.progress}%` }} />
        </div>
        <span className="progress-value">{stats.progress}%</span>
      </div>
    </div>
  );
}
