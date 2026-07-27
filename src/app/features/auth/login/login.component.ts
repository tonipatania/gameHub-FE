import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center px-4">
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <span class="text-5xl">🎮</span>
          <h1 class="mt-4 text-3xl font-bold text-white">
            Game<span class="text-violet-400">Hub</span>
          </h1>
          <p class="mt-2 text-slate-400">Il social network per i videogiochi</p>
        </div>

        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          class="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl"
        >
          <h2 class="mb-6 text-xl font-semibold text-white">Accedi</h2>

          @if (error()) {
            <div class="mb-4 rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {{ error() }}
            </div>
          }

          <label class="mb-4 block">
            <span class="mb-1 block text-sm text-slate-400">Username</span>
            <input
              formControlName="username"
              type="text"
              class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white outline-none focus:border-violet-500"
              placeholder="Il tuo username"
            />
          </label>

          <label class="mb-6 block">
            <span class="mb-1 block text-sm text-slate-400">Password</span>
            <input
              formControlName="password"
              type="password"
              class="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white outline-none focus:border-violet-500"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            [disabled]="form.invalid || loading()"
            class="w-full rounded-lg bg-violet-600 py-2.5 font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {{ loading() ? 'Accesso...' : 'Entra' }}
          </button>

          <p class="mt-6 text-center text-sm text-slate-400">
            Non hai un account?
            <a routerLink="/signup" class="text-violet-400 hover:text-violet-300">
              Registrati
            </a>
          </p>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success) {
          this.router.navigate(['/home']);
        } else {
          this.error.set(response.errorMessage || 'Credenziali non valide');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Errore di connessione al server');
      },
    });
  }
}
