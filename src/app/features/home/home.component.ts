import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { GameService } from '../../core/services/game.service';
import { ReviewService } from '../../core/services/review.service';
import { UserService } from '../../core/services/user.service';
import { Game } from '../../core/models/game.model';
import { Review } from '../../core/models/review.model';
import { SuggestedUser } from '../../core/models/user.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { GameCardComponent } from '../../shared/components/game-card/game-card.component';
import { ReviewCardComponent } from '../../shared/components/review-card/review-card.component';
import { UserCardComponent } from '../../shared/components/user-card/user-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

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
          Bentornato, {{ username() }} 👋
        </h1>
        <p class="mt-2 text-slate-400">
          Scopri giochi, recensioni e persone in base alle tue interazioni
        </p>
      </section>

      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <div class="grid gap-8 lg:grid-cols-3">
          <div class="space-y-8 lg:col-span-2">
            <section>
              <h2 class="mb-4 text-xl font-semibold text-white">Feed recensioni</h2>
              @if (reviews().length === 0) {
                <p class="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-slate-400">
                  Nessuna recensione disponibile. Esplora i giochi e lascia la tua!
                </p>
              } @else {
                <div class="space-y-4">
                  @for (review of reviews(); track review.id) {
                    <app-review-card
                      [review]="review"
                      (like)="onLikeReview($event)"
                    />
                  }
                </div>
              }
            </section>
          </div>

          <aside class="space-y-8">
            <section>
              <h2 class="mb-4 text-lg font-semibold text-white">Giochi consigliati</h2>
              @if (suggestedGames().length === 0) {
                <p class="text-sm text-slate-500">
                  Interagisci con la piattaforma per ricevere suggerimenti personalizzati.
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
              <h2 class="mb-4 text-lg font-semibold text-white">Persone da seguire</h2>
              @if (suggestedFriends().length === 0) {
                <p class="text-sm text-slate-500">Nessun suggerimento al momento.</p>
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
      }
    </main>
  `,
})
export class HomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly gameService = inject(GameService);
  private readonly reviewService = inject(ReviewService);
  private readonly userService = inject(UserService);

  readonly loading = signal(true);
  readonly username = signal('');
  readonly reviews = signal<Review[]>([]);
  readonly suggestedGames = signal<Game[]>([]);
  readonly suggestedFriends = signal<SuggestedUser[]>([]);
  readonly followedUsernames = signal<Set<string>>(new Set());

  ngOnInit(): void {
    const user = this.auth.getUsername();
    if (!user) return;

    this.username.set(user);

    forkJoin({
      gamesWithReviews: this.gameService.getGamesWithReviews(20),
      suggestedGames: this.gameService.suggestGames(user),
      suggestedFriends: this.userService.getSuggestedFriends(user),
      followed: this.userService.getFollowedUsers(user),
    }).subscribe({
      next: ({ gamesWithReviews, suggestedGames, suggestedFriends, followed }) => {
        this.suggestedGames.set(suggestedGames);
        this.suggestedFriends.set(suggestedFriends);
        this.followedUsernames.set(new Set(followed.map((u) => u.username)));

        const reviews = gamesWithReviews
          .flatMap((g) => g.reviews ?? [])
          .filter((r) => r.id)
          .sort((a, b) => b.likeCount - a.likeCount)
          .slice(0, 15);
        this.reviews.set(reviews);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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

  onLikeReview(reviewId: string): void {
    const current = this.auth.getUsername();
    if (!current) return;

    this.reviewService.likeReview(current, reviewId).subscribe({
      next: () => {
        this.reviews.update((list) =>
          list.map((r) =>
            r.id === reviewId ? { ...r, likeCount: r.likeCount + 1 } : r,
          ),
        );
      },
    });
  }
}
