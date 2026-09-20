import { Component, computed, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslationService } from '../../../core/services/translation.service';
import { SCORES, scoreColor, scoreLabelKey } from '../../utils/score';

/**
 * Selettore di voto 1-10 al posto del campo numerico con le frecce: una barra di dieci tacche che
 * si colora dal rosso al verde, un voto grande a sinistra e un giudizio a parole. Si usa come un
 * normale controllo di form (formControlName).
 */
@Component({
  selector: 'app-score-picker',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ScorePickerComponent),
      multi: true,
    },
  ],
  template: `
    <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div
        class="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 bg-slate-950/60 transition-colors duration-200"
        [style.border-color]="color()"
        aria-hidden="true"
      >
        <span class="text-4xl font-black leading-none tabular-nums" [style.color]="color()">
          {{ shown() }}
        </span>
        <span class="mt-1 text-xs text-slate-500">/10</span>
      </div>

      <!-- min-w: sotto questa larghezza la barra va a capo sotto il voto, cosi le tacche restano toccabili -->
      <div class="min-w-[15rem] flex-1">
        <p
          class="mb-2 truncate text-sm font-semibold transition-colors duration-200"
          [style.color]="color()"
          aria-live="polite"
        >
          {{ i18n.t(labelKey()) }}
        </p>
        <div
          role="radiogroup"
          [attr.aria-label]="i18n.t('scorePicker.label')"
          class="flex gap-1 sm:gap-1.5"
          (mouseleave)="hovered.set(null)"
        >
          @for (n of scores; track n) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="value() === n"
              [attr.aria-label]="n + ' / 10'"
              [disabled]="disabled()"
              (click)="select(n)"
              (mouseenter)="hovered.set(n)"
              (focus)="hovered.set(n)"
              (blur)="hovered.set(null)"
              (keydown)="onKey($event)"
              class="h-10 min-w-0 flex-1 cursor-pointer rounded-md text-xs font-bold outline-none transition duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
              [class]="tickClass(n)"
              [style.background-color]="n <= shown() ? colorOf(n) : null"
            >
              {{ n }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class ScorePickerComponent implements ControlValueAccessor {
  readonly i18n = inject(TranslationService);
  readonly scores = SCORES;

  readonly value = signal<number | null>(null);
  readonly hovered = signal<number | null>(null);
  readonly disabled = signal(false);

  // con il mouse (o il focus) sopra una tacca si anticipa il voto che verrebbe scelto
  readonly shown = computed(() => this.hovered() ?? this.value() ?? 0);
  readonly color = computed(() => (this.shown() ? scoreColor(this.shown()) : '#475569'));
  readonly labelKey = computed(() =>
    this.shown() ? scoreLabelKey(this.shown()) : 'scorePicker.placeholder',
  );

  private onChange: (value: number) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  colorOf(score: number): string {
    return scoreColor(score);
  }

  // la tacca scelta ha un anello bianco: resta visibile anche quando il mouse sta altrove
  tickClass(score: number): string {
    const filled = score <= this.shown() ? 'text-slate-950' : 'bg-slate-800 text-slate-500';
    return this.value() === score ? `${filled} ring-2 ring-white` : filled;
  }

  select(score: number): void {
    if (this.disabled()) return;
    this.value.set(score);
    this.onChange(score);
    this.onTouched();
  }

  onKey(event: KeyboardEvent): void {
    const current = this.value() ?? 0;
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(10, current + 1);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(1, current - 1);
    if (next === null) return;

    event.preventDefault();
    this.select(next);
    // il focus segue la tacca scelta, cosi si puo' proseguire con le frecce
    const group = (event.currentTarget as HTMLElement).parentElement;
    (group?.children[next - 1] as HTMLElement | undefined)?.focus();
  }

  writeValue(value: number | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
