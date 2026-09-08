export const HALLOWEEN_YEAR = 2026;

export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const GENRE_IDS = {
  HORROR: 27,
  THRILLER: 53,
  MYSTERY: 9648,
  FANTASY: 14,
  SCIENCE_FICTION: 878,
} as const;

export interface MovieCategory {
  label: string;
  emoji: string;
  params: Record<string, string>;
}

export const MOVIE_CATEGORIES: MovieCategory[] = [
  {
    label: 'Terror actual',
    emoji: '🔥',
    params: { with_genres: '27', 'vote_count.gte': '200', sort_by: 'popularity.desc' },
  },
  {
    label: 'Terror clásico',
    emoji: '🎃',
    params: {
      with_genres: '27',
      'primary_release_date.lte': '1999-12-31',
      sort_by: 'vote_average.desc',
      'vote_count.gte': '100',
    },
  },
  {
    label: '80s',
    emoji: '📼',
    params: {
      with_genres: '27',
      'primary_release_date.gte': '1980-01-01',
      'primary_release_date.lte': '1989-12-31',
      sort_by: 'vote_average.desc',
      'vote_count.gte': '80',
    },
  },
  {
    label: '90s',
    emoji: '📼',
    params: {
      with_genres: '27',
      'primary_release_date.gte': '1990-01-01',
      'primary_release_date.lte': '1999-12-31',
      sort_by: 'vote_average.desc',
      'vote_count.gte': '80',
    },
  },
  {
    label: '2000s',
    emoji: '📼',
    params: {
      with_genres: '27',
      'primary_release_date.gte': '2000-01-01',
      'primary_release_date.lte': '2009-12-31',
      sort_by: 'vote_average.desc',
      'vote_count.gte': '80',
    },
  },
  {
    label: 'Más populares',
    emoji: '👻',
    params: { with_genres: '27', sort_by: 'popularity.desc', 'vote_count.gte': '500' },
  },
  {
    label: 'Slasher',
    emoji: '🩸',
    params: { with_genres: '27,53', sort_by: 'popularity.desc', 'vote_count.gte': '100' },
  },
  {
    label: 'Vampiros',
    emoji: '🧛',
    params: { with_genres: '27', with_keywords: '', sort_by: 'popularity.desc', 'vote_count.gte': '100' },
  },
  {
    label: 'Zombies',
    emoji: '🧟',
    params: { with_genres: '27', with_keywords: '', sort_by: 'popularity.desc', 'vote_count.gte': '100' },
  },
  {
    label: 'Sobrenatural',
    emoji: '👹',
    params: { with_genres: '27,14', sort_by: 'popularity.desc', 'vote_count.gte': '100' },
  },
];

export const KEYWORD_QUERIES: Record<string, string> = {
  'Vampiros': 'vampire',
  'Zombies': 'zombie',
};
