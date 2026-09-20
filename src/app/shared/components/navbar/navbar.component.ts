import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service';

/**
 * Toolbar unica dell'app. Da md in su i link stanno in linea; sotto, un pulsante apre un menu a
 * tendina con gli stessi link piu' profilo, impostazioni e logout.
 */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <nav class="gh-gutter flex items-center justify-between gap-4 py-3">
        <a routerLink="/home" class="flex items-center gap-2" (click)="closeMenu()">
          <span class="text-2xl">🎮</span>
          <span class="text-xl font-bold tracking-tight text-white">
            Game<span class="text-violet-400">Hub</span>
          </span>
        </a>

        <div class="hidden items-center gap-1 md:flex">
          @for (link of navLinks; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="bg-violet-500/20 text-violet-300"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {{ i18n.t(link.labelKey) }}
            </a>
          }
        </div>

        @if (auth.currentUser(); as username) {
          <div class="hidden items-center gap-3 md:flex">
            <a
              routerLink="/notifications"
              routerLinkActive="text-violet-300"
              class="relative rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              [attr.aria-label]="bellLabel()"
              [title]="i18n.t('nav.notifications')"
            >
              🔔
              @if (unread() > 0) {
                <span
                  data-testid="bell-badge"
                  class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-bold leading-none text-white"
                >
                  {{ badgeText() }}
                </span>
              }
            </a>
            <a
              routerLink="/settings"
              routerLinkActive="text-violet-300"
              class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              [attr.aria-label]="i18n.t('nav.settings')"
              [title]="i18n.t('nav.settings')"
            >
              ⚙️
            </a>
            <a
              [routerLink]="['/profile', username]"
              class="text-sm text-slate-400 hover:text-white"
            >
              {{ username }}
            </a>
            <button type="button" (click)="auth.logout()" class="gh-btn gh-btn-outline">
              {{ i18n.t('nav.logout') }}
            </button>
          </div>

          <button
            type="button"
            (click)="menuOpen.set(!menuOpen())"
            class="relative rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white md:hidden"
            [attr.aria-expanded]="menuOpen()"
            aria-controls="mobile-menu"
            [attr.aria-label]="i18n.t('nav.menu')"
          >
            <span aria-hidden="true" class="block w-6 text-center text-xl leading-none">{{
              menuOpen() ? '✕' : '☰'
            }}</span>
            @if (unread() > 0 && !menuOpen()) {
              <!-- sotto md la campanella e' nel menu: un puntino sul burger avvisa che c'e' altro -->
              <span
                data-testid="menu-dot"
                class="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500"
              ></span>
            }
          </button>
        }
      </nav>

      @if (menuOpen() && auth.currentUser(); as username) {
        <div id="mobile-menu" class="gh-gutter border-t border-slate-800 pb-4 pt-2 md:hidden">
          <div class="flex flex-col gap-1">
            @for (link of navLinks; track link.path) {
              <a
                [routerLink]="link.path"
                routerLinkActive="bg-violet-500/20 text-violet-300"
                (click)="closeMenu()"
                class="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                {{ i18n.t(link.labelKey) }}
              </a>
            }
            <a
              [routerLink]="['/profile', username]"
              routerLinkActive="bg-violet-500/20 text-violet-300"
              (click)="closeMenu()"
              class="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {{ username }}
            </a>
            <a
              routerLink="/notifications"
              routerLinkActive="bg-violet-500/20 text-violet-300"
              (click)="closeMenu()"
              class="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {{ i18n.t('nav.notifications') }}
              @if (unread() > 0) {
                <span
                  class="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold leading-none text-white"
                >
                  {{ badgeText() }}
                </span>
              }
            </a>
            <a
              routerLink="/settings"
              routerLinkActive="bg-violet-500/20 text-violet-300"
              (click)="closeMenu()"
              class="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {{ i18n.t('nav.settings') }}
            </a>
            <button
              type="button"
              (click)="closeMenu(); auth.logout()"
              class="gh-btn gh-btn-outline mt-2 w-full"
            >
              {{ i18n.t('nav.logout') }}
            </button>
          </div>
        </div>
      }
    </header>
  `,
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(TranslationService);
  private readonly notifications = inject(NotificationService);

  readonly menuOpen = signal(false);

  readonly unread = this.notifications.unreadCount;
  // un badge a tre cifre non entra nel cerchio: oltre 99 basta dire "99+"
  readonly badgeText = computed(() => (this.unread() > 99 ? '99+' : String(this.unread())));
  readonly bellLabel = computed(() =>
    this.unread() > 0
      ? this.i18n.t('notifications.bellLabelUnread', { count: this.unread() })
      : this.i18n.t('notifications.bellLabel'),
  );

  readonly navLinks = [
    { path: '/home', labelKey: 'nav.home' },
    { path: '/games', labelKey: 'nav.games' },
    { path: '/wishlist', labelKey: 'nav.wishlist' },
    { path: '/friends', labelKey: 'nav.community' },
  ];

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
