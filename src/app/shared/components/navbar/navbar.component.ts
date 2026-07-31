import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <nav class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <a routerLink="/home" class="flex items-center gap-2">
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

        <div class="flex items-center gap-3">
          @if (auth.currentUser(); as username) {
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
              class="hidden text-sm text-slate-400 hover:text-white sm:block"
            >
              {{ username }}
            </a>
            <button
              type="button"
              (click)="auth.logout()"
              class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              {{ i18n.t('nav.logout') }}
            </button>
          }
        </div>
      </nav>
    </header>
  `,
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(TranslationService);

  readonly navLinks = [
    { path: '/home', labelKey: 'nav.home' },
    { path: '/games', labelKey: 'nav.games' },
    { path: '/wishlist', labelKey: 'nav.wishlist' },
    { path: '/friends', labelKey: 'nav.community' },
  ];
}
