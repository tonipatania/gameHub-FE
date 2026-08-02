import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GameService } from '../../../core/services/game.service';
import { ReviewService } from '../../../core/services/review.service';
import { UserService } from '../../../core/services/user.service';
import { Game } from '../../../core/models/game.model';
import { Review } from '../../../core/models/review.model';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { LikeChange, ReviewCardComponent } from '../../../shared/components/review-card/review-card.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-game-detail',
  imports: [
    ReactiveFormsModule,
    NavbarComponent,
    BackButtonComponent,
    ReviewCardComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <app-navbar />
    <main class="mx-auto max-w-5xl px-4 py-8">
      <app-back-button fallback="/games" />
      @if (loading()) {
        <app-loading-spinner />
      } @else if (!game()) {
        <p class="text-center text-slate-400">{{ i18n.t('gameDetail.notFound') }}</p>
      } @else {
        @let g = game()!;
        <div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
          @if (g.url?.headerImage) {
            <div class="aspect-[21/9] overflow-hidden">
              <img [src]="g.url!.headerImage" [alt]="g.name" class="h-full w-full object-cover" />
            </div>
          }
          <div class="p-6 md:p-8">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 class="text-3xl font-bold text-white">{{ g.name }}</h1>
                @if (g.genres) {
                  <p class="mt-2 text-violet-400">{{ g.genres }}</p>
                }
              </div>
              <div class="flex items-center gap-3">
                @if (g.avgScore) {
                  <span class="rounded-xl bg-emerald-500/20 px-4 py-2 text-lg font-bold text-emerald-400">
                    {{ g.avgScore }}/10
                  </span>
                }
                <button
                  type="button"
                  (click)="toggleWishlist()"
                  class="rounded-lg px-4 py-2 text-sm font-medium transition"
                  [class]="
                    inWishlist()
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-violet-600 text-white hover:bg-violet-500'
                  "
                >
                  {{ inWishlist() ? i18n.t('gameDetail.inWishlist') : i18n.t('gameDetail.addToWishlist') }}
                </button>
              </div>
            </div>

            @if (g.aboutTheGame) {
              <p class="mt-6 text-slate-300 leading-relaxed">{{ g.aboutTheGame }}</p>
            }

            <dl class="mt-6 grid gap-4 sm:grid-cols-2">
              @if (g.developers) {
                <div>
                  <dt class="text-xs uppercase tracking-wide text-slate-500">{{ i18n.t('gameDetail.developers') }}</dt>
                  <dd class="text-slate-300">{{ g.developers }}</dd>
                </div>
              }
              @if (g.publishers) {
                <div>
                  <dt class="text-xs uppercase tracking-wide text-slate-500">{{ i18n.t('gameDetail.publisher') }}</dt>
                  <dd class="text-slate-300">{{ g.publishers }}</dd>
                </div>
              }
              @if (g.releaseDate) {
                <div>
                  <dt class="text-xs uppercase tracking-wide text-slate-500">{{ i18n.t('gameDetail.releaseDate') }}</dt>
                  <dd class="text-slate-300">{{ g.releaseDate }}</dd>
                </div>
              }
              @if (g.price != null) {
                <div>
                  <dt class="text-xs uppercase tracking-wide text-slate-500">{{ i18n.t('gameDetail.price') }}</dt>
                  <dd class="text-slate-300">{{ g.price }} €</dd>
                </div>
              }
            </dl>
          </div>
        </div>

        <section class="mt-10">
          <h2 class="mb-4 text-xl font-semibold text-white">{{ i18n.t('gameDetail.writeReviewTitle') }}</h2>
          <form
            [formGroup]="reviewForm"
            (ngSubmit)="submitReview()"
            class="rounded-xl border border-slate-800 bg-slate-900/80 p-6"
          >
            <label class="mb-4 block">
              <span class="mb-1 block text-sm text-slate-400">{{ i18n.t('gameDetail.commentLabel') }}</span>
              <textarea
                formControlName="comment"
                rows="3"
                class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-violet-500"
              ></textarea>
            </label>
            <label class="mb-4 block">
              <span class="mb-1 block text-sm text-slate-400">{{ i18n.t('gameDetail.scoreLabel') }}</span>
              <input
                formControlName="userScore"
                type="number"
                min="1"
                max="10"
                class="w-24 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-violet-500"
              />
            </label>
            @if (reviewMessage()) {
              <p class="mb-4 text-sm text-emerald-400">{{ reviewMessage() }}</p>
            }
            <button
              type="submit"
              [disabled]="reviewForm.invalid || submittingReview()"
              class="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {{ i18n.t('gameDetail.publishReview') }}
            </button>
          </form>
        </section>

        <section class="mt-10">
          <h2 class="mb-4 text-xl font-semibold text-white">
            {{ i18n.t('gameDetail.topReviewsTitle', { count: reviews().length }) }}
          </h2>
          @if (reviews().length === 0) {
            <p class="text-slate-400">{{ i18n.t('gameDetail.noReviews') }}</p>
          } @else {
            <div class="space-y-4">
              @for (review of reviews(); track review.id) {
                <app-review-card [review]="review" (likeChange)="onLikeChange($event)" />
              }
            </div>
          }
        </section>
      }
    </main>
  `,
})
export class GameDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly gameService = inject(GameService);
  private readonly reviewService = inject(ReviewService);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  readonly i18n = inject(TranslationService);

  readonly loading = signal(true);
  readonly game = signal<Game | null>(null);
  readonly reviews = signal<Review[]>([]);
  readonly inWishlist = signal(false);
  readonly submittingReview = signal(false);
  readonly reviewMessage = signal('');

  readonly reviewForm = this.fb.nonNullable.group({
    comment: ['', Validators.required],
    userScore: [8, [Validators.required, Validators.min(1), Validators.max(10)]],
  });

  private gameName = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.gameName = decodeURIComponent(params.get('name') ?? '');
      this.loadGame();
    });
  }

  toggleWishlist(): void {
    const username = this.auth.getUsername();
    if (!username) return;

    if (this.inWishlist()) {
      this.userService.removeFromWishlist(username, this.gameName).subscribe({
        next: () => this.inWishlist.set(false),
      });
    } else {
      this.userService.addToWishlist(username, this.gameName).subscribe({
        next: () => this.inWishlist.set(true),
      });
    }
  }

  submitReview(): void {
    const username = this.auth.getUsername();
    if (!username || this.reviewForm.invalid) return;

    this.submittingReview.set(true);
    this.reviewService
      .create({
        title: this.gameName,
        username,
        ...this.reviewForm.getRawValue(),
      })
      .subscribe({
        next: () => {
          this.submittingReview.set(false);
          this.reviewMessage.set(this.i18n.t('gameDetail.reviewPublished'));
          this.reviewForm.reset({ comment: '', userScore: 8 });
          this.loadReviews();
        },
        error: () => this.submittingReview.set(false),
      });
  }

  onLikeChange({ reviewId, delta }: LikeChange): void {
    this.reviews.update((list) =>
      list.map((r) =>
        r.id === reviewId ? { ...r, likeCount: r.likeCount + delta } : r,
      ),
    );
  }

  private loadGame(): void {
    this.loading.set(true);

    this.gameService.searchFilter({ name: this.gameName }, 0, 1).subscribe({
      next: (page) => {
        const game = page.content[0] ?? null;
        this.game.set(game);
        this.reviews.set(game?.reviews ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    const username = this.auth.getUsername();
    if (username) {
      this.userService.getWishlist(username).subscribe({
        next: (wishlist) =>
          this.inWishlist.set(wishlist.some((g) => g.name === this.gameName)),
      });
    }
  }

  private loadReviews(): void {
    this.gameService.searchFilter({ name: this.gameName }, 0, 1).subscribe({
      next: (page) => this.reviews.set(page.content[0]?.reviews ?? []),
    });
  }
}
