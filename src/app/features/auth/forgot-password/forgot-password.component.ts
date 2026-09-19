import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center px-4">
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <span class="text-5xl">🎮</span>
          <h1 class="mt-4 text-3xl font-bold text-white">
            Game<span class="text-violet-400">Hub</span>
          </h1>
        </div>

        @if (sent()) {
          <div
            class="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-xl"
          >
            <h2 class="text-xl font-semibold text-emerald-300">
              {{ i18n.t('auth.forgotPassword.sentTitle') }}
            </h2>
            <p class="mt-2 text-sm text-slate-400">
              {{ i18n.t('auth.forgotPassword.sentMessage') }}
            </p>
            <a
              routerLink="/login"
              class="mt-6 inline-block rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white transition hover:bg-violet-500"
            >
              {{ i18n.t('auth.forgotPassword.backToLogin') }}
            </a>
          </div>
        } @else {
          <form
            [formGroup]="form"
            (ngSubmit)="onSubmit()"
            class="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl"
          >
            <h2 class="mb-2 text-xl font-semibold text-white">
              {{ i18n.t('auth.forgotPassword.heading') }}
            </h2>
            <p class="mb-6 text-sm text-slate-400">
              {{ i18n.t('auth.forgotPassword.subtitle') }}
            </p>

            <label class="mb-6 block">
              <span class="mb-1 block text-sm text-slate-400">{{
                i18n.t('auth.forgotPassword.emailLabel')
              }}</span>
              <input
                formControlName="email"
                type="email"
                autocomplete="email"
                class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white outline-none focus:border-violet-500"
              />
            </label>

            <button
              type="submit"
              [disabled]="form.invalid || loading()"
              class="w-full rounded-lg bg-violet-600 py-2.5 font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {{
                loading()
                  ? i18n.t('auth.forgotPassword.submitLoading')
                  : i18n.t('auth.forgotPassword.submit')
              }}
            </button>

            <p class="mt-6 text-center text-sm text-slate-400">
              <a routerLink="/login" class="text-violet-400 hover:text-violet-300">
                {{ i18n.t('auth.forgotPassword.backToLogin') }}
              </a>
            </p>
          </form>
        }
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(TranslationService);

  readonly loading = signal(false);
  readonly sent = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);

    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => {
        this.loading.set(false);
        // Lo stesso messaggio vale sia se l'email ha un account sia se no: il backend non
        // rivela quali email sono registrate, quindi nemmeno la UI puo' farlo.
        this.sent.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.toast.error(
          err.status === 429
            ? this.i18n.t('auth.forgotPassword.tooManyRequests')
            : this.i18n.t('auth.login.connectionError'),
        );
      },
    });
  }
}
