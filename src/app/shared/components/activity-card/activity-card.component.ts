import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivityItem } from '../../../core/models/activity.model';
import { Review } from '../../../core/models/review.model';
import { TranslationService } from '../../../core/services/translation.service';
import { SeenOnViewDirective } from '../../directives/seen-on-view.directive';
import { relativeTime } from '../../utils/relative-time';
import { LikeChange, ReviewCardComponent } from '../review-card/review-card.component';

/**
 * Un post del feed: sopra il messaggio che descrive l'azione ("anna ha recensito Portal 2"),
 * sotto il contenuto con cui approfondire (recensione, gioco o profilo).
 */
@Component({
  selector: 'app-activity-card',
  imports: [RouterLink, ReviewCardComponent, SeenOnViewDirective],
  template: `
    <article
      appSeenOnView
      (appSeenOnView)="seen.emit()"
      class="rounded-xl border bg-slate-900/80 p-4 sm:p-5"
      [class]="
        activity().unseen
          ? 'border-violet-500/50 shadow-lg shadow-violet-500/5'
          : 'border-slate-800'
      "
    >
      <header class="flex items-start gap-3">
        <a
          [routerLink]="['/profile', activity().username]"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-xs font-bold text-white"
          [attr.aria-label]="activity().username"
        >
          {{ initials() }}
        </a>
        <div class="min-w-0 flex-1">
          <p class="text-sm text-slate-300">
            <a
              [routerLink]="['/profile', activity().username]"
              class="font-semibold text-white hover:text-violet-300"
              >{{ activity().username }}</a
            >
            {{ message() }}
          </p>
          <p class="mt-0.5 text-xs text-slate-500">{{ relativeTime() }}</p>
        </div>
        @if (activity().unseen) {
          <span
            class="shrink-0 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-semibold text-violet-300"
          >
            {{ i18n.t('activityFeed.new') }}
          </span>
        }
      </header>

      <div class="mt-4">
        @switch (activity().type) {
          @case ('WISHLIST_ADD') {
            @if (activity().game; as game) {
              <a
                [routerLink]="['/games', encodeName(game.name)]"
                class="flex gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3 transition hover:border-violet-500/50"
              >
                @if (game.headerImage) {
                  <img
                    [src]="game.headerImage"
                    [alt]="game.name"
                    class="h-20 w-36 shrink-0 rounded-md object-cover sm:h-24 sm:w-44"
                  />
                }
                <div class="min-w-0 flex-1">
                  <h3 class="truncate font-semibold text-white">{{ game.name }}</h3>
                  @if (game.genres) {
                    <p class="mt-0.5 truncate text-sm text-slate-400">{{ game.genres }}</p>
                  }
                  <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    @if (game.avgScore) {
                      <span
                        class="rounded-full bg-emerald-500/90 px-2 py-0.5 font-semibold text-white"
                      >
                        {{ game.avgScore }}/10
                      </span>
                    }
                    <span class="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
                      {{ game.price ? '€' + game.price.toFixed(2) : i18n.t('common.free') }}
                    </span>
                  </div>
                </div>
              </a>
            } @else {
              <a
                [routerLink]="['/games', encodeName(activity().gameName ?? '')]"
                class="text-sm text-violet-300 hover:text-violet-200"
              >
                {{ activity().gameName }}
              </a>
            }
          }
          @case ('FOLLOW') {
            <a
              [routerLink]="['/profile', activity().targetUsername]"
              class="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3 transition hover:border-violet-500/50"
            >
              <span
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-600 to-amber-500 text-sm font-bold text-white"
              >
                {{ targetInitials() }}
              </span>
              <div class="min-w-0">
                <h3 class="truncate font-semibold text-white">{{ activity().targetUsername }}</h3>
                @if (targetStats(); as stats) {
                  <p class="text-sm text-slate-400">{{ stats }}</p>
                }
              </div>
              <span class="ml-auto shrink-0 text-sm text-violet-300">
                {{ i18n.t('activityFeed.viewProfile') }} →
              </span>
            </a>
          }
          @default {
            <!-- REVIEW e LIKE_REVIEW: la recensione e' la stessa card usata nel dettaglio gioco,
                 quindi mettere like da qui funziona e si allinea con il resto dell'app -->
            @if (reviewView(); as review) {
              <div class="flex gap-4">
                @if (activity().gameHeaderImage) {
                  <a
                    [routerLink]="['/games', encodeName(review.title)]"
                    class="hidden shrink-0 sm:block"
                  >
                    <img
                      [src]="activity().gameHeaderImage"
                      [alt]="review.title"
                      class="h-24 w-44 rounded-lg object-cover"
                    />
                  </a>
                }
                <div class="min-w-0 flex-1">
                  <app-review-card
                    [review]="review"
                    [embedded]="true"
                    (likeChange)="onLikeChange($event)"
                  />
                </div>
              </div>
            }
          }
        }
      </div>
    </article>
  `,
})
export class ActivityCardComponent {
  readonly i18n = inject(TranslationService);

  readonly activity = input.required<ActivityItem>();
  /** l'utente ha guardato questo post abbastanza a lungo (vedi SeenOnViewDirective) */
  readonly seen = output<void>();

  // la card della recensione mostra likeCount da input: il like dato da qui va riflesso sul
  // conteggio senza ricaricare il feed
  private readonly likeDelta = signal(0);

  readonly reviewView = computed<Review | null>(() => {
    const review = this.activity().review;
    return review ? { ...review, likeCount: review.likeCount + this.likeDelta() } : null;
  });

  onLikeChange(change: LikeChange): void {
    this.likeDelta.update((delta) => delta + change.delta);
  }

  initials(): string {
    return this.activity().username.slice(0, 2).toUpperCase();
  }

  targetInitials(): string {
    return (this.activity().targetUsername ?? '').slice(0, 2).toUpperCase();
  }

  message(): string {
    const a = this.activity();
    switch (a.type) {
      case 'WISHLIST_ADD':
        return this.i18n.t('activityFeed.wishlistAdd', { game: a.gameName ?? '' });
      case 'REVIEW':
        return this.i18n.t('activityFeed.review', {
          game: a.gameName ?? '',
          score: a.score ?? 0,
        });
      case 'LIKE_REVIEW':
        return this.i18n.t('activityFeed.likeReview', {
          author: a.review?.username ?? '',
          game: a.gameName ?? '',
        });
      case 'FOLLOW':
        return this.i18n.t('activityFeed.follow', { target: a.targetUsername ?? '' });
    }
  }

  targetStats(): string {
    const a = this.activity();
    const parts: string[] = [];
    if (a.targetWishlistCount != null) {
      parts.push(this.i18n.t('activityFeed.wishlistCount', { count: a.targetWishlistCount }));
    }
    if (a.targetFollowers != null) {
      parts.push(this.i18n.t('activityFeed.followersCount', { count: a.targetFollowers }));
    }
    return parts.join(' · ');
  }

  encodeName(name: string): string {
    return encodeURIComponent(name);
  }

  relativeTime(): string {
    return relativeTime(this.activity().createdAt, this.i18n);
  }
}
