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
