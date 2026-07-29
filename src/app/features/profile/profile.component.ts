import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { Game, Page } from '../../core/models/game.model';
import { UserNeo4j } from '../../core/models/user.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { BackButtonComponent } from '../../shared/components/back-button/back-button.component';
import { GameCardComponent } from '../../shared/components/game-card/game-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

type WishlistSortKey = 'name' | 'price' | 'release';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    NavbarComponent,
    BackButtonComponent,
    GameCardComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <app-navbar />
    <main class="mx-auto max-w-5xl px-4 py-8">
      <app-back-button />
      @if (loading()) {
        <app-loading-spinner />
      } @else if (!user()) {
        <p class="text-center text-slate-400">Utente non trovato.</p>
      } @else {
        <div class="mb-8 flex items-center gap-4">
          <div
            class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-2xl font-bold text-white"
          >
            {{ user()!.username.slice(0, 2).toUpperCase() }}
          </div>
          <div>
            <h1 class="text-3xl font-bold text-white">{{ user()!.username }}</h1>
            <p class="text-slate-400">Profilo GameHub</p>
          </div>
        </div>

        @if (isOwnProfile()) {
          <section class="mb-8 rounded-xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 class="mb-4 text-lg font-semibold text-white">Modifica username</h2>
            <form [formGroup]="usernameForm" (ngSubmit)="updateUsername()" class="flex gap-3">
              <input
                formControlName="newUsername"
                class="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-violet-500"
                placeholder="Nuovo username"
              />
              <button
                type="submit"
                [disabled]="usernameForm.invalid"
                class="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
              >
                Aggiorna
              </button>
            </form>
            @if (updateMessage()) {
              <p class="mt-2 text-sm text-emerald-400">{{ updateMessage() }}</p>
            }
          </section>
        } @else {
          <button
            type="button"
            (click)="toggleFollow()"
            class="mb-8 rounded-lg px-6 py-2 text-sm font-medium transition"
            [class]="
              isFollowing()
                ? 'bg-slate-800 text-slate-300'
                : 'bg-violet-600 text-white hover:bg-violet-500'
            "
          >
            {{ isFollowing() ? 'Non seguire più' : 'Segui' }}
          </button>
        }

        <section>
          <h2 class="mb-4 text-xl font-semibold text-white">Wishlist pubblica</h2>

          @if (wishlistTotal() > 0) {
            <dl class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div class="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                <dt class="text-xs uppercase tracking-wide text-slate-500">Giochi</dt>
                <dd class="mt-1 text-2xl font-bold text-white">{{ wishlistTotal() }}</dd>
              </div>
              @if (!isOwnProfile()) {
                <div class="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <dt class="text-xs uppercase tracking-wide text-slate-500">In comune</dt>
                  <dd class="mt-1 text-2xl font-bold text-violet-300">{{ commonCount() }}</dd>
                </div>
              }
              <div class="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                <dt class="text-xs uppercase tracking-wide text-slate-500">Pagina</dt>
                <dd class="mt-1 text-2xl font-bold text-white">
                  {{ wishlistPageIndex() + 1 }}/{{ wishlistTotalPages() }}
                </dd>
              </div>
            </dl>
          }

          @if (wishlist().length === 0) {
            <p class="text-slate-400">Nessun gioco in wishlist.</p>
          } @else {
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              @if (!isOwnProfile() && commonCount() > 0) {
                <div class="flex gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1">
                  <button
                    type="button"
                    (click)="setOnlyCommon(false)"
                    [disabled]="navigatingWishlist()"
                    class="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50"
                    [class]="
                      onlyCommon() ? 'text-slate-400 hover:text-white' : 'bg-violet-600 text-white'
                    "
                  >
                    Tutti ({{ wishlistTotalAll() }})
                  </button>
                  <button
                    type="button"
                    (click)="setOnlyCommon(true)"
                    [disabled]="navigatingWishlist()"
                    class="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50"
                    [class]="
                      onlyCommon() ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                    "
                  >
                    ★ Solo in comune ({{ commonCount() }})
                  </button>
                </div>
              } @else {
                <span class="text-sm text-slate-400">Ordina per</span>
              }
              <div class="flex gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1">
                @for (option of sortOptions; track option.key) {
                  <button
                    type="button"
                    (click)="changeSort(option.key)"
                    [disabled]="navigatingWishlist()"
                    class="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50"
                    [class]="
                      wishlistSort() === option.key
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    "
                  >
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>

            <div class="grid gap-5 sm:grid-cols-2">
              @for (game of wishlist(); track game.id) {
                <app-game-card
                  [game]="game"
                  [showPrice]="true"
                  [badge]="isCommon(game.name) ? '★ In comune' : ''"
                />
              }
            </div>

            @if (wishlistTotalPages() > 1) {
              <div class="mt-6 flex items-center justify-center gap-4">
                <button
                  type="button"
                  (click)="prevWishlistPage()"
                  [disabled]="wishlistPageIndex() === 0 || navigatingWishlist()"
                  class="cursor-pointer rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Precedente
                </button>
                <span class="text-sm text-slate-400">
                  Pagina {{ wishlistPageIndex() + 1 }} di {{ wishlistTotalPages() }}
                </span>
                <button
                  type="button"
                  (click)="nextWishlistPage()"
                  [disabled]="
                    wishlistPageIndex() >= wishlistTotalPages() - 1 || navigatingWishlist()
                  "
                  class="cursor-pointer rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Successiva →
                </button>
              </div>
            }
          }
        </section>
      }
    </main>
  `,
})
export class ProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);

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
  readonly updateMessage = signal('');

  readonly sortOptions: { key: WishlistSortKey; label: string }[] = [
    { key: 'name', label: 'Nome' },
    { key: 'price', label: 'Prezzo' },
    { key: 'release', label: 'Uscita' },
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

  readonly usernameForm = this.fb.nonNullable.group({
    newUsername: ['', Validators.required],
  });

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

  updateUsername(): void {
    const current = this.auth.getUsername();
    if (!current || this.usernameForm.invalid) return;

    const newUsername = this.usernameForm.getRawValue().newUsername;
    this.userService.updateUsername(current, newUsername).subscribe({
      next: () => {
        this.updateMessage.set('Username aggiornato!');
        this.profileUsername = newUsername;
        this.auth.updateUsername(newUsername);
        this.loadProfile();
      },
      error: (err) => {
        this.updateMessage.set(
          typeof err.error === 'string' ? err.error : 'Errore aggiornamento',
        );
      },
    });
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
    if (
      this.wishlistPageIndex() < this.wishlistTotalPages() - 1 &&
      !this.navigatingWishlist()
    ) {
      this.loadWishlistPage(this.wishlistPageIndex() + 1);
    }
  }
}
