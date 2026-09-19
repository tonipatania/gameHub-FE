import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegistrationRequest } from '../models/user.model';

const STORAGE_KEY = 'gamehub_user';
const TOKEN_KEY = 'gamehub_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly currentUser = signal<string | null>(this.readStoredUser());

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        if (response.success && response.username && response.token) {
          this.setUser(response.username, response.token);
        }
      }),
    );
  }

  signup(data: RegistrationRequest): Observable<string> {
    return this.http.post(`${environment.apiUrl}/signup`, data, {
      responseType: 'text',
    });
  }

  confirmEmail(token: string): Observable<string> {
    return this.http.get(`${environment.apiUrl}/confirm-email`, {
      params: { token },
      responseType: 'text',
    });
  }

  logout(): void {
    const token = this.getToken();
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
    this.currentUser.set(null);
    this.router.navigate(['/login']);

    if (token) {
      // Il logout locale e' gia' completo (utente reindirizzato, sessione pulita): la revoca sul
      // server e' un tentativo "best effort" che non deve bloccare l'uscita se la rete o il
      // backend hanno un problema. L'header va passato esplicitamente qui perche' getToken() ora
      // restituisce gia' null (l'interceptor non lo aggiungerebbe piu' da solo).
      this.http
        .post(`${environment.apiUrl}/logout`, null, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .subscribe({ error: () => undefined });
    }
  }

  isLoggedIn(): boolean {
    return !!this.currentUser();
  }

  getUsername(): string | null {
    return this.currentUser();
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return sessionStorage.getItem(TOKEN_KEY);
  }

  updateUsername(username: string): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(STORAGE_KEY, username);
    }
    this.currentUser.set(username);
  }

  private setUser(username: string, token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(STORAGE_KEY, username);
      sessionStorage.setItem(TOKEN_KEY, token);
    }
    this.currentUser.set(username);
  }

  private readStoredUser(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return sessionStorage.getItem(STORAGE_KEY);
  }
}
