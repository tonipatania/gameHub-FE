import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthShellComponent } from '../../../shared/components/auth-shell/auth-shell.component';

type ConfirmState = 'pending' | 'success' | 'error';

@Component({
  selector: 'app-confirm-email',
  imports: [RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell [brand]="false">
      <div class="text-center">
        <div class="gh-panel p-8 shadow-xl">
          @switch (state()) {
            @case ('pending') {
              <h1 class="text-xl font-semibold text-white">
                {{ i18n.t('auth.confirmEmail.pendingTitle') }}
              </h1>
              <p class="mt-2 text-sm text-slate-400">
                {{ i18n.t('auth.confirmEmail.pendingSubtitle') }}
              </p>
            }
            @case ('success') {
              <h1 class="text-xl font-semibold text-emerald-300">
                {{ i18n.t('auth.confirmEmail.successTitle') }}
              </h1>
              <p class="mt-2 text-sm text-slate-400">
                {{ i18n.t('auth.confirmEmail.successSubtitle') }}
              </p>
            }
            @case ('error') {
              <h1 class="text-xl font-semibold text-rose-300">
                {{ i18n.t('auth.confirmEmail.errorTitle') }}
              </h1>
              <p class="mt-2 text-sm text-slate-400">{{ message() }}</p>
            }
          }

          <a routerLink="/login" class="mt-6 gh-btn gh-btn-primary">
            {{ i18n.t('auth.confirmEmail.goToLogin') }}
          </a>
        </div>
      </div>
    </app-auth-shell>
  `,
})
export class ConfirmEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  readonly i18n = inject(TranslationService);

  readonly state = signal<ConfirmState>('pending');
  readonly message = signal('');

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const token = params.get('token');
      if (!token) {
        this.state.set('error');
        this.message.set(this.i18n.t('auth.confirmEmail.missingToken'));
        return;
      }

      this.auth.confirmEmail(token).subscribe({
        next: () => this.state.set('success'),
        error: (err) => {
          this.state.set('error');
          this.message.set(
            typeof err.error === 'string' ? err.error : this.i18n.t('auth.confirmEmail.errorTitle'),
          );
        },
      });
    });
  }
}
