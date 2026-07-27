import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { GameNeo4j } from '../../core/models/game.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, NavbarComponent, LoadingSpinnerComponent],
  template: `
    <app-navbar />
    <main class="mx-auto max-w-5xl px-4 py-8">
      <h1 class="mb-2 text-3xl font-bold text-white">La mia wishlist</h1>
      <p class="mb-8 text-slate-400">I giochi che vuoi giocare</p>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (games().length === 0) {
        <div class="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <p class="text-4xl">🎯</p>
          <p class="mt-4 text-slate-400">La tua wishlist è vuota.</p>
          <a routerLink="/games" class="mt-4 inline-block text-violet-400 hover:text-violet-300">
            Esplora il catalogo →
          </a>
        </div>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2">
          @for (game of games(); track game.id) {
            <article
              class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-4"
            >
              <a
                [routerLink]="['/games', encodeName(game.name)]"
                class="font-semibold text-white hover:text-violet-400"
              >
                {{ game.name }}
              </a>
              <button
                type="button"
                (click)="remove(game.name)"
                class="rounded-lg bg-rose-500/20 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/30"
              >
                Rimuovi
              </button>
            </article>
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
  readonly games = signal<GameNeo4j[]>([]);

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

  encodeName(name: string): string {
    return encodeURIComponent(name);
  }

  remove(gameName: string): void {
    const username = this.auth.getUsername();
    if (!username) return;

    this.userService.removeFromWishlist(username, gameName).subscribe({
      next: () => this.games.update((list) => list.filter((g) => g.name !== gameName)),
    });
  }
}
