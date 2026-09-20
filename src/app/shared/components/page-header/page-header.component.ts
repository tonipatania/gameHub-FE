import { Component, input } from '@angular/core';

/** Titolo di pagina con sottotitolo opzionale; il contenuto proiettato (filtri, azioni) va a destra. */
@Component({
  selector: 'app-page-header',
  host: { class: 'mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between' },
  template: `
    <div class="min-w-0">
      <h1 class="gh-page-title">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="mt-1 text-slate-400">{{ subtitle() }}</p>
      }
    </div>
    <div class="flex flex-wrap items-center gap-3 empty:hidden">
      <ng-content />
    </div>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
