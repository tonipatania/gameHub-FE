import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { UserNeo4j } from '../../core/models/user.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { UserCardComponent } from '../../shared/components/user-card/user-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-friends',
  imports: [ReactiveFormsModule, NavbarComponent, UserCardComponent, LoadingSpinnerComponent],
  template: `
    <app-navbar />
    <main class="mx-auto max-w-3xl px-4 py-8">
      <h1 class="mb-8 text-3xl font-bold text-white">Community</h1>

      <section class="mb-10">
        <h2 class="mb-4 text-xl font-semibold text-white">Aggiungi persone</h2>
        <input
          [formControl]="searchControl"
          placeholder="Cerca per username..."
          class="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-violet-500"
        />
        @if (searching()) {
          <app-loading-spinner />
        } @else if (searchControl.value) {
          @if (searchResults().length === 0) {
            <p class="text-slate-400">Nessun utente trovato.</p>
          } @else {
            <div class="space-y-3">
              @for (user of searchResults(); track user.id) {
                <app-user-card
                  [user]="user"
                  [showFollowButton]="true"
                  [isFollowing]="isFollowing(user.username)"
                  (followToggle)="isFollowing(user.username) ? unfollow($event) : follow($event)"
                />
              }
            </div>
          }
        }
      </section>

      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <section class="mb-10">
          <h2 class="mb-4 text-xl font-semibold text-white">Persone che segui</h2>
          @if (following().length === 0) {
            <p class="text-slate-400">Non segui ancora nessuno.</p>
          } @else {
            <div class="space-y-3">
              @for (user of following(); track user.id) {
                <app-user-card
                  [user]="user"
                  [showFollowButton]="true"
                  [isFollowing]="true"
                  (followToggle)="unfollow($event)"
                />
              }
            </div>
          }
        </section>

        <section>
          <h2 class="mb-4 text-xl font-semibold text-white">Persone suggerite</h2>
          @if (suggested().length === 0) {
            <p class="text-slate-400">Nessun suggerimento disponibile.</p>
          } @else {
            <div class="space-y-3">
              @for (user of suggested(); track user.id) {
                <app-user-card
                  [user]="user"
                  [showFollowButton]="true"
                  [isFollowing]="false"
                  (followToggle)="follow($event)"
                />
              }
            </div>
          }
        </section>
      }
    </main>
  `,
})
export class FriendsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly following = signal<UserNeo4j[]>([]);
  readonly suggested = signal<UserNeo4j[]>([]);
  readonly searchResults = signal<UserNeo4j[]>([]);
  readonly searching = signal(false);

  readonly searchControl = this.fb.nonNullable.control('');

  ngOnInit(): void {
    const username = this.auth.getUsername();
    if (!username) return;

    this.userService.getFollowedUsers(username).subscribe({
      next: (list) => this.following.set(list),
    });

    this.userService.getSuggestedFriends(username).subscribe({
      next: (list) => {
        this.suggested.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((query) => this.search(query));
  }

  isFollowing(username: string): boolean {
    return this.following().some((u) => u.username === username);
  }

  private search(query: string): void {
    const username = this.auth.getUsername();
    if (!username || !query.trim()) {
      this.searchResults.set([]);
      return;
    }

    this.searching.set(true);
    this.userService.searchUsers(query.trim(), username).subscribe({
      next: (results) => {
        this.searchResults.set(results);
        this.searching.set(false);
      },
      error: () => this.searching.set(false),
    });
  }

  follow(username: string): void {
    const current = this.auth.getUsername();
    if (!current) return;

    this.userService.followUser(current, username).subscribe({
      next: () => {
        const user =
          this.suggested().find((u) => u.username === username) ??
          this.searchResults().find((u) => u.username === username);
        if (user && !this.isFollowing(username)) {
          this.following.update((list) => [...list, user]);
        }
        this.suggested.update((list) => list.filter((u) => u.username !== username));
      },
    });
  }

  unfollow(username: string): void {
    const current = this.auth.getUsername();
    if (!current) return;

    this.userService.unfollowUser(current, username).subscribe({
      next: () => {
        this.following.update((list) => list.filter((u) => u.username !== username));
      },
    });
  }
}
