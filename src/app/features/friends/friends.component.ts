import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { SuggestedUser, UserNeo4j } from '../../core/models/user.model';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { UserCardComponent } from '../../shared/components/user-card/user-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-friends',
  imports: [
    ReactiveFormsModule,
    PageLayoutComponent,
    PageHeaderComponent,
    PaginationComponent,
    UserCardComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <app-page-layout>
      <app-page-header [title]="i18n.t('friends.title')" />

      <div class="grid items-start gap-x-10 gap-y-2 xl:grid-cols-2">
        <div class="min-w-0">
          <section class="mb-10">
            <h2 class="gh-section-title mb-4">
              {{ i18n.t('friends.addPeopleTitle') }}
            </h2>
            <input
              [formControl]="searchControl"
              [placeholder]="i18n.t('friends.searchPlaceholder')"
              class="gh-input mb-4"
            />
            @if (searching()) {
              <app-loading-spinner />
            } @else if (searchControl.value) {
              @if (searchResults().length === 0) {
                <p class="text-slate-400">{{ i18n.t('friends.noUsersFound') }}</p>
              } @else {
                <div class="gh-user-grid">
                  @for (user of searchResults(); track user.id) {
                    <app-user-card
                      [user]="user"
                      [showFollowButton]="true"
                      [isFollowing]="isFollowing(user.username)"
                      (followToggle)="
                        isFollowing(user.username) ? unfollow($event) : follow($event)
                      "
                    />
                  }
                </div>
              }
            }
          </section>

          <section class="mb-10">
            <h2 class="gh-section-title mb-4">
              {{ i18n.t('friends.suggestedTitle') }}
            </h2>
            @if (suggestionsLoading()) {
              <app-loading-spinner />
            } @else if (suggestedFriends().length === 0) {
              <p class="text-slate-400">{{ i18n.t('friends.noSuggestions') }}</p>
            } @else {
              <div class="gh-user-grid">
                @for (user of suggestedFriends(); track user.id) {
                  <app-user-card
                    [user]="user"
                    [showFollowButton]="true"
                    [isFollowing]="isFollowing(user.username)"
                    (followToggle)="isFollowing(user.username) ? unfollow($event) : follow($event)"
                  />
                }
              </div>
            }
          </section>
        </div>

        <div class="min-w-0">
          <div #followingTopAnchor></div>

          @if (loading() && followingPage().length === 0) {
            <app-loading-spinner />
          } @else {
            <section class="mb-10">
              <h2 class="gh-section-title mb-4">
                {{ i18n.t('friends.followingTitle') }}
              </h2>
              @if (followingPage().length === 0) {
                <p class="text-slate-400">{{ i18n.t('friends.notFollowingAnyone') }}</p>
              } @else {
                <div
                  class="gh-user-grid transition-opacity duration-150"
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

                <app-pagination
                  class="mt-6"
                  [page]="followingPageIndex()"
                  [totalPages]="followingTotalPages()"
                  [disabled]="navigatingFollowing()"
                  (prev)="prevFollowingPage()"
                  (next)="nextFollowingPage()"
                />
              }
            </section>
          }
        </div>
      </div>
    </app-page-layout>
  `,
})
export class FriendsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);
  readonly i18n = inject(TranslationService);

  private readonly followingTopAnchor = viewChild<ElementRef<HTMLElement>>('followingTopAnchor');

  readonly loading = signal(true);
  readonly navigatingFollowing = signal(false);
  readonly followedUsernames = signal<Set<string>>(new Set());
  readonly followingPage = signal<UserNeo4j[]>([]);
  readonly followingPageIndex = signal(0);
  readonly followingTotalPages = signal(1);
  readonly searchResults = signal<UserNeo4j[]>([]);
  readonly searching = signal(false);
  readonly suggestedFriends = signal<SuggestedUser[]>([]);
  readonly suggestionsLoading = signal(true);

  readonly searchControl = this.fb.nonNullable.control('');

  ngOnInit(): void {
    const username = this.auth.getUsername();
    if (!username) return;

    this.userService.getFollowedUsers(username).subscribe({
      next: (list) => this.followedUsernames.set(new Set(list.map((u) => u.username))),
    });

    this.loadFollowingPage(0);

    this.userService.getSuggestedFriends(username).subscribe({
      next: (list) => {
        this.suggestedFriends.set(list);
        this.suggestionsLoading.set(false);
      },
      error: () => this.suggestionsLoading.set(false),
    });

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
      this.followingTopAnchor()?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      this.loadFollowingPage(this.followingPageIndex() - 1);
    }
  }

  nextFollowingPage(): void {
    if (this.followingPageIndex() < this.followingTotalPages() - 1 && !this.navigatingFollowing()) {
      this.navigatingFollowing.set(true);
      this.followingTopAnchor()?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
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
