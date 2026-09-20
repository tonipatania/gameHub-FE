import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SuggestedUser } from '../../../core/models/user.model';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-user-card',
  imports: [RouterLink],
  template: `
    <article class="flex items-center justify-between gap-4 gh-card p-4">
      <a [routerLink]="['/profile', user().username]" class="flex min-w-0 items-center gap-3">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-sm font-bold text-white"
        >
          {{ initials() }}
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <p class="truncate font-semibold text-white">{{ user().username }}</p>
            @if (relation() !== 'none') {
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide"
                [class]="
                  relation() === 'mutual'
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-violet-500/15 text-violet-300'
                "
              >
                {{
                  relation() === 'mutual'
                    ? i18n.t('userCard.relationMutual')
                    : i18n.t('userCard.relationFollowsYou')
                }}
              </span>
            }
          </div>
          <p class="truncate text-xs text-slate-500">{{ subtitle() }}</p>
        </div>
      </a>
      @if (showFollowButton()) {
        <button
          type="button"
          (click)="followToggle.emit(user().username)"
          class="gh-btn shrink-0"
          [class]="isFollowing() ? 'gh-btn-muted' : 'gh-btn-primary'"
        >
          {{ isFollowing() ? i18n.t('userCard.alreadyFollowing') : i18n.t('userCard.follow') }}
        </button>
      }
    </article>
  `,
})
export class UserCardComponent {
  readonly i18n = inject(TranslationService);

  readonly user = input.required<SuggestedUser>();
  readonly isFollowing = input(false);
  readonly showFollowButton = input(false);
  /** come ci si segue: "ti segue" (solo lui), "reciproco" (entrambi), nessuna etichetta altrimenti */
  readonly relation = input<'none' | 'followsYou' | 'mutual'>('none');
  readonly followToggle = output<string>();

  initials(): string {
    return this.user().username.slice(0, 2).toUpperCase();
  }

  // spiega perche l'utente e stato suggerito; fuori dai suggerimenti resta l'etichetta generica
  subtitle(): string {
    const u = this.user();
    switch (u.reason) {
      case 'COMMON_FRIENDS':
        return this.i18n.t('userCard.commonFriendsSubtitle', { games: this.plural(u.commonGames) });
      case 'SIMILAR_TASTES':
        return this.i18n.t('userCard.similarTastesSubtitle', { games: this.plural(u.commonGames) });
      case 'POPULAR':
        return u.followers
          ? this.i18n.t('userCard.popularWithFollowers', { count: u.followers })
          : this.i18n.t('userCard.popular');
      default:
        return this.i18n.t('userCard.genericGamer');
    }
  }

  private plural(n: number | null | undefined): string {
    return n === 1
      ? this.i18n.t('userCard.gamesSingular')
      : this.i18n.t('userCard.gamesPlural', { count: n ?? 0 });
  }
}
