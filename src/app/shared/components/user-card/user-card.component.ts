import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SuggestedUser } from '../../../core/models/user.model';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-user-card',
  imports: [RouterLink],
  template: `
    <article
      class="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4"
    >
      <a [routerLink]="['/profile', user().username]" class="flex min-w-0 items-center gap-3">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-sm font-bold text-white"
        >
          {{ initials() }}
        </div>
        <div class="min-w-0">
          <p class="truncate font-semibold text-white">{{ user().username }}</p>
          <p class="truncate text-xs text-slate-500">{{ subtitle() }}</p>
        </div>
      </a>
      @if (showFollowButton()) {
        <button
          type="button"
          (click)="followToggle.emit(user().username)"
          class="shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition"
          [class]="
            isFollowing()
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              : 'bg-violet-600 text-white hover:bg-violet-500'
          "
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
    return n === 1 ? this.i18n.t('userCard.gamesSingular') : this.i18n.t('userCard.gamesPlural', { count: n ?? 0 });
  }
}
