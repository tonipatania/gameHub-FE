import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center px-4 py-8">
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <span class="text-5xl">🎮</span>
          <h1 class="mt-4 text-3xl font-bold text-white">
            Unisciti a <span class="text-violet-400">GameHub</span>
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
              Registrazione completata! Reindirizzamento al login...
            </div>
          }

          <div class="mb-4 grid grid-cols-2 gap-3">
            <label>
              <span class="mb-1 block text-sm text-slate-400">Nome</span>
              <input
                formControlName="name"
                class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-violet-500"
              />
            </label>
            <label>
              <span class="mb-1 block text-sm text-slate-400">Cognome</span>
              <input
                formControlName="surname"
                class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-violet-500"
              />
            </label>
          </div>

          <label class="mb-4 block">
            <span class="mb-1 block text-sm text-slate-400">Username</span>
            <input
              formControlName="username"
              class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-violet-500"
            />
          </label>

          <label class="mb-4 block">
            <span class="mb-1 block text-sm text-slate-400">Email</span>
            <input
              formControlName="email"
              type="email"
              class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-violet-500"
            />
          </label>

          <label class="mb-6 block">
            <span class="mb-1 block text-sm text-slate-400">Password</span>
            <input
              formControlName="password"
              type="password"
              class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-violet-500"
            />
          </label>

          <button
            type="submit"
            [disabled]="form.invalid || loading()"
            class="w-full rounded-lg bg-violet-600 py-2.5 font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {{ loading() ? 'Registrazione...' : 'Crea account' }}
          </button>

          <p class="mt-6 text-center text-sm text-slate-400">
            Hai già un account?
            <a routerLink="/login" class="text-violet-400 hover:text-violet-300">Accedi</a>
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

  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    surname: ['', Validators.required],
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
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
            : 'Errore durante la registrazione',
        );
      },
    });
  }
}
