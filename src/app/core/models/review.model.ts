export interface Review {
  id: string;
  title: string;
  userScore: number;
  comment: string;
  username: string;
  likeCount: number;
}

export interface ReviewCreate {
  title: string;
  username: string;
  comment: string;
  userScore: number;
}

/** Risposta a una recensione: il thread e' piatto, non si risponde a una risposta. */
export interface ReviewReply {
  id: string;
  reviewId: string;
  username: string;
  comment: string;
  createdAt: string;
}
