import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center px-4 py-8">
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <span class="text-5xl">🎮</span>
          <h1 class="mt-4 text-3xl font-bold text-white">
            {{ i18n.t('auth.signup.heading') }} <span class="text-violet-400">GameHub</span>
          </h1>
        </div>

        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          class="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl"
        >
          @if (error()) {
            <div class="mb-4 rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {{ error() }}
            </div>
          }
          @if (success()) {
            <div class="mb-4 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {{ i18n.t('auth.signup.successMessage') }}
            </div>
          }

          <div class="mb-4 grid grid-cols-2 gap-3">
            <label>
              <span class="mb-1 block text-sm text-slate-400">{{ i18n.t('auth.signup.nameLabel') }}</span>
              <input
                formControlName="name"
                class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-violet-500"
              />
            </label>
            <label>
              <span class="mb-1 block text-sm text-slate-400">{{ i18n.t('auth.signup.surnameLabel') }}</span>
              <input
                formControlName="surname"
                class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-violet-500"
              />
            </label>
          </div>

          <label class="mb-4 block">
            <span class="mb-1 block text-sm text-slate-400">{{ i18n.t('auth.signup.usernameLabel') }}</span>
            <input
              formControlName="username"
              class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-violet-500"
            />
          </label>

          <label class="mb-4 block">
            <span class="mb-1 block text-sm text-slate-400">{{ i18n.t('auth.signup.emailLabel') }}</span>
            <input
              formControlName="email"
              type="email"
              class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-violet-500"
            />
          </label>

          <label class="mb-6 block">
            <span class="mb-1 block text-sm text-slate-400">{{ i18n.t('auth.signup.passwordLabel') }}</span>
            <input
              formControlName="password"
              type="password"
              (focus)="passwordFocused.set(true)"
              (blur)="passwordFocused.set(false)"
              class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-violet-500"
            />
            @if (passwordFocused() || passwordValue()) {
              <ul class="mt-2 space-y-1 rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-xs">
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
              </ul>
            }
          </label>

          <button
            type="submit"
            [disabled]="form.invalid || loading()"
            class="w-full rounded-lg bg-violet-600 py-2.5 font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {{ loading() ? i18n.t('auth.signup.submitLoading') : i18n.t('auth.signup.submit') }}
          </button>

          <p class="mt-6 text-center text-sm text-slate-400">
            {{ i18n.t('auth.signup.haveAccount') }}
            <a routerLink="/login" class="text-violet-400 hover:text-violet-300">{{ i18n.t('auth.signup.loginLink') }}</a>
          </p>
        </form>
      </div>
    </div>
  `,
})
export class SignupComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly i18n = inject(TranslationService);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal(false);
  readonly passwordFocused = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    surname: ['', Validators.required],
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(32),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/),
      ],
    ],
  });

  readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

  readonly passwordRules = computed(() => {
    const value = this.passwordValue();
    return {
      minLength: value.length >= 8,
      maxLength: value.length <= 32,
      hasUppercase: /[A-Z]/.test(value),
      hasSpecialChar: /[^A-Za-z0-9]/.test(value),
    };
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set('');

    this.auth.signup(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          typeof err.error === 'string'
            ? err.error
            : this.i18n.t('auth.signup.genericError'),
        );
      },
    });
  }
}
