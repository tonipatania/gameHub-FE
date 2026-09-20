import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import {
  Connection,
  ConnectionStats,
  ConnectionType,
  SuggestedUser,
  UserNeo4j,
} from '../../core/models/user.model';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { UserCardComponent } from '../../shared/components/user-card/user-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TranslationService } from '../../core/services/translation.service';

const PAGE_SIZE = 20;

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
      <app-page-header [title]="i18n.t('friends.title')" [subtitle]="i18n.t('friends.subtitle')">
        <div class="relative w-full sm:w-72">
          <input
            [formControl]="searchControl"
            [placeholder]="i18n.t('friends.searchPlaceholder')"
            [attr.aria-label]="i18n.t('friends.searchPlaceholder')"
            class="gh-input py-2 pr-9 text-sm"
          />
          @if (searchControl.value) {
            <button
              type="button"
              (click)="clearSearch()"
              [attr.aria-label]="i18n.t('friends.clearSearch')"
              class="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-700 hover:text-white"
            >
              ✕
            </button>
          }
        </div>
      </app-page-header>

      <div
        class="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <div class="min-w-0">
          @if (searchControl.value.trim()) {
            <section>
              <h2 class="gh-section-title mb-4">
                {{ i18n.t('friends.searchResultsTitle', { query: searchControl.value.trim() }) }}
              </h2>
              @if (searching()) {
                <app-loading-spinner />
              } @else if (searchResults().length === 0) {
                <p class="text-slate-400">{{ i18n.t('friends.noUsersFound') }}</p>
              } @else {
                <div class="gh-user-grid">
                  @for (user of searchResults(); track user.id) {
                    <app-user-card
                      [user]="user"
                      [showFollowButton]="true"
                      [isFollowing]="isFollowing(user.username)"
                      (followToggle)="toggleFollow($event)"
                    />
                  }
                </div>
              }
            </section>
          } @else {
            <div class="grid grid-cols-3 gap-3" role="tablist">
              @for (option of tabs; track option.type) {
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="tab() === option.type"
                  (click)="selectTab(option.type)"
                  class="gh-tile cursor-pointer text-left transition"
                  [class]="
                    tab() === option.type
                      ? '!border-violet-500 !bg-violet-500/10'
                      : 'hover:border-slate-600'
                  "
                >
                  <span class="gh-eyebrow">{{ i18n.t(option.labelKey) }}</span>
                  <span class="mt-1 block text-2xl font-bold text-white sm:text-3xl">
                    {{ statValue(option.type) }}
                  </span>
                </button>
              }
            </div>
            <p class="mb-4 mt-3 text-sm text-slate-400">{{ i18n.t(activeTab().hintKey) }}</p>

            <div #listTopAnchor></div>

            @if (listLoading() && connections().length === 0) {
              <app-loading-spinner />
            } @else if (connections().length === 0) {
              <div class="gh-panel p-10 text-center">
                <p class="text-4xl" aria-hidden="true">{{ activeTab().emoji }}</p>
                <p class="mt-3 font-medium text-white">{{ i18n.t(activeTab().emptyKey) }}</p>
              </div>
            } @else {
              <div
                class="gh-user-grid transition-opacity duration-150"
                [class.opacity-50]="listLoading()"
                [class.pointer-events-none]="listLoading()"
              >
                @for (user of connections(); track user.id) {
                  <app-user-card
                    [user]="user"
                    [showFollowButton]="true"
                    [isFollowing]="isFollowing(user.username)"
                    [relation]="relationOf(user)"
                    (followToggle)="toggleFollow($event)"
                  />
                }
              </div>

              @if (totalPages() > 1) {
                <app-pagination
                  class="mt-6"
                  [page]="pageIndex()"
                  [totalPages]="totalPages()"
                  [disabled]="listLoading()"
                  (prev)="goToPage(pageIndex() - 1)"
                  (next)="goToPage(pageIndex() + 1)"
                />
              }
            }
          }
        </div>

        <aside class="min-w-0 lg:sticky lg:top-24">
          <h2 class="gh-section-title">
            {{ i18n.t('friends.suggestedTitle') }}
          </h2>
          <p class="mb-4 mt-1 text-sm text-slate-500">{{ i18n.t('friends.suggestedHint') }}</p>
          @if (suggestionsLoading()) {
            <app-loading-spinner />
          } @else if (suggestedFriends().length === 0) {
            <p class="text-sm text-slate-400">{{ i18n.t('friends.noSuggestions') }}</p>
          } @else {
            <div class="space-y-2">
              @for (user of suggestedFriends(); track user.id) {
                <app-user-card
                  [user]="user"
                  [showFollowButton]="true"
                  [isFollowing]="isFollowing(user.username)"
                  (followToggle)="toggleFollow($event)"
                />
              }
            </div>
          }
        </aside>
      </div>
    </app-page-layout>
  `,
})
export class FriendsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);
  readonly i18n = inject(TranslationService);

  private readonly listTopAnchor = viewChild<ElementRef<HTMLElement>>('listTopAnchor');

  readonly tabs: {
    type: ConnectionType;
    labelKey: string;
    hintKey: string;
    emptyKey: string;
    emoji: string;
  }[] = [
    {
      type: 'following',
      labelKey: 'friends.tabFollowing',
      hintKey: 'friends.hintFollowing',
      emptyKey: 'friends.emptyFollowing',
      emoji: '🔭',
    },
    {
      type: 'followers',
      labelKey: 'friends.tabFollowers',
      hintKey: 'friends.hintFollowers',
      emptyKey: 'friends.emptyFollowers',
      emoji: '👋',
    },
    {
      type: 'mutual',
      labelKey: 'friends.tabMutual',
      hintKey: 'friends.hintMutual',
      emptyKey: 'friends.emptyMutual',
      emoji: '🤝',
    },
  ];

  readonly tab = signal<ConnectionType>('following');
  readonly stats = signal<ConnectionStats | null>(null);
  readonly connections = signal<Connection[]>([]);
  readonly listLoading = signal(true);
  readonly pageIndex = signal(0);
  readonly totalPages = signal(1);
  // chi seguo, per lo stato del bottone "Segui" in qualunque elenco (cerca, consigliati, follower)
  readonly followedUsernames = signal<Set<string>>(new Set());
  readonly searchResults = signal<UserNeo4j[]>([]);
  readonly searching = signal(false);
  readonly suggestedFriends = signal<SuggestedUser[]>([]);
  readonly suggestionsLoading = signal(true);

  readonly searchControl = this.fb.nonNullable.control('');

  // le risposte di elenchi diversi possono arrivare fuori ordine (cambio tab veloce): conta solo
  // l'ultima richiesta
  private listRequest = 0;

  ngOnInit(): void {
    const username = this.auth.getUsername();
    if (!username) return;

    this.userService.getFollowedUsers(username).subscribe({
      next: (list) => this.followedUsernames.set(new Set(list.map((u) => u.username))),
    });

    this.loadStats();
    this.loadList(0);

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

  activeTab() {
    return this.tabs.find((t) => t.type === this.tab()) ?? this.tabs[0];
  }

  statValue(type: ConnectionType): string {
    const stats = this.stats();
    return stats ? String(stats[type]) : '–';
  }

  selectTab(type: ConnectionType): void {
    if (type === this.tab()) return;
    this.tab.set(type);
    this.connections.set([]);
    this.loadList(0);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages() || this.listLoading()) return;
    this.listTopAnchor()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.loadList(page);
  }

  private loadStats(): void {
    this.userService.getConnectionStats().subscribe({
      next: (stats) => this.stats.set(stats),
    });
  }

  private loadList(page: number): void {
    const request = ++this.listRequest;
    const type = this.tab();
    this.listLoading.set(true);

    this.userService.getConnectionsPage(type, page, PAGE_SIZE).subscribe({
      next: (result) => {
        if (request !== this.listRequest) return;
        // l'ultimo elemento dell'ultima pagina e' stato tolto (unfollow): si arretra di una pagina
        if (result.content.length === 0 && page > 0) {
          this.loadList(page - 1);
          return;
        }
        this.connections.set(result.content);
        this.pageIndex.set(result.number);
        this.totalPages.set(Math.max(1, result.totalPages));
        this.listLoading.set(false);
      },
      error: () => {
        if (request === this.listRequest) this.listLoading.set(false);
      },
    });
  }

  isFollowing(username: string): boolean {
    return this.followedUsernames().has(username);
  }

  // etichetta sulla card: chi mi segue e chi non ricambio (solo nell'elenco follower) o reciproci
  relationOf(user: Connection): 'none' | 'followsYou' | 'mutual' {
    if (user.mutual) return 'mutual';
    return this.tab() === 'followers' ? 'followsYou' : 'none';
  }

  clearSearch(): void {
    this.searchControl.setValue('');
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

  toggleFollow(username: string): void {
    if (this.isFollowing(username)) {
      this.unfollow(username);
    } else {
      this.follow(username);
    }
  }

  follow(username: string): void {
    const current = this.auth.getUsername();
    if (!current) return;

    this.userService.followUser(current, username).subscribe({
      next: () => {
        const updated = new Set(this.followedUsernames());
        updated.add(username);
        this.followedUsernames.set(updated);
        this.refreshConnections();
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
        this.refreshConnections();
      },
    });
  }

  // seguire o smettere cambia i numeri in cima e puo' cambiare l'elenco aperto (seguiti, reciproci)
  private refreshConnections(): void {
    this.loadStats();
    this.loadList(this.pageIndex());
  }
}
