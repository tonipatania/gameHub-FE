import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { GameService } from '../../core/services/game.service';
import { UserService } from '../../core/services/user.service';
import { Game } from '../../core/models/game.model';
import { Review } from '../../core/models/review.model';
import { SuggestedUser } from '../../core/models/user.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { GameCardComponent } from '../../shared/components/game-card/game-card.component';
import { LikeChange, ReviewCardComponent } from '../../shared/components/review-card/review-card.component';
import { UserCardComponent } from '../../shared/components/user-card/user-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-home',
  imports: [
    NavbarComponent,
    GameCardComponent,
    ReviewCardComponent,
    UserCardComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <app-navbar />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <section class="mb-10">
        <h1 class="text-3xl font-bold text-white">
          {{ i18n.t('home.welcome', { name: username() }) }}
        </h1>
        <p class="mt-2 text-slate-400">
          {{ i18n.t('home.subtitle') }}
        </p>
      </section>

      <div class="grid gap-8 lg:grid-cols-3">
        <div class="space-y-8 lg:col-span-2">
          <section>
            <h2 class="mb-4 text-xl font-semibold text-white">{{ i18n.t('home.reviewFeedTitle') }}</h2>
            @if (reviewsLoading()) {
              <app-loading-spinner />
            } @else if (reviews().length === 0) {
              <p class="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-slate-400">
                {{ i18n.t('home.noReviews') }}
              </p>
            } @else {
              <div class="space-y-4">
                @for (review of reviews(); track review.id) {
                  <app-review-card
                    [review]="review"
                    (likeChange)="onLikeChange($event)"
                  />
                }
              </div>
            }
          </section>
        </div>

        <aside class="space-y-8">
          <section>
            <h2 class="mb-4 text-lg font-semibold text-white">{{ i18n.t('home.suggestedGamesTitle') }}</h2>
            @if (gamesLoading()) {
              <app-loading-spinner />
            } @else if (suggestedGames().length === 0) {
              <p class="text-sm text-slate-500">
                {{ i18n.t('home.noSuggestedGames') }}
              </p>
            } @else {
              <div class="space-y-3">
                @for (game of suggestedGames(); track game.id) {
                  <app-game-card [game]="game" [compact]="true" />
                }
              </div>
            }
          </section>

          <section>
            <h2 class="mb-4 text-lg font-semibold text-white">{{ i18n.t('home.suggestedFriendsTitle') }}</h2>
            @if (friendsLoading()) {
              <app-loading-spinner />
            } @else if (suggestedFriends().length === 0) {
              <p class="text-sm text-slate-500">{{ i18n.t('home.noSuggestedFriends') }}</p>
            } @else {
              <div class="space-y-3">
                @for (user of suggestedFriends(); track user.id) {
                  <app-user-card
                    [user]="user"
                    [showFollowButton]="true"
                    [isFollowing]="isFollowing(user.username)"
                    (followToggle)="onFollow($event)"
                  />
                }
              </div>
            }
          </section>
        </aside>
      </div>
    </main>
  `,
})
export class HomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly gameService = inject(GameService);
  private readonly userService = inject(UserService);
  readonly i18n = inject(TranslationService);

  // Ogni sezione ha il proprio stato di loading e la propria richiesta indipendente: cosi' la
  // Home si popola sezione per sezione invece di restare bloccata su uno spinner unico finche'
  // anche la piu' lenta (i suggerimenti amici, che interrogano il grafo Neo4j) non risponde.
  readonly reviewsLoading = signal(true);
  readonly gamesLoading = signal(true);
  readonly friendsLoading = signal(true);

  readonly username = signal('');
  readonly reviews = signal<Review[]>([]);
  readonly suggestedGames = signal<Game[]>([]);
  readonly suggestedFriends = signal<SuggestedUser[]>([]);
  readonly followedUsernames = signal<Set<string>>(new Set());

  ngOnInit(): void {
    const user = this.auth.getUsername();
    if (!user) return;

    this.username.set(user);

    this.gameService.getGamesWithReviews(20).subscribe({
      next: (gamesWithReviews) => {
        const reviews = gamesWithReviews
          .flatMap((g) => g.reviews ?? [])
          .filter((r) => r.id)
          .sort((a, b) => b.likeCount - a.likeCount)
          .slice(0, 15);
        this.reviews.set(reviews);
        this.reviewsLoading.set(false);
      },
      error: () => this.reviewsLoading.set(false),
    });

    this.gameService.suggestGames(user).subscribe({
      next: (games) => {
        this.suggestedGames.set(games);
        this.gamesLoading.set(false);
      },
      error: () => this.gamesLoading.set(false),
    });

    // suggestedFriends e followed restano uniti: la card dei suggerimenti deve gia' sapere chi e'
    // seguito al primo render, per mostrare subito lo stato corretto del pulsante Segui.
    forkJoin({
      suggestedFriends: this.userService.getSuggestedFriends(user),
      followed: this.userService.getFollowedUsers(user),
    }).subscribe({
      next: ({ suggestedFriends, followed }) => {
        this.suggestedFriends.set(suggestedFriends);
        this.followedUsernames.set(new Set(followed.map((u) => u.username)));
        this.friendsLoading.set(false);
      },
      error: () => this.friendsLoading.set(false),
    });
  }

  isFollowing(username: string): boolean {
    return this.followedUsernames().has(username);
  }

  onFollow(username: string): void {
    const current = this.auth.getUsername();
    if (!current || this.isFollowing(username)) return;

    this.userService.followUser(current, username).subscribe({
      next: () => {
        const updated = new Set(this.followedUsernames());
        updated.add(username);
        this.followedUsernames.set(updated);
      },
    });
  }

  onLikeChange({ reviewId, delta }: LikeChange): void {
    this.reviews.update((list) =>
      list.map((r) =>
        r.id === reviewId ? { ...r, likeCount: r.likeCount + delta } : r,
      ),
    );
  }
}
