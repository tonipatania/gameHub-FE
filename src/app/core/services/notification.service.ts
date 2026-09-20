import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../models/game.model';
import { NotificationItem } from '../models/notification.model';
import { AuthService } from './auth.service';

/** Ogni quanto si richiede il numero di non lette: il backend risponde con un solo count(). */
export const UNREAD_POLL_INTERVAL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** notifiche non lette dell'utente corrente: alimenta il badge della campanella */
  readonly unreadCount = signal(0);

  constructor() {
    if (!this.isBrowser) return;

    // finche' c'e' un utente loggato si controlla a intervalli (una scheda in background non
    // interroga il server e appena torna visibile si aggiorna subito); al logout si azzera
    effect((onCleanup) => {
      if (!this.auth.currentUser()) {
        this.unreadCount.set(0);
        return;
      }

      this.refreshUnread();
      const timer = setInterval(() => {
        if (!this.document.hidden) this.refreshUnread();
      }, UNREAD_POLL_INTERVAL_MS);
      const onVisible = () => {
        if (!this.document.hidden) this.refreshUnread();
      };
      this.document.addEventListener('visibilitychange', onVisible);

      onCleanup(() => {
        clearInterval(timer);
        this.document.removeEventListener('visibilitychange', onVisible);
      });
    });
  }

  refreshUnread(): void {
    this.http.get<{ count: number }>(`${environment.apiUrl}/notifications/unread-count`).subscribe({
      next: ({ count }) => this.unreadCount.set(count),
      // il badge e' un di piu': un errore di rete lascia il valore precedente
      error: () => undefined,
    });
  }

  /** L'utente e' quello del token: il backend non accetta uno username dal client. */
  list(page = 0, size = 20): Observable<Page<NotificationItem>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<NotificationItem>>(`${environment.apiUrl}/notifications`, {
      params,
    });
  }

  markRead(id: string): Observable<void> {
    return this.http
      .post<void>(`${environment.apiUrl}/notifications/${encodeURIComponent(id)}/read`, null)
      .pipe(tap(() => this.refreshUnread()));
  }

  markAllRead(): Observable<void> {
    return this.http
      .post<void>(`${environment.apiUrl}/notifications/read-all`, null)
      .pipe(tap(() => this.unreadCount.set(0)));
  }

  remove(id: string): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiUrl}/notifications/${encodeURIComponent(id)}`)
      .pipe(tap(() => this.refreshUnread()));
  }
}
