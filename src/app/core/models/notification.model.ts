export type NotificationType = 'FOLLOW' | 'LIKE_REVIEW' | 'REPLY_REVIEW';

/** Una notifica per l'utente autenticato: qualcuno ha fatto qualcosa che lo riguarda. */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  /** chi ha compiuto l'azione (ti segue, ha messo like, ha risposto) */
  actor: string;
  /** gioco della recensione: assente per FOLLOW */
  gameName?: string;
  /** recensione coinvolta: assente per FOLLOW */
  reviewId?: string;
  /** anteprima della recensione (LIKE_REVIEW) o della risposta (REPLY_REVIEW) */
  excerpt?: string;
  read: boolean;
  createdAt: string;
  /** solo FOLLOW: vero se l'utente segue gia' l'autore */
  followingBack?: boolean;
}
