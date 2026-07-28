export interface UserNeo4j {
  id: string;
  username: string;
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
  errorMessage: string;
  username: string | null;
  token: string | null;
  role: string | null;
}
