import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthShellComponent } from '../../../shared/components/auth-shell/auth-shell.component';
import { ToastService } from '../../../core/services/toast.service';
import { USERNAME_PATTERN } from '../../../core/validators/password.validators';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell [subtitle]="i18n.t('auth.login.subtitle')">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="gh-panel p-8 shadow-xl">
        <h2 class="mb-6 text-xl font-semibold text-white">{{ i18n.t('auth.login.heading') }}</h2>

        <label class="mb-4 block">
          <span class="gh-label">{{ i18n.t('auth.login.usernameLabel') }}</span>
          <input
            formControlName="username"
            type="text"
            maxlength="20"
            class="gh-input"
            [placeholder]="i18n.t('auth.login.usernamePlaceholder')"
          />
        </label>

        <label class="mb-2 block">
          <span class="gh-label">{{ i18n.t('auth.login.passwordLabel') }}</span>
          <input
            formControlName="password"
            type="password"
            class="gh-input"
            placeholder="••••••••"
          />
          <span class="mt-1 block text-xs text-slate-500">{{
            i18n.t('auth.login.passwordHint')
          }}</span>
        </label>

        <p class="mb-6 text-right text-sm">
          <a routerLink="/forgot-password" class="gh-link">
            {{ i18n.t('auth.login.forgotPasswordLink') }}
          </a>
        </p>

        <button
          type="submit"
          [disabled]="form.invalid || loading()"
          class="gh-btn gh-btn-primary w-full py-2.5"
        >
          {{ loading() ? i18n.t('auth.login.submitLoading') : i18n.t('auth.login.submit') }}
        </button>

        <p class="mt-6 text-center text-sm text-slate-400">
          {{ i18n.t('auth.login.noAccount') }}
          <a routerLink="/signup" class="gh-link">
            {{ i18n.t('auth.login.signupLink') }}
          </a>
        </p>
      </form>
    </app-auth-shell>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(TranslationService);

  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
        Validators.pattern(USERNAME_PATTERN),
      ],
    ],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(32)]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success) {
          this.router.navigate(['/home']);
        } else {
          this.toast.error(this.translateAuthError(response.errorCode));
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 401) {
          // Credenziali errate o account non confermato: torna un AuthResponse JSON con
          // errorCode, tradotto lato client cosi' il messaggio segue la lingua dell'interfaccia
          // invece di quella hardcoded nel backend.
          this.toast.error(this.translateAuthError(err.error?.errorCode));
        } else if (err.status === 400) {
          // Validazione fallita (es. password troppo lunga): il backend risponde gia' in
          // italiano con un body testuale semplice.
          this.toast.error(
            typeof err.error === 'string'
              ? err.error
              : this.i18n.t('auth.login.invalidCredentials'),
          );
        } else {
          this.toast.error(this.i18n.t('auth.login.connectionError'));
        }
      },
    });
  }

  private translateAuthError(errorCode: string | null | undefined): string {
    switch (errorCode) {
      case 'EMAIL_NOT_CONFIRMED':
        return this.i18n.t('auth.login.emailNotConfirmed');
      case 'AUTH_ERROR':
        return this.i18n.t('auth.login.authError');
      default:
        return this.i18n.t('auth.login.invalidCredentials');
    }
  }
}
