import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Game } from '../../../core/models/game.model';

@Component({
  selector: 'app-game-card',
  imports: [RouterLink],
  template: `
    <article
      class="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 transition hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 focus-within:border-violet-500"
    >
      @if (compact()) {
        <a
          [routerLink]="['/games', encodeName(game().name)]"
          class="flex items-center gap-3 p-3"
        >
          <div class="relative h-11 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-800">
            @if (game().url?.headerImage) {
              <img
                [src]="game().url!.headerImage"
                [alt]="game().name"
                class="h-full w-full object-cover"
              />
            } @else {
              <div class="flex h-full items-center justify-center bg-gradient-to-br from-violet-900/40 to-slate-900 text-xl">
                🎮
              </div>
            }
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="truncate text-sm font-semibold text-white">{{ game().name }}</h3>
            @if (game().genres) {
              <p class="truncate text-xs text-slate-400">{{ game().genres }}</p>
            }
          </div>
          @if (game().avgScore) {
            <span class="shrink-0 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-semibold text-white">
              {{ game().avgScore }}/10
            </span>
          }
        </a>
      } @else {
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
          @if (showPrice()) {
            <!-- in alto a sinistra: l'angolo destro resta al voto, cosi i due badge non si sovrappongono -->
            <span
              class="absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur"
              [class]="isFree() ? 'bg-emerald-500/90 text-white' : 'bg-slate-950/80 text-white'"
            >
              {{ priceLabel() }}
            </span>
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
          <h3 class="truncate text-lg font-semibold text-white transition group-hover:text-violet-300">
            {{ game().name }}
          </h3>
          @if (game().genres) {
            <p class="mt-1 truncate text-sm text-slate-400">{{ game().genres }}</p>
          }
          @if (showWishlistButton()) {
            <div class="mt-3 flex justify-end">
              <!-- z-20 tiene il bottone sopra il link a tutta card, altrimenti il click su
                   "wishlist" verrebbe intercettato dalla navigazione al dettaglio -->
              <button
                type="button"
                (click)="wishlistToggle.emit(game().name); $event.stopPropagation()"
                class="relative z-20 rounded-lg px-3 py-1 text-xs font-medium transition"
                [class]="
                  inWishlist()
                    ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                    : 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
                "
              >
                {{ inWishlist() ? '♥ In wishlist' : '+ Wishlist' }}
              </button>
            </div>
          }
        </div>

        <!-- link sovrapposto a tutta la card: rende cliccabile l'intera superficie restando un
             vero <a> (navigabile da tastiera, apribile in una nuova scheda) senza annidare il
             bottone dentro l'anchor, che sarebbe HTML non valido -->
        <a
          [routerLink]="['/games', encodeName(game().name)]"
          class="absolute inset-0 z-10 focus:outline-none"
          [attr.aria-label]="game().name"
        ></a>
      }
    </article>
  `,
})
export class GameCardComponent {
  readonly game = input.required<Game>();
  readonly inWishlist = input(false);
  readonly showWishlistButton = input(false);
  readonly showPrice = input(false);
  readonly compact = input(false);
  readonly wishlistToggle = output<string>();

  // prezzo assente e prezzo 0 sono entrambi "gratis": nel catalogo 16k giochi hanno Price a 0
  isFree(): boolean {
    return !this.game().price;
  }

  priceLabel(): string {
    return this.isFree() ? 'Gratis' : '€' + this.game().price!.toFixed(2);
  }

  encodeName(name: string): string {
    return encodeURIComponent(name);
  }
}
