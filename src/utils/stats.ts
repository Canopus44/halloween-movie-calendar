import { CalendarEntry, AppStats } from '../types';

export function computeStats(entries: Map<string, CalendarEntry>): AppStats {
  const all = Array.from(entries.values());
  const total = all.length || 31;
  const watched = all.filter((e) => e.watched).length;
  const pending = total - watched;

  const ratings = all
    .filter((e) => e.rating_p1 != null || e.rating_p2 != null)
    .map((e) => {
      const vals = [e.rating_p1, e.rating_p2].filter((v): v is number => v != null);
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    });

  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0;

  const progress = Math.round((watched / total) * 100);

  return { total, watched, pending, avgRating, progress };
}
