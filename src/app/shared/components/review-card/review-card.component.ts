import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Review } from '../../../core/models/review.model';
import { AuthService } from '../../../core/services/auth.service';
import { ReviewService } from '../../../core/services/review.service';
import { TranslationService } from '../../../core/services/translation.service';
import { scoreColor } from '../../utils/score';
import { ReviewRepliesComponent } from '../review-replies/review-replies.component';

export interface LikeChange {
  reviewId: string;
  delta: number;
}

@Component({
  selector: 'app-review-card',
  imports: [RouterLink, ReviewRepliesComponent],
  template: `
    <article
      [class]="
        embedded() ? 'rounded-lg border border-slate-800 bg-slate-950/50 p-4' : 'gh-card p-5'
      "
      [class.ring-2]="highlight()"
      [class.ring-violet-500/60]="highlight()"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <a [routerLink]="['/profile', review().username]" class="font-semibold gh-link">
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
          >
            {{ review().comment }}
          </p>
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
        <div class="flex shrink-0 flex-col items-center rounded-lg bg-slate-800 px-3 py-2">
          <span class="text-lg font-bold" [style.color]="scoreColor(review().userScore)">{{
            review().userScore
          }}</span>
          <span class="text-xs text-slate-500">/10</span>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4">
        @if (isOwn()) {
          <!-- non si mette like ai propri contenuti: resta il conteggio, senza bottone -->
          <span
            class="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500"
            [title]="i18n.t('reviewCard.ownLike')"
          >
            <span>♡</span>
            {{ review().likeCount }} {{ i18n.t('reviewCard.likeSuffix') }}
          </span>
        } @else {
          <button
            type="button"
            (click)="onToggleLike()"
            [disabled]="liking()"
            [attr.aria-pressed]="liked()"
            [title]="liked() ? i18n.t('reviewCard.removeLike') : i18n.t('reviewCard.addLike')"
            class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition hover:bg-slate-800 disabled:opacity-60"
            [class]="liked() ? 'text-rose-400' : 'text-slate-400 hover:text-rose-400'"
          >
            <span class="transition-transform duration-200" [class.scale-125]="liked()">{{
              liked() ? '♥' : '♡'
            }}</span>
            {{ review().likeCount }} {{ i18n.t('reviewCard.likeSuffix') }}
          </button>
        }

        @if (allowReplies() && (replyTotal() > 0 || canReply())) {
          <button
            type="button"
            (click)="repliesOpen.set(!repliesOpen())"
            [attr.aria-expanded]="repliesOpen()"
            class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-violet-300"
            [class.text-violet-300]="repliesOpen()"
          >
            <span aria-hidden="true">💬</span>
            {{ repliesLabel() }}
          </button>
        }
      </div>

      @if (repliesOpen()) {
        <app-review-replies
          [reviewId]="review().id"
          [canReply]="canReply()"
          (countChange)="replyTotal.set($event)"
        />
      }
    </article>
  `,
})
export class ReviewCardComponent {
  private readonly auth = inject(AuthService);
  private readonly reviewService = inject(ReviewService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly i18n = inject(TranslationService);

  readonly review = input.required<Review>();
  /** annidata in un'altra card (es. un post del feed): bordo e sfondo piu' leggeri */
  readonly embedded = input(false);
  /** mostra il thread di risposte (solo dove ha senso: la pagina del gioco) */
  readonly allowReplies = input(false);
  /** evidenziata e portata in vista: chi arriva da una notifica deve vederla subito */
  readonly highlight = input(false);
  /** apre il thread all'arrivo (poi resta liberamente apribile e richiudibile) */
  readonly openThread = input(false);
  /** risposte gia' note al genitore (una chiamata per tutte le card), prima di aprire il thread */
  readonly replyCount = input(0);
  // emesso solo quando il server conferma: delta +1 per un like, -1 per un unlike
  readonly likeChange = output<LikeChange>();

  readonly expanded = signal(false);
  readonly repliesOpen = linkedSignal(() => this.openThread());
  // parte dal conteggio del genitore e poi segue le aggiunte/cancellazioni fatte nel thread
  readonly replyTotal = linkedSignal(() => this.replyCount());
  readonly username = this.auth.getUsername();
  readonly isOwn = computed(() => !!this.username && this.review().username === this.username);
  // chi ha scritto la recensione non risponde a se stesso
  readonly canReply = computed(() => !!this.username && !this.isOwn());
  readonly repliesLabel = computed(() => {
    if (this.repliesOpen()) return this.i18n.t('reviewCard.hideReplies');
    const count = this.replyTotal();
    if (count === 0) return this.i18n.t('reviewCard.reply');
    return this.i18n.t(count === 1 ? 'reviewCard.repliesOne' : 'reviewCard.repliesMany', {
      count,
    });
  });
  readonly liking = signal(false);
  readonly liked = computed(() => this.reviewService.hasLiked(this.review().id));

  constructor() {
    const username = this.auth.getUsername();
    if (username) this.reviewService.loadLikedReviews(username);

    afterNextRender(() => {
      if (this.highlight()) {
        this.host.nativeElement.scrollIntoView?.({ block: 'center' });
      }
    });
  }

  onToggleLike(): void {
    const username = this.auth.getUsername();
    // il like ai propri contenuti e' rifiutato anche dal backend: qui si evita la chiamata
    if (!username || this.liking() || this.isOwn()) return;

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

  readonly scoreColor = scoreColor;

  encodeName(name: string): string {
    return encodeURIComponent(name);
  }

  isLong(): boolean {
    return this.review().comment.length > 220;
  }
}
