import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { GameService } from '../../core/services/game.service';
import { UserService } from '../../core/services/user.service';
import { ActivityItem } from '../../core/models/activity.model';
import { Game } from '../../core/models/game.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { GameCardComponent } from '../../shared/components/game-card/game-card.component';
import { ActivityCardComponent } from '../../shared/components/activity-card/activity-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TranslationService } from '../../core/services/translation.service';

interface RankedGame {
  game: Game;
  badge: string;
}

@Component({
  selector: 'app-home',
  imports: [NavbarComponent, GameCardComponent, ActivityCardComponent, LoadingSpinnerComponent],
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
            <h2 class="mb-4 text-xl font-semibold text-white">
              {{ i18n.t('home.topRankedTitle') }}
            </h2>
            @if (rankingLoading()) {
              <app-loading-spinner />
            } @else if (topRankedGames().length === 0) {
              <p class="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-slate-400">
                {{ i18n.t('home.noRankedGames') }}
              </p>
            } @else {
              <div class="grid gap-5 sm:grid-cols-2">
                @for (item of topRankedGames(); track item.game.id) {
                  <app-game-card [game]="item.game" [badge]="item.badge" />
                }
              </div>
            }
          </section>
        </div>

        <aside>
          <h2 class="mb-4 text-lg font-semibold text-white">{{ i18n.t('activityFeed.title') }}</h2>
          @if (activityLoading()) {
            <app-loading-spinner />
          } @else if (activities().length === 0) {
            <p class="text-sm text-slate-500">{{ i18n.t('activityFeed.empty') }}</p>
          } @else {
            <div class="space-y-3">
              @for (
                activity of activities();
                track activity.createdAt + activity.username + activity.gameName
              ) {
                <app-activity-card [activity]="activity" />
              }
            </div>
            @if (activityHasMore()) {
              <button
                type="button"
                (click)="loadMoreActivity()"
                [disabled]="activityLoadingMore()"
                class="mt-4 w-full rounded-lg border border-slate-700 py-2 text-sm text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {{
                  activityLoadingMore()
                    ? i18n.t('activityFeed.loadingMore')
                    : i18n.t('activityFeed.loadMore')
                }}
              </button>
            }
          }
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
  // anche la piu' lenta non risponde.
  readonly rankingLoading = signal(true);
  readonly activityLoading = signal(true);
  readonly activityLoadingMore = signal(false);

  readonly username = signal('');
  readonly topRankedGames = signal<RankedGame[]>([]);
  readonly activities = signal<ActivityItem[]>([]);
  readonly activityPage = signal(0);
  readonly activityHasMore = signal(false);

  ngOnInit(): void {
    const user = this.auth.getUsername();
    if (!user) return;

    this.username.set(user);

    this.gameService.getGamesWithReviews(50).subscribe({
      next: (games) => {
        const ranked = games
          .filter((g) => (g.reviews?.length ?? 0) > 0)
          .map((g) => {
            const scores = g.reviews!.map((r) => r.userScore);
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            return { game: g, score: Math.round(avg * 10) / 10 };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map((item, index) => ({
            game: item.game,
            badge: `#${index + 1} · ${item.score}/10`,
          }));
        this.topRankedGames.set(ranked);
        this.rankingLoading.set(false);
      },
      error: () => this.rankingLoading.set(false),
    });

    this.userService.getFriendsActivity(user, 0).subscribe({
      next: (page) => {
        this.activities.set(page.content);
        this.activityHasMore.set(!page.last);
        this.activityLoading.set(false);
      },
      error: () => this.activityLoading.set(false),
    });
  }

  loadMoreActivity(): void {
    const user = this.auth.getUsername();
    if (!user || this.activityLoadingMore()) return;

    this.activityLoadingMore.set(true);
    const nextPage = this.activityPage() + 1;
    this.userService.getFriendsActivity(user, nextPage).subscribe({
      next: (page) => {
        this.activities.update((list) => [...list, ...page.content]);
        this.activityPage.set(nextPage);
        this.activityHasMore.set(!page.last);
        this.activityLoadingMore.set(false);
      },
      error: () => this.activityLoadingMore.set(false),
    });
  }
}
