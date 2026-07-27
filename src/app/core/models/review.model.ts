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
