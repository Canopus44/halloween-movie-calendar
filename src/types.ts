export type Persona = 'p1' | 'p2';

export interface Movie {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  genres?: { id: number; name: string }[];
}

export interface CalendarEntry {
  date_key: string;
  day: number;
  year: number;
  movie_id: number | null;
  movie_title: string | null;
  movie_original_title: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  release_date: string | null;
  vote_average: number | null;
  genres: string | null;
  watched: boolean;
  rating_p1: number | null;
  rating_p2: number | null;
  notes_p1: string | null;
  notes_p2: string | null;
  selected_by: string | null;
  updated_by: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OctoberDay {
  dateKey: string;
  day: number;
}

export interface AppStats {
  total: number;
  watched: number;
  pending: number;
  avgRating: number;
  progress: number;
}
