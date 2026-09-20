import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GameService } from '../../core/services/game.service';
import { UserService } from '../../core/services/user.service';
import { Game } from '../../core/models/game.model';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { GameCardComponent } from '../../shared/components/game-card/game-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TranslationService } from '../../core/services/translation.service';

type SortKey = 'name' | 'price' | 'release';

@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, PageLayoutComponent, GameCardComponent, LoadingSpinnerComponent],
  template: `
    <app-page-layout>
      <section
        class="mb-8 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-violet-900/30 via-slate-900 to-slate-900 p-6 sm:p-8"
      >
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="gh-page-title">{{ i18n.t('wishlist.title') }}</h1>
            <p class="mt-2 text-slate-400">
              @if (games().length === 0) {
                {{ i18n.t('wishlist.subtitleEmpty') }}
              } @else {
                {{
                  i18n.t(
                    games().length === 1
                      ? 'wishlist.subtitleCountSingular'
                      : 'wishlist.subtitleCountPlural',
                    { count: games().length }
                  )
                }}
              }
            </p>
          </div>
          <span class="text-5xl" aria-hidden="true">🎯</span>
        </div>

        @if (games().length > 0) {
          <dl class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:max-w-4xl">
            <div class="gh-tile">
              <dt class="gh-eyebrow">
                {{ i18n.t('wishlist.statsGames') }}
              </dt>
              <dd class="mt-1 text-2xl font-bold text-white">{{ games().length }}</dd>
            </div>
            <div class="gh-tile">
              <dt class="gh-eyebrow">
                {{ i18n.t('wishlist.statsValue') }}
              </dt>
              <dd class="mt-1 text-2xl font-bold text-emerald-400">{{ totalPrice() }}</dd>
            </div>
            <div class="gh-tile">
              <dt class="gh-eyebrow">
                {{ i18n.t('wishlist.statsGenres') }}
              </dt>
              <dd class="mt-1 text-2xl font-bold text-white">{{ genreCount() }}</dd>
            </div>
            <div class="gh-tile">
              <dt class="gh-eyebrow">
                {{ i18n.t('wishlist.statsTopGenre') }}
              </dt>
              <dd class="mt-1 truncate text-2xl font-bold text-violet-300" [title]="topGenre()">
                {{ topGenre() }}
              </dd>
            </div>
          </dl>
        }
      </section>

      <!-- circa 3/4 ai tuoi giochi e 1/4 ai consigliati; sotto lg le due colonne si impilano -->
      <div class="grid items-start gap-8 lg:grid-cols-4">
        <div class="min-w-0 lg:col-span-3">
          @if (loading()) {
            <app-loading-spinner />
          } @else if (games().length === 0) {
            <div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <p class="text-5xl">🕹️</p>
              <p class="mt-4 text-lg font-medium text-white">
                {{ i18n.t('wishlist.emptyTitle') }}
              </p>
              <p class="mt-1 text-slate-400">
                {{ i18n.t('wishlist.emptySubtitle') }}
              </p>
              <a routerLink="/games" class="gh-btn gh-btn-primary mt-6 px-5 py-2.5">
                {{ i18n.t('wishlist.exploreCatalog') }}
              </a>
            </div>
          } @else {
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 class="gh-section-title">{{ i18n.t('wishlist.yourGames') }}</h2>
              <div class="gh-segmented">
                @for (option of sortOptions; track option.key) {
                  <button
                    type="button"
                    (click)="sortBy.set(option.key)"
                    class="gh-segment"
                    [class.gh-segment-active]="sortBy() === option.key"
                  >
                    {{ i18n.t(option.labelKey) }}
                  </button>
                }
              </div>
            </div>

            <div class="gh-game-grid">
              @for (game of sortedGames(); track game.id) {
                <app-game-card
                  [game]="game"
                  [showWishlistButton]="true"
                  [inWishlist]="true"
                  [showPrice]="true"
                  (wishlistToggle)="remove($event)"
                />
              }
            </div>
          }
        </div>

        <aside class="min-w-0 lg:sticky lg:top-24 lg:col-span-1">
          <h2 class="gh-section-title">
            {{ i18n.t('wishlist.suggestedTitle') }}
          </h2>
          <p class="mb-4 mt-1 text-sm text-slate-500">{{ i18n.t('wishlist.suggestedHint') }}</p>
          @if (suggestionsLoading()) {
            <app-loading-spinner />
          } @else if (visibleSuggestions().length === 0) {
            <p class="text-sm text-slate-500">{{ i18n.t('wishlist.noSuggestions') }}</p>
          } @else {
            <div class="space-y-2">
              @for (game of visibleSuggestions(); track game.id) {
                <app-game-card
                  [game]="game"
                  [compact]="true"
                  [showWishlistButton]="true"
                  [inWishlist]="false"
                  (wishlistToggle)="addSuggested($event)"
                />
              }
            </div>
          }
        </aside>
      </div>
    </app-page-layout>
  `,
})
export class WishlistComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly gameService = inject(GameService);
  private readonly userService = inject(UserService);
  readonly i18n = inject(TranslationService);

  readonly loading = signal(true);
  readonly games = signal<Game[]>([]);
  readonly sortBy = signal<SortKey>('name');

  readonly suggestionsLoading = signal(true);
  readonly suggestedGames = signal<Game[]>([]);

  readonly visibleSuggestions = computed(() => {
    const owned = new Set(this.games().map((g) => g.name));
    return this.suggestedGames().filter((g) => !owned.has(g.name));
  });

  // niente ordinamento per voto: avgScore vale 0 su oltre il 99% del catalogo, quindi sarebbe
  // un pulsante che non cambia nulla
  readonly sortOptions: { key: SortKey; labelKey: string }[] = [
    { key: 'name', labelKey: 'wishlist.sortName' },
    { key: 'price', labelKey: 'wishlist.sortPrice' },
    { key: 'release', labelKey: 'wishlist.sortRelease' },
  ];

  readonly sortedGames = computed(() => {
    const list = [...this.games()];
    switch (this.sortBy()) {
      case 'price':
        return list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      case 'release':
        // le date arrivano come "Oct 21, 2008": Date.parse le legge, ma un valore mancante o
        // illeggibile finisce in fondo invece di far collassare l'ordinamento
        return list.sort((a, b) => this.releaseTime(b) - this.releaseTime(a));
      default:
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  readonly totalPrice = computed(() => {
    const total = this.games().reduce((sum, g) => sum + (g.price ?? 0), 0);
    return total === 0 ? this.i18n.t('common.free') : '€' + total.toFixed(2);
  });

  private readonly genreTally = computed(() => {
    const counts = new Map<string, number>();
    for (const game of this.games()) {
      for (const genre of (game.genres ?? '').split(',')) {
        const trimmed = genre.trim();
        if (trimmed) counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
      }
    }
    return counts;
  });

  readonly genreCount = computed(() => this.genreTally().size);

  readonly topGenre = computed(() => {
    let best = '—';
    let bestCount = 0;
    for (const [genre, count] of this.genreTally()) {
      if (count > bestCount) {
        best = genre;
        bestCount = count;
      }
    }
    return best;
  });

  private releaseTime(game: Game): number {
    const parsed = Date.parse(game.releaseDate ?? '');
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
  }

  ngOnInit(): void {
    const username = this.auth.getUsername();
    if (!username) return;

    this.userService.getWishlist(username).subscribe({
      next: (list) => {
        this.games.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.gameService.suggestGames(username).subscribe({
      next: (games) => {
        this.suggestedGames.set(games);
        this.suggestionsLoading.set(false);
      },
      error: () => this.suggestionsLoading.set(false),
    });
  }

  remove(gameName: string): void {
    const username = this.auth.getUsername();
    if (!username) return;

    this.userService.removeFromWishlist(username, gameName).subscribe({
      next: () => this.games.update((list) => list.filter((g) => g.name !== gameName)),
    });
  }

  addSuggested(gameName: string): void {
    const username = this.auth.getUsername();
    if (!username) return;

    this.userService.addToWishlist(username, gameName).subscribe({
      next: () => {
        const added = this.suggestedGames().find((g) => g.name === gameName);
        if (added) this.games.update((list) => [...list, added]);
      },
    });
  }
}
