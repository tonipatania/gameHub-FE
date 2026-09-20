export interface UserNeo4j {
  id: string;
  username: string;
}

/** Motivo per cui il backend suggerisce un utente (cascata in UserNeo4jService). */
export type SuggestionReason = 'COMMON_FRIENDS' | 'SIMILAR_TASTES' | 'POPULAR';

export interface SuggestedUser extends UserNeo4j {
  reason?: SuggestionReason;
  commonGames?: number | null;
  followers?: number | null;
}

/** Quale elenco della pagina Community: chi seguo, chi mi segue, chi ci segue a vicenda. */
export type ConnectionType = 'following' | 'followers' | 'mutual';

export interface Connection extends UserNeo4j {
  /** ci si segue a vicenda */
  mutual: boolean;
}

export interface ConnectionStats {
  following: number;
  followers: number;
  mutual: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegistrationRequest {
  name: string;
  surname: string;
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  errorMessage: string | null;
  errorCode: string | null;
  username: string | null;
  token: string | null;
  role: string | null;
}
