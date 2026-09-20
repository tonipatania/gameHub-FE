import type { Review } from './review.model';

export interface GameUrl {
  website?: string;
  headerImage?: string;
  supportUrl?: string;
  supportEmaill?: string;
  screenshots?: string;
}

export interface Game {
  id: string;
  name: string;
  genres?: string;
  releaseDate?: string;
  avgScore?: number;
  price?: number;
  aboutTheGame?: string;
  supportedLanguages?: string;
  developers?: string;
  publishers?: string;
  categories?: string;
  url?: GameUrl;
  reviews?: Review[];
}

/** Gli "scaffali" della pagina Giochi: liste gia' ordinate dal backend, con game leggeri. */
export interface GameRails {
  /** in movimento negli ultimi 7 giorni (completato con i piu' desiderati) */
  weekly: Game[];
  /** molto desiderati e con un voto alto */
  favorites: Game[];
  /** le uscite piu' recenti */
  latest: Game[];
}

export interface GameNeo4j {
  id: string;
  name: string;
}

export interface GameSearchFilter {
  name?: string;
  genres?: string[];
  avgScore?: number;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
