import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  LoginRequest,
  RegistrationRequest,
} from '../models/user.model';

const STORAGE_KEY = 'gamehub_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly currentUser = signal<string | null>(this.readStoredUser());

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/login`, credentials)
      .pipe(
        tap((response) => {
          if (response.success && response.username) {
            this.setUser(response.username);
          }
        }),
      );
  }

  signup(data: RegistrationRequest): Observable<string> {
    return this.http.post(`${environment.apiUrl}/signup`, data, {
      responseType: 'text',
    });
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.currentUser();
  }

  getUsername(): string | null {
    return this.currentUser();
  }

  updateUsername(username: string): void {
    this.setUser(username);
  }

  private setUser(username: string): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(STORAGE_KEY, username);
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
