export type ActivityType = 'WISHLIST_ADD' | 'REVIEW';

export interface ActivityItem {
  username: string;
  type: ActivityType;
  gameName: string;
  gameHeaderImage?: string;
  score?: number;
  createdAt: string;
}
