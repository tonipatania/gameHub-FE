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
