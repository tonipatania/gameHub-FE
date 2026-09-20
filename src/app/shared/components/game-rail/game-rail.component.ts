import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Game } from '../../../core/models/game.model';
import { TranslationService } from '../../../core/services/translation.service';
import { GameCardComponent } from '../game-card/game-card.component';

/**
 * Uno "scaffale" orizzontale di giochi, come nelle piattaforme di streaming: titolo, frecce per
 * scorrere (su touch basta trascinare) e card a larghezza fissa che si agganciano al bordo.
 */
@Component({
  selector: 'app-game-rail',
  imports: [GameCardComponent],
  template: `
    <section>
      <div class="mb-3 flex items-end justify-between gap-3">
        <div class="min-w-0">
          <h2 class="gh-section-title">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="text-sm text-slate-400">{{ subtitle() }}</p>
          }
        </div>
        <div class="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            class="gh-btn gh-btn-outline h-9 w-9 !px-0 text-lg"
            [disabled]="!canScrollPrev()"
            [attr.aria-label]="i18n.t('gameRail.prev')"
            (click)="scrollByPage(-1)"
          >
            ‹
          </button>
          <button
            type="button"
            class="gh-btn gh-btn-outline h-9 w-9 !px-0 text-lg"
            [disabled]="!canScrollNext()"
            [attr.aria-label]="i18n.t('gameRail.next')"
            (click)="scrollByPage(1)"
          >
            ›
          </button>
        </div>
      </div>

      <div #track class="gh-rail" (scroll)="updateArrows()">
        @for (game of games(); track game.id; let i = $index) {
          <div class="gh-rail-item">
            <app-game-card
              [game]="game"
              [rank]="ranked() ? i + 1 : null"
              [showWishlistButton]="true"
              [inWishlist]="wishlistNames().has(game.name)"
              (wishlistToggle)="wishlistToggle.emit($event)"
            />
          </div>
        }
      </div>
    </section>
  `,
})
export class GameRailComponent {
  readonly i18n = inject(TranslationService);

  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly games = input.required<Game[]>();
  /** i nomi dei giochi gia' in wishlist, per lo stato del bottone di ogni card */
  readonly wishlistNames = input<ReadonlySet<string>>(new Set());
  /** numera le card (1, 2, 3...): per le classifiche */
  readonly ranked = input(false);
  readonly wishlistToggle = output<string>();

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  readonly canScrollPrev = signal(false);
  readonly canScrollNext = signal(false);

  constructor() {
    // le frecce dipendono da quanto contenuto c'e': si ricalcolano a ogni cambio della lista e
    // dopo il primo render, quando le card esistono davvero
    effect(() => {
      this.games();
      queueMicrotask(() => this.updateArrows());
    });
    afterNextRender(() => this.updateArrows());
  }

  updateArrows(): void {
    const el = this.track().nativeElement;
    this.canScrollPrev.set(el.scrollLeft > 4);
    this.canScrollNext.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  scrollByPage(direction: -1 | 1): void {
    const el = this.track().nativeElement;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  }
}
