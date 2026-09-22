import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthShellComponent } from '../../../shared/components/auth-shell/auth-shell.component';
import { ToastService } from '../../../core/services/toast.service';
import {
  PASSWORD_PATTERN,
  USERNAME_PATTERN,
  passwordsMatchValidator,
} from '../../../core/validators/password.validators';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell [headingPrefix]="i18n.t('auth.signup.heading')">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="gh-panel p-8 shadow-xl">
        <div class="mb-4 grid grid-cols-2 gap-3">
          <label>
            <span class="gh-label">{{ i18n.t('auth.signup.nameLabel') }}</span>
            <input formControlName="name" class="gh-input" />
          </label>
          <label>
            <span class="gh-label">{{ i18n.t('auth.signup.surnameLabel') }}</span>
            <input formControlName="surname" class="gh-input" />
          </label>
        </div>

        <label class="mb-4 block">
          <span class="gh-label">{{ i18n.t('auth.signup.usernameLabel') }}</span>
          <input formControlName="username" maxlength="20" class="gh-input" />
          <span class="mt-1 block text-xs text-slate-500">{{
            i18n.t('auth.signup.usernameHint')
          }}</span>
        </label>

        <label class="mb-4 block">
          <span class="gh-label">{{ i18n.t('auth.signup.emailLabel') }}</span>
          <input formControlName="email" type="email" class="gh-input" />
        </label>

        <label class="mb-4 block">
          <span class="gh-label">{{ i18n.t('auth.signup.passwordLabel') }}</span>
          <input
            formControlName="password"
            type="password"
            maxlength="32"
            (focus)="passwordFocused.set(true)"
            (blur)="passwordFocused.set(false)"
            class="gh-input"
          />
          @if (passwordFocused() || passwordValue()) {
            <ul
              class="mt-2 space-y-1 rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-xs"
            >
              <li [class]="passwordRules().minLength ? 'text-emerald-400' : 'text-slate-400'">
                <span class="mr-1">{{ passwordRules().minLength ? '✓' : '○' }}</span>
                {{ i18n.t('auth.signup.passwordRuleMinLength') }}
              </li>
              <li [class]="passwordRules().maxLength ? 'text-emerald-400' : 'text-slate-400'">
                <span class="mr-1">{{ passwordRules().maxLength ? '✓' : '○' }}</span>
                {{ i18n.t('auth.signup.passwordRuleMaxLength') }}
              </li>
              <li [class]="passwordRules().hasUppercase ? 'text-emerald-400' : 'text-slate-400'">
                <span class="mr-1">{{ passwordRules().hasUppercase ? '✓' : '○' }}</span>
                {{ i18n.t('auth.signup.passwordRuleUppercase') }}
              </li>
              <li [class]="passwordRules().hasSpecialChar ? 'text-emerald-400' : 'text-slate-400'">
                <span class="mr-1">{{ passwordRules().hasSpecialChar ? '✓' : '○' }}</span>
                {{ i18n.t('auth.signup.passwordRuleSpecialChar') }}
              </li>
              <li [class]="passwordRules().noSpaces ? 'text-emerald-400' : 'text-slate-400'">
                <span class="mr-1">{{ passwordRules().noSpaces ? '✓' : '○' }}</span>
                {{ i18n.t('auth.signup.passwordRuleNoSpaces') }}
              </li>
            </ul>
          }
        </label>

        <label class="mb-6 block">
          <span class="gh-label">{{ i18n.t('auth.signup.confirmPasswordLabel') }}</span>
          <input
            formControlName="confirmPassword"
            type="password"
            maxlength="32"
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
          {{ loading() ? i18n.t('auth.signup.submitLoading') : i18n.t('auth.signup.submit') }}
        </button>

        <p class="mt-6 text-center text-sm text-slate-400">
          {{ i18n.t('auth.signup.haveAccount') }}
          <a routerLink="/login" class="gh-link">{{ i18n.t('auth.signup.loginLink') }}</a>
        </p>
      </form>
    </app-auth-shell>
  `,
})
export class SignupComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(TranslationService);

  readonly loading = signal(false);
  readonly passwordFocused = signal(false);
  readonly confirmPasswordTouched = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', Validators.required],
      surname: ['', Validators.required],
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
          Validators.pattern(USERNAME_PATTERN),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
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

  readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

  readonly passwordRules = computed(() => {
    const value = this.passwordValue();
    return {
      minLength: value.length >= 8,
      maxLength: value.length <= 32,
      hasUppercase: /[A-Z]/.test(value),
      hasSpecialChar: /[^A-Za-z0-9\s]/.test(value),
      noSpaces: value.length === 0 || !/\s/.test(value),
    };
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);

    const { confirmPassword, ...registration } = this.form.getRawValue();

    this.auth.signup(registration).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success(this.i18n.t('auth.signup.successMessage'));
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(
          typeof err.error === 'string' ? err.error : this.i18n.t('auth.signup.genericError'),
        );
      },
    });
  }
}
