import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { Game } from '../../core/models/game.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { GameCardComponent } from '../../shared/components/game-card/game-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

type SortKey = 'name' | 'price' | 'release';

@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, NavbarComponent, GameCardComponent, LoadingSpinnerComponent],
  template: `
    <app-navbar />
    <main class="mx-auto max-w-6xl px-4 py-8">
      <section
        class="mb-8 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-violet-900/30 via-slate-900 to-slate-900 p-6 sm:p-8"
      >
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold text-white">La mia wishlist</h1>
            <p class="mt-2 text-slate-400">
              @if (games().length === 0) {
                I giochi che vuoi giocare
              } @else {
                {{ games().length }}
                {{ games().length === 1 ? 'gioco che aspetti' : 'giochi che aspetti' }} di giocare
              }
            </p>
          </div>
          <span class="text-5xl" aria-hidden="true">🎯</span>
        </div>

        @if (games().length > 0) {
          <dl class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
              <dt class="text-xs uppercase tracking-wide text-slate-500">Giochi</dt>
              <dd class="mt-1 text-2xl font-bold text-white">{{ games().length }}</dd>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
              <dt class="text-xs uppercase tracking-wide text-slate-500">Valore totale</dt>
              <dd class="mt-1 text-2xl font-bold text-emerald-400">{{ totalPrice() }}</dd>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
              <dt class="text-xs uppercase tracking-wide text-slate-500">Generi</dt>
              <dd class="mt-1 text-2xl font-bold text-white">{{ genreCount() }}</dd>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
              <dt class="text-xs uppercase tracking-wide text-slate-500">Genere top</dt>
              <dd class="mt-1 truncate text-2xl font-bold text-violet-300" [title]="topGenre()">
                {{ topGenre() }}
              </dd>
            </div>
          </dl>
        }
      </section>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (games().length === 0) {
        <div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <p class="text-5xl">🕹️</p>
          <p class="mt-4 text-lg font-medium text-white">La tua wishlist è vuota</p>
          <p class="mt-1 text-slate-400">
            Aggiungi i giochi che ti incuriosiscono e li ritrovi qui.
          </p>
          <a
            routerLink="/games"
            class="mt-6 inline-block rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white transition hover:bg-violet-500"
          >
            Esplora il catalogo →
          </a>
        </div>
      } @else {
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-white">I tuoi giochi</h2>
          <div class="flex gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1">
            @for (option of sortOptions; track option.key) {
              <button
                type="button"
                (click)="sortBy.set(option.key)"
                class="rounded-md px-3 py-1.5 text-sm font-medium transition"
                [class]="
                  sortBy() === option.key
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                "
              >
                {{ option.label }}
              </button>
            }
          </div>
        </div>

        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
    </main>
  `,
})
export class WishlistComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);

  readonly loading = signal(true);
  readonly games = signal<Game[]>([]);
  readonly sortBy = signal<SortKey>('name');

  // niente ordinamento per voto: avgScore vale 0 su oltre il 99% del catalogo, quindi sarebbe
  // un pulsante che non cambia nulla
  readonly sortOptions: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Nome' },
    { key: 'price', label: 'Prezzo' },
    { key: 'release', label: 'Uscita' },
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
    return total === 0 ? 'Gratis' : '€' + total.toFixed(2);
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
  }

  remove(gameName: string): void {
    const username = this.auth.getUsername();
    if (!username) return;

    this.userService.removeFromWishlist(username, gameName).subscribe({
      next: () => this.games.update((list) => list.filter((g) => g.name !== gameName)),
    });
  }
}
