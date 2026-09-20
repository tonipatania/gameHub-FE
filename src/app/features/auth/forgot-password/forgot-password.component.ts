import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthShellComponent } from '../../../shared/components/auth-shell/auth-shell.component';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell>
      @if (sent()) {
        <div class="gh-panel p-8 text-center shadow-xl">
          <h2 class="text-xl font-semibold text-emerald-300">
            {{ i18n.t('auth.forgotPassword.sentTitle') }}
          </h2>
          <p class="mt-2 text-sm text-slate-400">
            {{ i18n.t('auth.forgotPassword.sentMessage') }}
          </p>
          <a routerLink="/login" class="mt-6 gh-btn gh-btn-primary">
            {{ i18n.t('auth.forgotPassword.backToLogin') }}
          </a>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="gh-panel p-8 shadow-xl">
          <h2 class="mb-2 text-xl font-semibold text-white">
            {{ i18n.t('auth.forgotPassword.heading') }}
          </h2>
          <p class="mb-6 text-sm text-slate-400">
            {{ i18n.t('auth.forgotPassword.subtitle') }}
          </p>

          <label class="mb-6 block">
            <span class="gh-label">{{ i18n.t('auth.forgotPassword.emailLabel') }}</span>
            <input formControlName="email" type="email" autocomplete="email" class="gh-input" />
          </label>

          <button
            type="submit"
            [disabled]="form.invalid || loading()"
            class="gh-btn gh-btn-primary w-full py-2.5"
          >
            {{
              loading()
                ? i18n.t('auth.forgotPassword.submitLoading')
                : i18n.t('auth.forgotPassword.submit')
            }}
          </button>

          <p class="mt-6 text-center text-sm text-slate-400">
            <a routerLink="/login" class="gh-link">
              {{ i18n.t('auth.forgotPassword.backToLogin') }}
            </a>
          </p>
        </form>
      }
    </app-auth-shell>
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
