import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { GameService } from '../../../core/services/game.service';
import { UserService } from '../../../core/services/user.service';
import { Game } from '../../../core/models/game.model';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { GameCardComponent } from '../../../shared/components/game-card/game-card.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-games',
  imports: [
    ReactiveFormsModule,
    NavbarComponent,
    GameCardComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <app-navbar />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white">Catalogo giochi</h1>
          <p class="mt-1 text-slate-400">Esplora migliaia di titoli e aggiungili alla wishlist</p>
        </div>
        <form [formGroup]="filterForm" class="flex flex-wrap gap-3">
          <input
            formControlName="name"
            placeholder="Cerca per nome..."
            class="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-violet-500"
          />

          <div class="relative">
            <button
              type="button"
              (click)="genresMenuOpen.set(!genresMenuOpen())"
              class="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white outline-none focus:border-violet-500"
            >
              @if (selectedGenres().size === 0) {
                Generi
              } @else {
                Generi ({{ selectedGenres().size }})
              }
              <span class="text-slate-500">▾</span>
            </button>

            @if (genresMenuOpen()) {
              <div class="fixed inset-0 z-10" (click)="genresMenuOpen.set(false)"></div>
              <div
                class="absolute right-0 z-20 mt-2 max-h-64 w-56 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 p-2 shadow-xl"
              >
                @if (allGenres().length === 0) {
                  <p class="px-2 py-1 text-sm text-slate-500">Nessun genere disponibile</p>
                }
                @for (genre of allGenres(); track genre) {
                  <label class="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-700">
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
      </div>

      <div #topAnchor></div>

      @if (loading() && games().length === 0) {
        <app-loading-spinner />
      } @else if (games().length === 0) {
        <p class="text-center text-slate-400">Nessun gioco trovato.</p>
      } @else {
        <div
          class="grid gap-6 transition-opacity duration-150 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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

        <div class="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            (click)="prevPage()"
            [disabled]="currentPage() === 0 || navigating()"
            class="cursor-pointer rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Precedente
          </button>
          <span class="text-sm text-slate-400">
            Pagina {{ currentPage() + 1 }} di {{ totalPages() }}
          </span>
          <button
            type="button"
            (click)="nextPage()"
            [disabled]="currentPage() >= totalPages() - 1 || navigating()"
            class="cursor-pointer rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            Successiva →
          </button>
        </div>
      }
    </main>
  `,
})
export class GamesComponent implements OnInit {
  private readonly gameService = inject(GameService);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  private readonly topAnchor = viewChild<ElementRef<HTMLElement>>('topAnchor');

  readonly loading = signal(true);
  readonly navigating = signal(false);
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

  ngOnInit(): void {
    this.loadWishlist();
    this.loadGames(0);
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
      this.loadGames(page);
      return;
    }

    this.loading.set(true);
    this.isSearching.set(true);
    this.gameService
      .searchFilter({ name: name || undefined, genres: genres.length ? genres : undefined }, page, 24)
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
