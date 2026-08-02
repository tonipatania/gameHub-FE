import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Review } from '../../../core/models/review.model';
import { AuthService } from '../../../core/services/auth.service';
import { ReviewService } from '../../../core/services/review.service';
import { TranslationService } from '../../../core/services/translation.service';

export interface LikeChange {
  reviewId: string;
  delta: number;
}

@Component({
  selector: 'app-review-card',
  imports: [RouterLink],
  template: `
    <article class="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <a
              [routerLink]="['/profile', review().username]"
              class="font-semibold text-violet-400 hover:text-violet-300"
            >
              {{ review().username }}
            </a>
            <span class="text-slate-600">·</span>
            <a
              [routerLink]="['/games', encodeName(review().title)]"
              class="truncate text-sm text-slate-300 hover:text-white"
            >
              {{ review().title }}
            </a>
          </div>
          <p
            class="mt-3 text-slate-300 leading-relaxed"
            [class.line-clamp-3]="!expanded() && isLong()"
          >{{ review().comment }}</p>
          @if (isLong()) {
            <button
              type="button"
              (click)="expanded.set(!expanded())"
              class="mt-1 inline-flex cursor-pointer items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              {{ expanded() ? i18n.t('reviewCard.collapse') : i18n.t('reviewCard.expand') }}
              <span class="transition-transform" [class.rotate-180]="expanded()">▾</span>
            </button>
          }
        </div>
        <div
          class="flex shrink-0 flex-col items-center rounded-lg bg-slate-800 px-3 py-2"
        >
          <span class="text-lg font-bold text-emerald-400">{{ review().userScore }}</span>
          <span class="text-xs text-slate-500">/10</span>
        </div>
      </div>
      <div class="mt-4 flex items-center gap-4 border-t border-slate-800 pt-4">
        <button
          type="button"
          (click)="onToggleLike()"
          [disabled]="liking()"
          [attr.aria-pressed]="liked()"
          [title]="liked() ? i18n.t('reviewCard.removeLike') : i18n.t('reviewCard.addLike')"
          class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition hover:bg-slate-800 disabled:opacity-60"
          [class]="liked() ? 'text-rose-400' : 'text-slate-400 hover:text-rose-400'"
        >
          <span
            class="transition-transform duration-200"
            [class.scale-125]="liked()"
          >{{ liked() ? '♥' : '♡' }}</span>
          {{ review().likeCount }} {{ i18n.t('reviewCard.likeSuffix') }}
        </button>
      </div>
    </article>
  `,
})
export class ReviewCardComponent {
  private readonly auth = inject(AuthService);
  private readonly reviewService = inject(ReviewService);
  readonly i18n = inject(TranslationService);

  readonly review = input.required<Review>();
  // emesso solo quando il server conferma: delta +1 per un like, -1 per un unlike
  readonly likeChange = output<LikeChange>();

  readonly expanded = signal(false);
  readonly liking = signal(false);
  readonly liked = computed(() => this.reviewService.hasLiked(this.review().id));

  constructor() {
    const username = this.auth.getUsername();
    if (username) this.reviewService.loadLikedReviews(username);
  }

  onToggleLike(): void {
    const username = this.auth.getUsername();
    if (!username || this.liking()) return;

    const reviewId = this.review().id;
    const wasLiked = this.liked();
    const request = wasLiked
      ? this.reviewService.unlikeReview(username, reviewId)
      : this.reviewService.likeReview(username, reviewId);

    this.liking.set(true);
    request.subscribe({
      next: (applied) => {
        this.liking.set(false);
        if (applied) {
          this.likeChange.emit({ reviewId, delta: wasLiked ? -1 : 1 });
        }
      },
      error: () => this.liking.set(false),
    });
  }

  encodeName(name: string): string {
    return encodeURIComponent(name);
  }

  isLong(): boolean {
    return this.review().comment.length > 220;
  }
}
