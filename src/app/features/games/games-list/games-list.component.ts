import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { GameService } from '../../../core/services/game.service';
import { UserService } from '../../../core/services/user.service';
import { Game, GameRails } from '../../../core/models/game.model';
import { PageLayoutComponent } from '../../../shared/components/page-layout/page-layout.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { GameCardComponent } from '../../../shared/components/game-card/game-card.component';
import { GameRailComponent } from '../../../shared/components/game-rail/game-rail.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-games',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageLayoutComponent,
    PageHeaderComponent,
    PaginationComponent,
    GameCardComponent,
    GameRailComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <app-page-layout>
      <app-page-header [title]="i18n.t('games.title')" [subtitle]="i18n.t('games.subtitle')">
        <div class="gh-segmented">
          <button
            type="button"
            (click)="showDiscover()"
            class="gh-segment"
            [class.gh-segment-active]="showRails()"
          >
            {{ i18n.t('games.viewDiscover') }}
          </button>
          <button
            type="button"
            (click)="openCatalog()"
            class="gh-segment"
            [class.gh-segment-active]="!showRails()"
          >
            {{ i18n.t('games.viewCatalog') }}
          </button>
        </div>
        <form [formGroup]="filterForm" class="flex w-full flex-wrap gap-3 sm:w-auto">
          <input
            formControlName="name"
            [placeholder]="i18n.t('games.searchPlaceholder')"
            class="gh-input min-w-0 flex-1 sm:w-72 sm:flex-none"
          />

          <div class="relative">
            <button
              type="button"
              (click)="genresMenuOpen.set(!genresMenuOpen())"
              class="gh-input flex w-auto cursor-pointer items-center gap-2"
            >
              @if (selectedGenres().size === 0) {
                {{ i18n.t('games.genresLabel') }}
              } @else {
                {{ i18n.t('games.genresLabelCount', { count: selectedGenres().size }) }}
              }
              <span class="text-slate-500">▾</span>
            </button>

            @if (genresMenuOpen()) {
              <div class="fixed inset-0 z-10" (click)="genresMenuOpen.set(false)"></div>
              <div
                class="absolute right-0 z-20 mt-2 max-h-64 w-56 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 p-2 shadow-xl"
              >
                @if (allGenres().length === 0) {
                  <p class="px-2 py-1 text-sm text-slate-500">
                    {{ i18n.t('games.noGenresAvailable') }}
                  </p>
                }
                @for (genre of allGenres(); track genre) {
                  <label
                    class="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
                  >
                    <input
                      type="checkbox"
                      [checked]="selectedGenres().has(genre)"
                      (change)="toggleGenre(genre)"
                      class="rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500"
                    />
                    {{ genre }}
                  </label>
                }
              </div>
            }
          </div>
        </form>
      </app-page-header>

      <div #topAnchor></div>

      @if (showRails()) {
        @if (railsLoading()) {
          <app-loading-spinner />
        } @else if (!hasRails()) {
          <div class="gh-panel p-10 text-center">
            <p class="text-slate-400">{{ i18n.t('games.railsUnavailable') }}</p>
            <button type="button" (click)="openCatalog()" class="gh-btn gh-btn-primary mt-4 px-5">
              {{ i18n.t('games.openCatalog') }}
            </button>
          </div>
        } @else {
          @if (featured(); as hero) {
            <section
              class="relative mb-10 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
            >
              @if (hero.url?.headerImage) {
                <img
                  [src]="hero.url!.headerImage"
                  [alt]="hero.name"
                  class="absolute inset-y-0 right-0 h-full w-full object-cover opacity-60 sm:w-3/5 sm:opacity-100"
                />
              }
              <div
                class="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent sm:via-slate-950/70"
              ></div>
              <div class="relative flex min-h-64 max-w-2xl flex-col justify-end gap-3 p-6 sm:p-10">
                <span class="gh-eyebrow !text-violet-300">{{ i18n.t('games.heroEyebrow') }}</span>
                <h2 class="text-3xl font-black text-white sm:text-4xl">{{ hero.name }}</h2>
                @if (hero.genres) {
                  <p class="text-sm text-slate-300">{{ hero.genres }}</p>
                }
                <div class="mt-2 flex flex-wrap items-center gap-3">
                  <a
                    [routerLink]="['/games', encodeName(hero.name)]"
                    class="gh-btn gh-btn-primary px-5 py-2.5"
                  >
                    {{ i18n.t('games.heroCta') }}
                  </a>
                  <button
                    type="button"
                    (click)="toggleWishlist(hero.name)"
                    class="gh-btn px-5 py-2.5"
                    [class]="isInWishlist(hero.name) ? 'gh-btn-danger-soft' : 'gh-btn-muted'"
                  >
                    {{
                      isInWishlist(hero.name)
                        ? i18n.t('gameCard.inWishlist')
                        : i18n.t('gameCard.addWishlist')
                    }}
                  </button>
                  @if (hero.avgScore) {
                    <span
                      class="rounded-full bg-emerald-500/90 px-3 py-1 text-sm font-semibold text-white"
                    >
                      {{ hero.avgScore }}/10
                    </span>
                  }
                </div>
              </div>
            </section>
          }

          <div class="space-y-10">
            @if (rails()!.weekly.length > 0) {
              <app-game-rail
                [title]="i18n.t('games.railWeekly')"
                [subtitle]="i18n.t('games.railWeeklyHint')"
                [games]="rails()!.weekly"
                [ranked]="true"
                [wishlistNames]="wishlistNames()"
                (wishlistToggle)="toggleWishlist($event)"
              />
            }
            @if (rails()!.favorites.length > 0) {
              <app-game-rail
                [title]="i18n.t('games.railFavorites')"
                [subtitle]="i18n.t('games.railFavoritesHint')"
                [games]="rails()!.favorites"
                [wishlistNames]="wishlistNames()"
                (wishlistToggle)="toggleWishlist($event)"
              />
            }
            @if (rails()!.latest.length > 0) {
              <app-game-rail
                [title]="i18n.t('games.railLatest')"
                [subtitle]="i18n.t('games.railLatestHint')"
                [games]="rails()!.latest"
                [wishlistNames]="wishlistNames()"
                (wishlistToggle)="toggleWishlist($event)"
              />
            }
          </div>

          <div class="mt-12 text-center">
            <button type="button" (click)="openCatalog()" class="gh-btn gh-btn-outline px-6 py-2.5">
              {{ i18n.t('games.openCatalog') }}
            </button>
          </div>
        }
      } @else if (loading() && games().length === 0) {
        <app-loading-spinner />
      } @else if (games().length === 0) {
        <p class="text-center text-slate-400">{{ i18n.t('games.noGamesFound') }}</p>
      } @else {
        <div
          class="gh-game-grid transition-opacity duration-150"
          [class.opacity-50]="navigating()"
          [class.pointer-events-none]="navigating()"
        >
          @for (game of games(); track game.id) {
            <app-game-card
              [game]="game"
              [showWishlistButton]="true"
              [inWishlist]="isInWishlist(game.name)"
              (wishlistToggle)="toggleWishlist($event)"
            />
          }
        </div>

        <app-pagination
          class="mt-8"
          [page]="currentPage()"
          [totalPages]="totalPages()"
          [disabled]="navigating()"
          (prev)="prevPage()"
          (next)="nextPage()"
        />
      }
    </app-page-layout>
  `,
})
export class GamesComponent implements OnInit {
  private readonly gameService = inject(GameService);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  readonly i18n = inject(TranslationService);

  private readonly topAnchor = viewChild<ElementRef<HTMLElement>>('topAnchor');

  readonly loading = signal(false);
  readonly navigating = signal(false);
  readonly railsLoading = signal(true);
  readonly rails = signal<GameRails | null>(null);
  // vista "Catalogo": la griglia A-Z di tutti i giochi, aperta dall'utente o dalla ricerca
  readonly catalogOpen = signal(false);
  readonly hasFilter = signal(false);
  readonly games = signal<Game[]>([]);
  readonly currentPage = signal(0);
  readonly totalPages = signal(1);
  readonly isSearching = signal(false);
  readonly wishlistNames = signal<Set<string>>(new Set());
  readonly allGenres = signal<string[]>([]);
  readonly selectedGenres = signal<Set<string>>(new Set());
  readonly genresMenuOpen = signal(false);

  readonly filterForm = this.fb.nonNullable.group({
    name: [''],
  });

  // gli scaffali sono la vista di default; cercare o filtrare per genere mostra i risultati in
  // griglia, e "Catalogo" e' la griglia A-Z senza filtri
  readonly showRails = computed(() => !this.catalogOpen() && !this.hasFilter());
  readonly hasRails = computed(() => {
    const rails = this.rails();
    return !!rails && rails.weekly.length + rails.favorites.length + rails.latest.length > 0;
  });
  // il gioco in vetrina e' il primo della settimana
  readonly featured = computed(() => this.rails()?.weekly[0] ?? null);

  ngOnInit(): void {
    this.loadWishlist();
    this.loadRails();
    this.gameService.getGenres().subscribe((genres) => this.allGenres.set(genres));

    this.filterForm.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.applyFilter());
  }

  toggleGenre(genre: string): void {
    const updated = new Set(this.selectedGenres());
    if (updated.has(genre)) {
      updated.delete(genre);
    } else {
      updated.add(genre);
    }
    this.selectedGenres.set(updated);
    this.applyFilter();
  }

  showDiscover(): void {
    this.catalogOpen.set(false);
    this.hasFilter.set(false);
    this.selectedGenres.set(new Set());
    // emitEvent false: si azzera la ricerca senza far partire il debounce, che ricaricherebbe
    // una griglia che non si vede piu'
    this.filterForm.reset({ name: '' }, { emitEvent: false });
  }

  openCatalog(): void {
    if (this.catalogOpen()) return;
    this.catalogOpen.set(true);
    if (!this.hasFilter()) this.loadGames(0);
  }

  private loadRails(): void {
    this.railsLoading.set(true);
    this.gameService.getRails().subscribe({
      next: (rails) => {
        this.rails.set(rails);
        this.railsLoading.set(false);
      },
      error: () => this.railsLoading.set(false),
    });
  }

  loadGames(page: number): void {
    this.loading.set(true);
    this.isSearching.set(false);
    this.gameService.getAll(page, 24).subscribe({
      next: (result) => {
        this.games.set(result.content);
        this.currentPage.set(result.number);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);
        this.navigating.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.navigating.set(false);
      },
    });
  }

  applyFilter(page = 0): void {
    const { name } = this.filterForm.getRawValue();
    const genres = Array.from(this.selectedGenres());
    if (!name && genres.length === 0) {
      this.hasFilter.set(false);
      // senza filtri si torna agli scaffali, a meno che l'utente non stia sfogliando il catalogo
      if (this.catalogOpen()) this.loadGames(page);
      return;
    }

    this.hasFilter.set(true);
    this.loading.set(true);
    this.isSearching.set(true);
    this.gameService
      .searchFilter(
        { name: name || undefined, genres: genres.length ? genres : undefined },
        page,
        24,
      )
      .subscribe({
        next: (result) => {
          this.games.set(result.content);
          this.currentPage.set(result.number);
          this.totalPages.set(result.totalPages);
          this.loading.set(false);
          this.navigating.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.navigating.set(false);
        },
      });
  }

  prevPage(): void {
    if (this.currentPage() > 0 && !this.navigating()) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1 && !this.navigating()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  private goToPage(page: number): void {
    this.navigating.set(true);
    this.topAnchor()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (this.isSearching()) {
      this.applyFilter(page);
    } else {
      this.loadGames(page);
    }
  }

  encodeName(name: string): string {
    return encodeURIComponent(name);
  }

  isInWishlist(name: string): boolean {
    return this.wishlistNames().has(name);
  }

  toggleWishlist(gameName: string): void {
    const username = this.auth.getUsername();
    if (!username) return;

    if (this.isInWishlist(gameName)) {
      this.userService.removeFromWishlist(username, gameName).subscribe({
        next: () => {
          const updated = new Set(this.wishlistNames());
          updated.delete(gameName);
          this.wishlistNames.set(updated);
        },
      });
    } else {
      this.userService.addToWishlist(username, gameName).subscribe({
        next: () => {
          const updated = new Set(this.wishlistNames());
          updated.add(gameName);
          this.wishlistNames.set(updated);
        },
      });
    }
  }

  private loadWishlist(): void {
    const username = this.auth.getUsername();
    if (!username) return;

    this.userService.getWishlist(username).subscribe({
      next: (list) => this.wishlistNames.set(new Set(list.map((g) => g.name))),
    });
  }
}
