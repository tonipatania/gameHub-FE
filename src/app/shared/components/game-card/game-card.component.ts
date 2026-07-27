import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Game } from '../../../core/models/game.model';

@Component({
  selector: 'app-game-card',
  imports: [RouterLink],
  template: `
    <article
      class="group overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 transition hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10"
    >
      <div class="relative aspect-[16/9] overflow-hidden bg-slate-800">
        @if (game().url?.headerImage) {
          <img
            [src]="game().url!.headerImage"
            [alt]="game().name"
            class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        } @else {
          <div
            class="flex h-full items-center justify-center bg-gradient-to-br from-violet-900/40 to-slate-900 text-4xl"
          >
            🎮
          </div>
        }
        @if (game().avgScore) {
          <span
            class="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-semibold text-white"
          >
            {{ game().avgScore }}/10
          </span>
        }
      </div>
      <div class="p-4">
        <h3 class="truncate text-lg font-semibold text-white">{{ game().name }}</h3>
        @if (game().genres) {
          <p class="mt-1 truncate text-sm text-slate-400">{{ game().genres }}</p>
        }
        <div class="mt-3 flex items-center justify-between gap-2">
          <a
            [routerLink]="['/games', encodeName(game().name)]"
            class="text-sm font-medium text-violet-400 hover:text-violet-300"
          >
            Dettagli →
          </a>
          @if (showWishlistButton()) {
            <button
              type="button"
              (click)="wishlistToggle.emit(game().name); $event.stopPropagation()"
              class="rounded-lg px-3 py-1 text-xs font-medium transition"
              [class]="
                inWishlist()
                  ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                  : 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
              "
            >
              {{ inWishlist() ? '♥ In wishlist' : '+ Wishlist' }}
            </button>
          }
        </div>
      </div>
    </article>
  `,
})
export class GameCardComponent {
  readonly game = input.required<Game>();
  readonly inWishlist = input(false);
  readonly showWishlistButton = input(false);
  readonly wishlistToggle = output<string>();

  encodeName(name: string): string {
    return encodeURIComponent(name);
  }
}
