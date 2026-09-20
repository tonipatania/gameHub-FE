import { Component, inject, input, output } from '@angular/core';
import { TranslationService } from '../../../core/services/translation.service';

/** Controllo "← Precedente · Pagina X di Y · Successiva →" condiviso da tutte le liste paginate. */
@Component({
  selector: 'app-pagination',
  host: { class: 'flex items-center justify-center gap-4' },
  template: `
    <button
      type="button"
      (click)="prev.emit()"
      [disabled]="disabled() || page() === 0"
      class="gh-btn gh-btn-outline"
    >
      {{ i18n.t('common.prev') }}
    </button>
    <span class="text-sm text-slate-400">
      {{ i18n.t('common.pageOf', { current: page() + 1, total: totalPages() }) }}
    </span>
    <button
      type="button"
      (click)="next.emit()"
      [disabled]="disabled() || page() >= totalPages() - 1"
      class="gh-btn gh-btn-outline"
    >
      {{ i18n.t('common.next') }}
    </button>
  `,
})
export class PaginationComponent {
  readonly i18n = inject(TranslationService);

  /** pagina corrente, a partire da 0 */
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  /** blocca i due bottoni mentre una pagina e' in caricamento */
  readonly disabled = input(false);

  readonly prev = output<void>();
  readonly next = output<void>();
}
