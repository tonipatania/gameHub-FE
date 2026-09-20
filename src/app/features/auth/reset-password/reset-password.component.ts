import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthShellComponent } from '../../../shared/components/auth-shell/auth-shell.component';
import { ToastService } from '../../../core/services/toast.service';
import {
  PASSWORD_PATTERN,
  passwordsMatchValidator,
} from '../../../core/validators/password.validators';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell>
      @if (done()) {
        <div class="gh-panel p-8 text-center shadow-xl">
          <h2 class="text-xl font-semibold text-emerald-300">
            {{ i18n.t('auth.resetPassword.successTitle') }}
          </h2>
          <p class="mt-2 text-sm text-slate-400">
            {{ i18n.t('auth.resetPassword.successMessage') }}
          </p>
          <a routerLink="/login" class="mt-6 gh-btn gh-btn-primary">
            {{ i18n.t('auth.confirmEmail.goToLogin') }}
          </a>
        </div>
      } @else if (!token) {
        <div class="gh-panel p-8 text-center shadow-xl">
          <h2 class="text-xl font-semibold text-rose-300">
            {{ i18n.t('auth.resetPassword.invalidLinkTitle') }}
          </h2>
          <p class="mt-2 text-sm text-slate-400">
            {{ i18n.t('auth.resetPassword.missingToken') }}
          </p>
          <a routerLink="/forgot-password" class="mt-6 gh-btn gh-btn-primary">
            {{ i18n.t('auth.resetPassword.requestNewLink') }}
          </a>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="gh-panel p-8 shadow-xl">
          <h2 class="mb-6 text-xl font-semibold text-white">
            {{ i18n.t('auth.resetPassword.heading') }}
          </h2>

          <label class="mb-4 block">
            <span class="gh-label">{{ i18n.t('auth.resetPassword.passwordLabel') }}</span>
            <input
              formControlName="password"
              type="password"
              maxlength="32"
              autocomplete="new-password"
              class="gh-input"
            />
            <ul
              class="mt-2 space-y-1 rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-xs"
            >
              @for (rule of passwordRules(); track rule.key) {
                <li [class]="rule.met ? 'text-emerald-400' : 'text-slate-400'">
                  <span class="mr-1">{{ rule.met ? '✓' : '○' }}</span>
                  {{ i18n.t(rule.key) }}
                </li>
              }
            </ul>
          </label>

          <label class="mb-6 block">
            <span class="gh-label">{{ i18n.t('auth.signup.confirmPasswordLabel') }}</span>
            <input
              formControlName="confirmPassword"
              type="password"
              maxlength="32"
              autocomplete="new-password"
              (blur)="confirmPasswordTouched.set(true)"
              class="gh-input"
            />
            @if (confirmPasswordTouched() && form.errors?.['passwordMismatch']) {
              <p class="mt-1 text-xs text-rose-400">
                {{ i18n.t('auth.signup.passwordMismatchError') }}
              </p>
            }
          </label>

          <button
            type="submit"
            [disabled]="form.invalid || loading()"
            class="gh-btn gh-btn-primary w-full py-2.5"
          >
            {{
              loading()
                ? i18n.t('auth.resetPassword.submitLoading')
                : i18n.t('auth.resetPassword.submit')
            }}
          </button>
        </form>
      }
    </app-auth-shell>
  `,
})
export class ResetPasswordComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(TranslationService);

  // Il link nell'email porta il token come query param; non cambia mentre la pagina e' aperta.
  readonly token = this.route.snapshot.queryParamMap.get('token');

  readonly loading = signal(false);
  readonly done = signal(false);
  readonly confirmPasswordTouched = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(32),
          Validators.pattern(PASSWORD_PATTERN),
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

  readonly passwordRules = computed(() => {
    const value = this.passwordValue();
    return [
      { key: 'auth.signup.passwordRuleMinLength', met: value.length >= 8 },
      { key: 'auth.signup.passwordRuleMaxLength', met: value.length <= 32 },
      { key: 'auth.signup.passwordRuleUppercase', met: /[A-Z]/.test(value) },
      { key: 'auth.signup.passwordRuleSpecialChar', met: /[^A-Za-z0-9]/.test(value) },
    ];
  });

  onSubmit(): void {
    if (this.form.invalid || !this.token) return;

    this.loading.set(true);

    this.auth.resetPassword(this.token, this.form.getRawValue().password).subscribe({
      next: () => {
        this.loading.set(false);
        this.done.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 410) {
          this.toast.error(this.i18n.t('auth.resetPassword.expiredLink'));
        } else if (err.status === 400 && typeof err.error === 'string') {
          this.toast.error(err.error);
        } else {
          this.toast.error(this.i18n.t('auth.login.connectionError'));
        }
      },
    });
  }
}
