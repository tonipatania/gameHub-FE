import { Component, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { TranslationService } from '../../../core/services/translation.service';
import { ToastType } from '../../../core/services/toast.service';

export interface ToastData {
  message: string;
  type: ToastType;
  durationMs: number;
}

const ACCENT_BORDER: Record<ToastType, string> = {
  success: 'border-l-emerald-500',
  error: 'border-l-rose-500',
  info: 'border-l-violet-500',
};

const BADGE_CLASS: Record<ToastType, string> = {
  success: 'bg-emerald-500/15 text-emerald-400',
  error: 'bg-rose-500/15 text-rose-400',
  info: 'bg-violet-500/15 text-violet-400',
};

const TITLE_CLASS: Record<ToastType, string> = {
  success: 'text-emerald-400',
  error: 'text-rose-400',
  info: 'text-violet-400',
};

const PROGRESS_CLASS: Record<ToastType, string> = {
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
  info: 'bg-violet-500',
};

const TITLE_KEY: Record<ToastType, string> = {
  success: 'common.toastSuccess',
  error: 'common.toastError',
  info: 'common.toastInfo',
};

const ICON_PATH: Record<ToastType, string> = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 18L18 6M6 6l12 12',
  info: 'M12 17v-6M12 8h.01',
};

@Component({
  selector: 'app-toast-content',
  template: `
    <div
      role="status"
      class="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 border-l-4 bg-slate-900/95 py-3 pr-3 pl-4 shadow-[0_12px_36px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md"
      [class]="accentBorder"
    >
      <div class="flex items-start gap-3">
        <span
          class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          [class]="badgeClass"
        >
          <svg viewBox="0 0 24 24" fill="none" class="h-4 w-4">
            <path
              [attr.d]="iconPath"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>

        <div class="min-w-0 flex-1 pt-0.5">
          <p class="text-[11px] font-semibold tracking-wide uppercase" [class]="titleClass">
            {{ title }}
          </p>
          <p class="mt-0.5 text-sm leading-snug font-medium text-slate-200">{{ data.message }}</p>
        </div>

        <button
          type="button"
          (click)="snackBarRef.dismiss()"
          aria-label="Chiudi"
          class="-mt-1 -mr-1 shrink-0 rounded-md p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
        >
          <svg viewBox="0 0 24 24" fill="none" class="h-3.5 w-3.5">
            <path
              d="M6 18L18 6M6 6l12 12"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <div class="absolute inset-x-0 bottom-0 h-0.5 bg-white/5">
        <div
          class="gh-toast-progress h-full origin-left"
          [class]="progressClass"
          [style.animation-duration.ms]="data.durationMs"
        ></div>
      </div>
    </div>
  `,
  styles: `
    @keyframes gh-toast-progress {
      from {
        transform: scaleX(1);
      }
      to {
        transform: scaleX(0);
      }
    }
    .gh-toast-progress {
      animation-name: gh-toast-progress;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
    }
  `,
})
export class ToastContentComponent {
  private readonly i18n = inject(TranslationService);

  readonly data = inject<ToastData>(MAT_SNACK_BAR_DATA);
  readonly snackBarRef = inject(MatSnackBarRef<ToastContentComponent>);

  readonly accentBorder = ACCENT_BORDER[this.data.type];
  readonly badgeClass = BADGE_CLASS[this.data.type];
  readonly titleClass = TITLE_CLASS[this.data.type];
  readonly progressClass = PROGRESS_CLASS[this.data.type];
  readonly iconPath = ICON_PATH[this.data.type];
  readonly title = this.i18n.t(TITLE_KEY[this.data.type]);
}
