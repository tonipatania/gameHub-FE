import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
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

      <div #followingTopAnchor></div>

      @if (loading() && followingPage().length === 0) {
        <app-loading-spinner />
      } @else {
        <section class="mb-10">
          <h2 class="mb-4 text-xl font-semibold text-white">Persone che segui</h2>
          @if (followingPage().length === 0) {
            <p class="text-slate-400">Non segui ancora nessuno.</p>
          } @else {
            <div
              class="space-y-3 transition-opacity duration-150"
              [class.opacity-50]="navigatingFollowing()"
              [class.pointer-events-none]="navigatingFollowing()"
            >
              @for (user of followingPage(); track user.id) {
                <app-user-card
                  [user]="user"
                  [showFollowButton]="true"
                  [isFollowing]="true"
                  (followToggle)="unfollow($event)"
                />
              }
            </div>

            <div class="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                (click)="prevFollowingPage()"
                [disabled]="followingPageIndex() === 0 || navigatingFollowing()"
                class="cursor-pointer rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Precedente
              </button>
              <span class="text-sm text-slate-400">
                Pagina {{ followingPageIndex() + 1 }} di {{ followingTotalPages() }}
              </span>
              <button
                type="button"
                (click)="nextFollowingPage()"
                [disabled]="followingPageIndex() >= followingTotalPages() - 1 || navigatingFollowing()"
                class="cursor-pointer rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Successiva →
              </button>
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

  private readonly followingTopAnchor = viewChild<ElementRef<HTMLElement>>('followingTopAnchor');

  readonly loading = signal(true);
  readonly navigatingFollowing = signal(false);
  readonly followedUsernames = signal<Set<string>>(new Set());
  readonly followingPage = signal<UserNeo4j[]>([]);
  readonly followingPageIndex = signal(0);
  readonly followingTotalPages = signal(1);
  readonly searchResults = signal<UserNeo4j[]>([]);
  readonly searching = signal(false);

  readonly searchControl = this.fb.nonNullable.control('');

  ngOnInit(): void {
    const username = this.auth.getUsername();
    if (!username) return;

    this.userService.getFollowedUsers(username).subscribe({
      next: (list) => this.followedUsernames.set(new Set(list.map((u) => u.username))),
    });

    this.loadFollowingPage(0);

    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((query) => this.search(query));
  }

  private loadFollowingPage(page: number): void {
    const username = this.auth.getUsername();
    if (!username) return;

    this.userService.getFollowedUsersPage(username, page, 20).subscribe({
      next: (result) => {
        this.followingPage.set(result.content);
        this.followingPageIndex.set(result.number);
        this.followingTotalPages.set(result.totalPages);
        this.loading.set(false);
        this.navigatingFollowing.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.navigatingFollowing.set(false);
      },
    });
  }

  prevFollowingPage(): void {
    if (this.followingPageIndex() > 0 && !this.navigatingFollowing()) {
      this.navigatingFollowing.set(true);
      this.followingTopAnchor()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.loadFollowingPage(this.followingPageIndex() - 1);
    }
  }

  nextFollowingPage(): void {
    if (this.followingPageIndex() < this.followingTotalPages() - 1 && !this.navigatingFollowing()) {
      this.navigatingFollowing.set(true);
      this.followingTopAnchor()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.loadFollowingPage(this.followingPageIndex() + 1);
    }
  }

  isFollowing(username: string): boolean {
    return this.followedUsernames().has(username);
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
        const updated = new Set(this.followedUsernames());
        updated.add(username);
        this.followedUsernames.set(updated);
        this.loadFollowingPage(this.followingPageIndex());
      },
    });
  }

  unfollow(username: string): void {
    const current = this.auth.getUsername();
    if (!current) return;

    this.userService.unfollowUser(current, username).subscribe({
      next: () => {
        const updated = new Set(this.followedUsernames());
        updated.delete(username);
        this.followedUsernames.set(updated);
        this.loadFollowingPage(this.followingPageIndex());
      },
    });
  }
}
