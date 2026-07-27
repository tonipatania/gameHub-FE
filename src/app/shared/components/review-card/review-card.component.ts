import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Review } from '../../../core/models/review.model';

@Component({
  selector: 'app-review-card',
  imports: [RouterLink],
  template: `
    <article class="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <a
              [routerLink]="['/profile', review().username]"
              class="font-semibold text-violet-400 hover:text-violet-300"
            >
              {{ review().username }}
            </a>
            <span class="text-slate-600">·</span>
            <a
              [routerLink]="['/games', encodeName(review().title)]"
              class="truncate text-sm text-slate-300 hover:text-white"
            >
              {{ review().title }}
            </a>
          </div>
          <p class="mt-3 text-slate-300 leading-relaxed">{{ review().comment }}</p>
        </div>
        <div
          class="flex shrink-0 flex-col items-center rounded-lg bg-slate-800 px-3 py-2"
        >
          <span class="text-lg font-bold text-emerald-400">{{ review().userScore }}</span>
          <span class="text-xs text-slate-500">/10</span>
        </div>
      </div>
      <div class="mt-4 flex items-center gap-4 border-t border-slate-800 pt-4">
        <button
          type="button"
          (click)="like.emit(review().id)"
          class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition hover:bg-slate-800"
          [class]="liked() ? 'text-rose-400' : 'text-slate-400 hover:text-rose-400'"
        >
          ♥ {{ review().likeCount }} like
        </button>
      </div>
    </article>
  `,
})
export class ReviewCardComponent {
  readonly review = input.required<Review>();
  readonly liked = input(false);
  readonly like = output<string>();

  encodeName(name: string): string {
    return encodeURIComponent(name);
  }
}
