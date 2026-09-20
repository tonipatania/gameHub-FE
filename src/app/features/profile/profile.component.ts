import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { Game, Page } from '../../core/models/game.model';
import { UserNeo4j } from '../../core/models/user.model';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BackButtonComponent } from '../../shared/components/back-button/back-button.component';
import { GameCardComponent } from '../../shared/components/game-card/game-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TranslationService } from '../../core/services/translation.service';

type WishlistSortKey = 'name' | 'price' | 'release';

@Component({
  selector: 'app-profile',
  imports: [
    PageLayoutComponent,
    PaginationComponent,
    BackButtonComponent,
    GameCardComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <app-page-layout>
      <app-back-button />
      @if (loading()) {
        <app-loading-spinner />
      } @else if (!user()) {
        <p class="text-center text-slate-400">{{ i18n.t('profile.notFound') }}</p>
      } @else {
        <div class="mb-8 flex items-center gap-4">
          <div
            class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-2xl font-bold text-white"
          >
            {{ user()!.username.slice(0, 2).toUpperCase() }}
          </div>
          <div>
            <h1 class="gh-page-title break-all">{{ user()!.username }}</h1>
            <p class="text-slate-400">{{ i18n.t('profile.subtitle') }}</p>
          </div>
        </div>

        @if (!isOwnProfile()) {
          <button
            type="button"
            (click)="toggleFollow()"
            class="gh-btn mb-8 px-6"
            [class]="isFollowing() ? 'gh-btn-muted' : 'gh-btn-primary'"
          >
            {{ isFollowing() ? i18n.t('profile.unfollowButton') : i18n.t('profile.followButton') }}
          </button>
        }

        <section>
          <h2 class="gh-section-title mb-4">
            {{ i18n.t('profile.wishlistTitle') }}
          </h2>

          @if (wishlistTotal() > 0) {
            <dl class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:max-w-3xl">
              <div class="gh-tile">
                <dt class="gh-eyebrow">
                  {{ i18n.t('profile.statsGames') }}
                </dt>
                <dd class="mt-1 text-2xl font-bold text-white">{{ wishlistTotal() }}</dd>
              </div>
              @if (!isOwnProfile()) {
                <div class="gh-tile">
                  <dt class="gh-eyebrow">
                    {{ i18n.t('profile.statsCommon') }}
                  </dt>
                  <dd class="mt-1 text-2xl font-bold text-violet-300">{{ commonCount() }}</dd>
                </div>
              }
              <div class="gh-tile">
                <dt class="gh-eyebrow">
                  {{ i18n.t('profile.statsPage') }}
                </dt>
                <dd class="mt-1 text-2xl font-bold text-white">
                  {{ wishlistPageIndex() + 1 }}/{{ wishlistTotalPages() }}
                </dd>
              </div>
            </dl>
          }

          @if (wishlist().length === 0) {
            <p class="text-slate-400">{{ i18n.t('profile.emptyWishlist') }}</p>
          } @else {
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              @if (!isOwnProfile() && commonCount() > 0) {
                <div class="gh-segmented">
                  <button
                    type="button"
                    (click)="setOnlyCommon(false)"
                    [disabled]="navigatingWishlist()"
                    class="gh-segment"
                    [class.gh-segment-active]="!onlyCommon()"
                  >
                    {{ i18n.t('profile.allTab', { count: wishlistTotalAll() }) }}
                  </button>
                  <button
                    type="button"
                    (click)="setOnlyCommon(true)"
                    [disabled]="navigatingWishlist()"
                    class="gh-segment"
                    [class.gh-segment-active]="onlyCommon()"
                  >
                    {{ i18n.t('profile.onlyCommonTab', { count: commonCount() }) }}
                  </button>
                </div>
              } @else {
                <span class="text-sm text-slate-400">{{ i18n.t('profile.sortByLabel') }}</span>
              }
              <div class="gh-segmented">
                @for (option of sortOptions; track option.key) {
                  <button
                    type="button"
                    (click)="changeSort(option.key)"
                    [disabled]="navigatingWishlist()"
                    class="gh-segment"
                    [class.gh-segment-active]="wishlistSort() === option.key"
                  >
                    {{ i18n.t(option.labelKey) }}
                  </button>
                }
              </div>
            </div>

            <div class="gh-game-grid">
              @for (game of wishlist(); track game.id) {
                <app-game-card
                  [game]="game"
                  [showPrice]="true"
                  [badge]="isCommon(game.name) ? i18n.t('profile.commonBadge') : ''"
                />
              }
            </div>

            @if (wishlistTotalPages() > 1) {
              <app-pagination
                class="mt-6"
                [page]="wishlistPageIndex()"
                [totalPages]="wishlistTotalPages()"
                [disabled]="navigatingWishlist()"
                (prev)="prevWishlistPage()"
                (next)="nextWishlistPage()"
              />
            }
          }
        </section>
      }
    </app-page-layout>
  `,
})
export class ProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  readonly i18n = inject(TranslationService);

  readonly loading = signal(true);
  readonly user = signal<UserNeo4j | null>(null);
  readonly wishlist = signal<Game[]>([]);
  readonly wishlistPageIndex = signal(0);
  readonly wishlistTotalPages = signal(1);
  readonly wishlistTotal = signal(0);
  readonly navigatingWishlist = signal(false);
  readonly wishlistSort = signal<WishlistSortKey>('name');
  readonly onlyCommon = signal(false);
  readonly commonGames = signal<Set<string>>(new Set());
  // totale della wishlist completa: con il filtro attivo wishlistTotal() vale solo il sottoinsieme
  readonly wishlistTotalAll = signal(0);
  readonly isFollowing = signal(false);

  readonly sortOptions: { key: WishlistSortKey; labelKey: string }[] = [
    { key: 'name', labelKey: 'profile.sortName' },
    { key: 'price', labelKey: 'profile.sortPrice' },
    { key: 'release', labelKey: 'profile.sortRelease' },
  ];

  private static readonly WISHLIST_PAGE_SIZE = 12;

  commonCount(): number {
    return this.commonGames().size;
  }

  isCommon(gameName: string): boolean {
    return this.commonGames().has(gameName);
  }

  changeSort(key: WishlistSortKey): void {
    if (this.wishlistSort() === key || this.navigatingWishlist()) return;
    this.wishlistSort.set(key);
    // si torna a pagina 1: cambiando ordinamento l'indice di pagina corrente non ha piu senso
    this.loadWishlistPage(0);
  }

  setOnlyCommon(value: boolean): void {
    if (this.onlyCommon() === value || this.navigatingWishlist()) return;
    this.onlyCommon.set(value);
    // il filtro cambia il numero di pagine, quindi si riparte dalla prima
    this.loadWishlistPage(0);
  }

  private profileUsername = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.profileUsername = params.get('username') ?? '';
      this.loadProfile();
    });
  }

  isOwnProfile(): boolean {
    return this.auth.getUsername() === this.profileUsername;
  }

  encodeName(name: string): string {
    return encodeURIComponent(name);
  }

  toggleFollow(): void {
    const current = this.auth.getUsername();
    if (!current) return;

    if (this.isFollowing()) {
      this.userService.unfollowUser(current, this.profileUsername).subscribe({
        next: () => this.isFollowing.set(false),
      });
    } else {
      this.userService.followUser(current, this.profileUsername).subscribe({
        next: () => this.isFollowing.set(true),
      });
    }
  }

  private loadProfile(): void {
    this.loading.set(true);
    const current = this.auth.getUsername() ?? '';

    this.wishlistSort.set('name');
    this.onlyCommon.set(false);

    forkJoin({
      user: this.userService.getUser(this.profileUsername),
      wishlist: this.userService.getWishlistPage(
        current,
        this.profileUsername,
        0,
        ProfileComponent.WISHLIST_PAGE_SIZE,
        this.wishlistSort(),
        false,
      ),
      // sul proprio profilo "in comune" non ha senso, quindi si evita anche la richiesta
      common:
        current && current !== this.profileUsername
          ? this.userService.getCommonWishlistGames(current, this.profileUsername)
          : of([]),
      following: current ? this.userService.getFollowedUsers(current) : [],
    }).subscribe({
      next: ({ user, wishlist, common, following }) => {
        this.user.set(user);
        this.applyWishlistPage(wishlist);
        this.commonGames.set(new Set(common.map((g) => g.name)));
        this.isFollowing.set(following.some((u) => u.username === this.profileUsername));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private applyWishlistPage(page: Page<Game>): void {
    this.wishlist.set(page.content);
    if (!this.onlyCommon()) {
      this.wishlistTotalAll.set(page.totalElements);
    }
    this.wishlistPageIndex.set(page.number);
    // totalPages arriva 0 quando la wishlist e' vuota: si normalizza a 1 per non mostrare
    // "Pagina 1 di 0" nel controllo di paginazione
    this.wishlistTotalPages.set(Math.max(page.totalPages, 1));
    this.wishlistTotal.set(page.totalElements);
  }

  private loadWishlistPage(pageIndex: number): void {
    const current = this.auth.getUsername() ?? '';
    this.navigatingWishlist.set(true);

    this.userService
      .getWishlistPage(
        current,
        this.profileUsername,
        pageIndex,
        ProfileComponent.WISHLIST_PAGE_SIZE,
        this.wishlistSort(),
        this.onlyCommon(),
      )
      .subscribe({
        next: (page) => {
          this.applyWishlistPage(page);
          this.navigatingWishlist.set(false);
        },
        error: () => this.navigatingWishlist.set(false),
      });
  }

  prevWishlistPage(): void {
    if (this.wishlistPageIndex() > 0 && !this.navigatingWishlist()) {
      this.loadWishlistPage(this.wishlistPageIndex() - 1);
    }
  }

  nextWishlistPage(): void {
    if (this.wishlistPageIndex() < this.wishlistTotalPages() - 1 && !this.navigatingWishlist()) {
      this.loadWishlistPage(this.wishlistPageIndex() + 1);
    }
  }
}
