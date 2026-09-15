import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivityItem } from '../../../core/models/activity.model';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-activity-card',
  imports: [RouterLink],
  template: `
    <article class="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-xs font-bold text-white"
      >
        {{ initials() }}
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm text-slate-300">
          <span class="font-semibold text-white">{{ activity().username }}</span>
          @if (activity().type === 'WISHLIST_ADD') {
            {{ i18n.t('activityFeed.wishlistAdd', { game: activity().gameName }) }}
          } @else {
            {{
              i18n.t('activityFeed.review', {
                game: activity().gameName,
                score: activity().score ?? 0,
              })
            }}
          }
        </p>
        <p class="mt-1 text-xs text-slate-500">{{ relativeTime() }}</p>
      </div>
      @if (activity().gameHeaderImage) {
        <a [routerLink]="['/games', encodeName(activity().gameName)]" class="shrink-0">
          <img
            [src]="activity().gameHeaderImage"
            [alt]="activity().gameName"
            class="h-12 w-20 rounded-lg object-cover"
          />
        </a>
      }
    </article>
  `,
})
export class ActivityCardComponent {
  readonly i18n = inject(TranslationService);

  readonly activity = input.required<ActivityItem>();

  initials(): string {
    return this.activity().username.slice(0, 2).toUpperCase();
  }

  encodeName(name: string): string {
    return encodeURIComponent(name);
  }

  relativeTime(): string {
    const minutes = Math.max(
      0,
      Math.floor((Date.now() - Date.parse(this.activity().createdAt)) / 60000),
    );
    if (minutes < 1) return this.i18n.t('activityFeed.justNow');
    if (minutes < 60) return this.i18n.t('activityFeed.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return this.i18n.t('activityFeed.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return this.i18n.t('activityFeed.daysAgo', { count: days });
  }
}
