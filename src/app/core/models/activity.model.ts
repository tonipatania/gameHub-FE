import type { Review } from './review.model';

export type ActivityType = 'WISHLIST_ADD' | 'REVIEW' | 'LIKE_REVIEW' | 'FOLLOW';

/** Versione ridotta di Game per le card del feed (niente descrizioni ne' recensioni). */
export interface ActivityGame {
  id: string;
  name: string;
  headerImage?: string;
  genres?: string;
  avgScore: number;
  price: number;
}

export interface ActivityItem {
  id: string;
  /** chi ha compiuto l'azione */
  username: string;
  type: ActivityType;
  gameName?: string;
  gameHeaderImage?: string;
  score?: number;
  createdAt: string;
  /** vero se successiva all'ultima volta in cui l'utente ha visto il feed */
  unseen: boolean;
  /** WISHLIST_ADD, REVIEW, LIKE_REVIEW */
  game?: ActivityGame;
  /** REVIEW e LIKE_REVIEW (per LIKE_REVIEW l'autore e' un altro utente) */
  review?: Review;
  /** FOLLOW: l'utente seguito e i suoi numeri */
  targetUsername?: string;
  targetWishlistCount?: number;
  targetFollowers?: number;
}

export interface TrendingReview {
  review: Review;
  gameHeaderImage?: string;
  /** like ricevuti nella finestra considerata, non il totale storico */
  recentLikes: number;
  windowHours: number;
}

export interface HotGame {
  game: ActivityGame;
  recentWishlistAdds: number;
}

export interface CommunityHighlights {
  trendingReviews: TrendingReview[];
  hotGames: HotGame[];
}
