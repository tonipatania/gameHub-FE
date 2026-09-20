import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { ActivityItem, CommunityHighlights } from '../../core/models/activity.model';
import { SuggestedUser } from '../../core/models/user.model';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { ActivityCardComponent } from '../../shared/components/activity-card/activity-card.component';
import { UserCardComponent } from '../../shared/components/user-card/user-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TranslationService } from '../../core/services/translation.service';

// Sotto questa soglia il feed e' troppo scarno per bastare da solo: si affiancano le persone
// suggerite, cosi la Home non resta una pagina quasi vuota per chi segue poche persone.
export const SPARSE_FEED_THRESHOLD = 5;

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    PageLayoutComponent,
    ActivityCardComponent,
    UserCardComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <app-page-layout>
      <div
        class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_26rem] 2xl:grid-cols-[minmax(0,1fr)_32rem]"
      >
        <section aria-labelledby="feed-title" class="min-w-0">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h1 id="feed-title" class="gh-section-title">
              {{ i18n.t('home.feedTitle') }}
            </h1>
            @if (remainingNew() > 0) {
              <span
                class="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-300"
              >
                {{ i18n.t('home.newCount', { count: remainingNew() }) }}
              </span>
            }
          </div>

          @if (activityLoading()) {
            <app-loading-spinner />
          } @else if (activities().length === 0) {
            <p class="gh-card p-6 text-slate-400">
              {{ i18n.t('home.feedEmpty') }}
            </p>
          } @else {
            <div class="space-y-4">
              @for (activity of activities(); track activity.id; let i = $index) {
                @if (i === 0 && activity.unseen) {
                  <h2 class="text-xs font-semibold uppercase tracking-wide text-violet-300">
                    {{ i18n.t('home.sectionNew') }}
                  </h2>
                } @else if (i > 0 && !activity.unseen && activities()[i - 1].unseen) {
                  <h2 class="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {{ i18n.t('home.sectionEarlier') }}
                  </h2>
                }
                <app-activity-card [activity]="activity" (seen)="onActivitySeen(activity)" />
              }
            </div>
            @if (activityHasMore()) {
              <button
                type="button"
                (click)="loadMoreActivity()"
                [disabled]="activityLoadingMore()"
                class="gh-btn gh-btn-outline mt-5 w-full"
              >
                {{
                  activityLoadingMore()
                    ? i18n.t('activityFeed.loadingMore')
                    : i18n.t('activityFeed.loadMore')
                }}
              </button>
            }
          }

          @if (showSuggestions() && suggestions().length > 0) {
            <section class="mt-8" aria-labelledby="suggestions-title">
              <h2 id="suggestions-title" class="gh-section-title mb-3">
                {{ i18n.t('home.suggestionsTitle') }}
              </h2>
              <p class="mb-4 text-sm text-slate-400">{{ i18n.t('home.suggestionsHint') }}</p>
              <div class="gh-user-grid">
                @for (user of suggestions(); track user.id) {
                  <app-user-card
                    [user]="user"
                    [showFollowButton]="true"
                    [isFollowing]="followed().has(user.username)"
                    (followToggle)="toggleFollow($event)"
                  />
                }
              </div>
            </section>
          }
        </section>

        <aside
          class="space-y-6 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1"
          aria-labelledby="community-title"
        >
          <h2 id="community-title" class="gh-section-title">
            {{ i18n.t('community.title') }}
          </h2>

          @if (highlightsLoading()) {
            <app-loading-spinner />
          } @else if (
            highlights().trendingReviews.length === 0 && highlights().hotGames.length === 0
          ) {
            <p class="gh-card p-5 text-sm text-slate-400">
              {{ i18n.t('community.empty') }}
            </p>
          } @else {
            @if (highlights().trendingReviews.length > 0) {
              <section class="gh-card p-4">
                <h3 class="mb-3 text-sm font-semibold text-white">
                  🔥 {{ i18n.t('community.trendingReviews') }}
                </h3>
                <ul class="space-y-3">
                  @for (item of highlights().trendingReviews; track item.review.id) {
                    <li>
                      <a
                        [routerLink]="['/games', encodeName(item.review.title)]"
                        class="flex gap-3 rounded-lg p-2 transition hover:bg-slate-800/70"
                      >
                        @if (item.gameHeaderImage) {
                          <img
                            [src]="item.gameHeaderImage"
                            [alt]="item.review.title"
                            class="h-14 w-24 shrink-0 rounded-md object-cover"
                          />
                        }
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-xs text-slate-400">
                            <span class="font-semibold text-violet-300">{{
                              item.review.username
                            }}</span>
                            · {{ item.review.title }}
                          </p>
                          <p class="mt-0.5 line-clamp-2 text-sm text-slate-200">
                            {{ item.review.comment }}
                          </p>
                          <p class="mt-1 text-xs font-medium text-rose-300">
                            {{
                              i18n.t('community.recentLikes', {
                                count: item.recentLikes,
                                window: windowLabel(item.windowHours),
                              })
                            }}
                          </p>
                        </div>
                      </a>
                    </li>
                  }
                </ul>
              </section>
            }

            @if (highlights().hotGames.length > 0) {
              <section class="gh-card p-4">
                <h3 class="mb-3 text-sm font-semibold text-white">
                  ⭐ {{ i18n.t('community.hotGames') }}
                </h3>
                <ul class="space-y-2">
                  @for (item of highlights().hotGames; track item.game.id) {
                    <li>
                      <a
                        [routerLink]="['/games', encodeName(item.game.name)]"
                        class="flex items-center gap-3 rounded-lg p-2 transition hover:bg-slate-800/70"
                      >
                        @if (item.game.headerImage) {
                          <img
                            [src]="item.game.headerImage"
                            [alt]="item.game.name"
                            class="h-11 w-20 shrink-0 rounded-md object-cover"
                          />
                        }
                        <div class="min-w-0">
                          <p class="truncate text-sm font-medium text-white">
                            {{ item.game.name }}
                          </p>
                          <p class="text-xs text-slate-400">
                            {{
                              i18n.t('community.wishlistAdds', { count: item.recentWishlistAdds })
                            }}
                          </p>
                        </div>
                      </a>
                    </li>
                  }
                </ul>
              </section>
            }
          }
        </aside>
      </div>
    </app-page-layout>
  `,
})
export class HomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  readonly i18n = inject(TranslationService);

  // Ogni sezione ha il proprio stato di loading e la propria richiesta indipendente: cosi' la
  // Home si popola sezione per sezione invece di restare bloccata su uno spinner unico finche'
  // anche la piu' lenta non risponde.
  readonly activityLoading = signal(true);
  readonly activityLoadingMore = signal(false);
  readonly highlightsLoading = signal(true);

  readonly activities = signal<ActivityItem[]>([]);
  readonly activityPage = signal(0);
  readonly activityHasMore = signal(false);
  readonly highlights = signal<CommunityHighlights>({ trendingReviews: [], hotGames: [] });

  // fallback per un feed vuoto o scarno: persone da seguire (stessa fonte della pagina Community)
  readonly suggestions = signal<SuggestedUser[]>([]);
  readonly followed = signal<ReadonlySet<string>>(new Set());
  readonly showSuggestions = computed(
    () =>
      !this.activityLoading() &&
      !this.activityHasMore() &&
      this.activities().length < SPARSE_FEED_THRESHOLD,
  );

  // Attivita' che l'utente ha guardato in questa sessione (vedi onActivitySeen): il badge
  // "nuove" scende man mano che le scorre. Il flag `unseen` dell'attivita' resta com'era al
  // caricamento, cosi le card non cambiano aspetto sotto gli occhi.
  private readonly seenIds = signal<ReadonlySet<string>>(new Set());
  readonly remainingNew = computed(
    () => this.activities().filter((a) => a.unseen && !this.seenIds().has(a.id)).length,
  );

  private bookmarkSentFor: string | null = null;
  private suggestionsRequested = false;

  ngOnInit(): void {
    if (!this.auth.getUsername()) return;

    this.userService.getFriendsActivity(0).subscribe({
      next: (page) => {
        this.activities.set(page.content);
        this.activityHasMore.set(!page.last);
        this.activityLoading.set(false);
        this.loadSuggestionsIfNeeded();
      },
      error: () => {
        this.activityLoading.set(false);
        this.loadSuggestionsIfNeeded();
      },
    });

    this.userService.getCommunityHighlights().subscribe({
      next: (result) => {
        this.highlights.set(result);
        this.highlightsLoading.set(false);
      },
      error: () => this.highlightsLoading.set(false),
    });
  }

  loadMoreActivity(): void {
    if (this.activityLoadingMore()) return;

    this.activityLoadingMore.set(true);
    const nextPage = this.activityPage() + 1;
    this.userService.getFriendsActivity(nextPage).subscribe({
      next: (page) => {
        this.activities.update((list) => [...list, ...page.content]);
        this.activityPage.set(nextPage);
        this.activityHasMore.set(!page.last);
        this.activityLoadingMore.set(false);
      },
      error: () => this.activityLoadingMore.set(false),
    });
  }

  // Il post e' rimasto in vista abbastanza a lungo da contare come letto. Il "segnalibro" sul
  // server avanza all'attivita' piu' recente solo quando l'utente ha guardato tutte le novita'
  // caricate e la prima del feed: una scorsa parziale non deve far sparire dalle "nuove" quelle
  // che non ha ancora visto.
  onActivitySeen(activity: ActivityItem): void {
    this.seenIds.update((ids) => new Set(ids).add(activity.id));
    this.advanceBookmark();
  }

  toggleFollow(username: string): void {
    const current = this.auth.getUsername();
    if (!current) return;

    const isFollowing = this.followed().has(username);
    const request = isFollowing
      ? this.userService.unfollowUser(current, username)
      : this.userService.followUser(current, username);

    request.subscribe({
      next: () =>
        this.followed.update((set) => {
          const updated = new Set(set);
          if (isFollowing) {
            updated.delete(username);
          } else {
            updated.add(username);
          }
          return updated;
        }),
    });
  }

  windowLabel(hours: number): string {
    return hours >= 168
      ? this.i18n.t('community.lastWeek')
      : this.i18n.t('community.lastHours', { hours });
  }

  encodeName(name: string): string {
    return encodeURIComponent(name);
  }

  private advanceBookmark(): void {
    const newest = this.activities()[0];
    if (!newest) return;

    const seen = this.seenIds();
    const stillUnseen = this.activities().some((a) => a.unseen && !seen.has(a.id));
    if (stillUnseen || !seen.has(newest.id) || this.bookmarkSentFor === newest.createdAt) return;

    this.bookmarkSentFor = newest.createdAt;
    this.userService.markActivitySeen(newest.createdAt).subscribe({
      // si riprovera' alla prossima attivita' vista
      error: () => (this.bookmarkSentFor = null),
    });
  }

  private loadSuggestionsIfNeeded(): void {
    const username = this.auth.getUsername();
    if (!username || this.suggestionsRequested || !this.showSuggestions()) return;

    this.suggestionsRequested = true;
    this.userService.getSuggestedFriends(username).subscribe({
      next: (list) => this.suggestions.set(list),
      error: () => undefined,
    });
  }
}
