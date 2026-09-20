import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NotificationItem } from '../../core/models/notification.model';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { TranslationService } from '../../core/services/translation.service';
import { UserService } from '../../core/services/user.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { relativeTime } from '../../shared/utils/relative-time';

const PAGE_SIZE = 15;

/**
 * Le notifiche dell'utente: nuovi follower, like e risposte alle sue recensioni. Ogni voce porta
 * al contenuto (profilo, recensione, thread di risposte) e si puo' segnare come letta o eliminare;
 * per i follower c'e' anche "Segui anche tu" senza uscire dalla pagina.
 */
@Component({
  selector: 'app-notifications',
  imports: [
    RouterLink,
    PageLayoutComponent,
    PageHeaderComponent,
    PaginationComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <app-page-layout>
      <app-page-header
        [title]="i18n.t('notifications.title')"
        [subtitle]="i18n.t('notifications.subtitle')"
      >
        <button
          type="button"
          (click)="markAllRead()"
          [disabled]="notificationService.unreadCount() === 0"
          class="gh-btn gh-btn-outline"
        >
          {{ i18n.t('notifications.markAllRead') }}
        </button>
      </app-page-header>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <p class="text-center text-slate-400">{{ i18n.t('notifications.loadError') }}</p>
      } @else if (items().length === 0) {
        <div class="gh-card p-10 text-center">
          <p class="text-4xl" aria-hidden="true">🔔</p>
          <p class="mt-3 text-slate-300">{{ i18n.t('notifications.empty') }}</p>
        </div>
      } @else {
        <ul class="mx-auto max-w-3xl space-y-3">
          @for (item of items(); track item.id) {
            <li
              class="gh-card p-4"
              [class.border-violet-500/50]="!item.read"
              [attr.data-unread]="!item.read"
            >
              <div class="flex items-start gap-3">
                <a
                  [routerLink]="['/profile', item.actor]"
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-xs font-bold text-white"
                  [attr.aria-label]="item.actor"
                >
                  {{ initials(item.actor) }}
                </a>

                <div class="min-w-0 flex-1">
                  <p class="text-sm text-slate-300">
                    <a
                      [routerLink]="['/profile', item.actor]"
                      class="font-semibold text-white hover:text-violet-300"
                      >{{ item.actor }}</a
                    >
                    {{ message(item) }}
                  </p>
                  <p class="mt-0.5 text-xs text-slate-500">{{ timeAgo(item.createdAt) }}</p>

                  @if (item.excerpt) {
                    <blockquote
                      class="mt-3 line-clamp-3 rounded-lg border-l-2 border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-400"
                    >
                      {{ item.excerpt }}
                    </blockquote>
                  }

                  <div class="mt-3 flex flex-wrap items-center gap-2">
                    @if (item.type === 'FOLLOW') {
                      <button
                        type="button"
                        (click)="followBack(item)"
                        [disabled]="item.followingBack || pending().has(item.id)"
                        class="gh-btn gh-btn-sm"
                        [class]="item.followingBack ? 'gh-btn-muted' : 'gh-btn-primary'"
                      >
                        {{
                          item.followingBack
                            ? i18n.t('userCard.alreadyFollowing')
                            : i18n.t('notifications.followBack')
                        }}
                      </button>
                      <a
                        [routerLink]="['/profile', item.actor]"
                        (click)="markRead(item)"
                        class="gh-btn gh-btn-outline gh-btn-sm"
                      >
                        {{ i18n.t('activityFeed.viewProfile') }}
                      </a>
                    } @else {
                      <a
                        [routerLink]="['/games', item.gameName]"
                        [queryParams]="reviewParams(item)"
                        (click)="markRead(item)"
                        class="gh-btn gh-btn-soft gh-btn-sm"
                      >
                        {{
                          item.type === 'REPLY_REVIEW'
                            ? i18n.t('notifications.viewReply')
                            : i18n.t('notifications.viewReview')
                        }}
                      </a>
                    }
                    @if (!item.read) {
                      <button
                        type="button"
                        (click)="markRead(item)"
                        class="gh-btn gh-btn-outline gh-btn-sm"
                      >
                        {{ i18n.t('notifications.markRead') }}
                      </button>
                    }
                  </div>
                </div>

                <div class="flex shrink-0 items-center gap-2">
                  @if (!item.read) {
                    <span
                      class="h-2.5 w-2.5 rounded-full bg-violet-400"
                      [attr.title]="i18n.t('notifications.unread')"
                      role="img"
                      [attr.aria-label]="i18n.t('notifications.unread')"
                    ></span>
                  }
                  <button
                    type="button"
                    (click)="remove(item)"
                    class="cursor-pointer rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-rose-400"
                    [attr.aria-label]="i18n.t('notifications.delete')"
                    [title]="i18n.t('notifications.delete')"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </li>
          }
        </ul>

        @if (totalPages() > 1) {
          <app-pagination
            class="mt-8"
            [page]="page()"
            [totalPages]="totalPages()"
            (prev)="goTo(page() - 1)"
            (next)="goTo(page() + 1)"
          />
        }
      }
    </app-page-layout>
  `,
})
export class NotificationsComponent implements OnInit {
  readonly notificationService = inject(NotificationService);
  readonly i18n = inject(TranslationService);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly items = signal<NotificationItem[]>([]);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  // notifiche con un'azione in corso (es. "Segui anche tu"), per non inviare due volte
  readonly pending = signal<ReadonlySet<string>>(new Set());

  ngOnInit(): void {
    this.load(0);
  }

  goTo(page: number): void {
    this.load(page);
  }

  message(item: NotificationItem): string {
    switch (item.type) {
      case 'FOLLOW':
        return this.i18n.t('notifications.follow');
      case 'LIKE_REVIEW':
        return this.i18n.t('notifications.likeReview', { game: item.gameName ?? '' });
      case 'REPLY_REVIEW':
        return this.i18n.t('notifications.replyReview', { game: item.gameName ?? '' });
    }
  }

  /** Per una risposta la pagina del gioco apre subito il thread, per un like evidenzia la card. */
  reviewParams(item: NotificationItem): Record<string, string> {
    const params: Record<string, string> = { review: item.reviewId ?? '' };
    if (item.type === 'REPLY_REVIEW') params['thread'] = '1';
    return params;
  }

  markRead(item: NotificationItem): void {
    if (item.read) return;
    this.setRead(item.id);
    this.notificationService.markRead(item.id).subscribe({
      // il click che naviga non deve bloccarsi su un errore: si ripristina e basta
      error: () => this.setRead(item.id, false),
    });
  }

  markAllRead(): void {
    this.notificationService.markAllRead().subscribe({
      next: () => this.items.update((list) => list.map((n) => ({ ...n, read: true }))),
      error: () => this.toast.error(this.i18n.t('notifications.actionError')),
    });
  }

  remove(item: NotificationItem): void {
    this.notificationService.remove(item.id).subscribe({
      next: () => this.items.update((list) => list.filter((n) => n.id !== item.id)),
      error: () => this.toast.error(this.i18n.t('notifications.actionError')),
    });
  }

  followBack(item: NotificationItem): void {
    const username = this.auth.getUsername();
    if (!username || item.followingBack || this.pending().has(item.id)) return;

    this.setPending(item.id, true);
    this.userService.followUser(username, item.actor).subscribe({
      next: () => {
        this.setPending(item.id, false);
        // il follow e' l'azione richiesta: la notifica si considera gestita
        this.items.update((list) =>
          list.map((n) =>
            n.actor === item.actor && n.type === 'FOLLOW' ? { ...n, followingBack: true } : n,
          ),
        );
        this.markRead(item);
      },
      error: () => {
        this.setPending(item.id, false);
        this.toast.error(this.i18n.t('notifications.actionError'));
      },
    });
  }

  initials(username: string): string {
    return username.slice(0, 2).toUpperCase();
  }

  timeAgo(iso: string): string {
    return relativeTime(iso, this.i18n);
  }

  private load(page: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.notificationService.list(page, PAGE_SIZE).subscribe({
      next: (result) => {
        this.items.set(result.content);
        this.page.set(result.number);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);
        // il badge deve rispecchiare cio' che l'utente sta guardando
        this.notificationService.refreshUnread();
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private setRead(id: string, read = true): void {
    this.items.update((list) => list.map((n) => (n.id === id ? { ...n, read } : n)));
  }

  private setPending(id: string, active: boolean): void {
    this.pending.update((ids) => {
      const next = new Set(ids);
      if (active) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}
