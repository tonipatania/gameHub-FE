import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { GameNeo4j } from '../../core/models/game.model';
import { UserNeo4j } from '../../core/models/user.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { UserCardComponent } from '../../shared/components/user-card/user-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <app-navbar />
    <main class="mx-auto max-w-3xl px-4 py-8">
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
          @if (wishlist().length === 0) {
            <p class="text-slate-400">Nessun gioco in wishlist.</p>
          } @else {
            <div class="grid gap-3 sm:grid-cols-2">
              @for (game of wishlist(); track game.id) {
                <a
                  [routerLink]="['/games', encodeName(game.name)]"
                  class="rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-3 text-white hover:border-violet-500/50"
                >
                  {{ game.name }}
                </a>
              }
            </div>
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
  readonly wishlist = signal<GameNeo4j[]>([]);
  readonly isFollowing = signal(false);
  readonly updateMessage = signal('');

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

    forkJoin({
      user: this.userService.getUser(this.profileUsername),
      wishlist: this.userService.getWishlist(current, this.profileUsername),
      following: current ? this.userService.getFollowedUsers(current) : [],
    }).subscribe({
      next: ({ user, wishlist, following }) => {
        this.user.set(user);
        this.wishlist.set(wishlist);
        this.isFollowing.set(following.some((u) => u.username === this.profileUsername));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
