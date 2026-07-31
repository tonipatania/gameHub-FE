import { Component, inject } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { BackButtonComponent } from '../../shared/components/back-button/back-button.component';
import { LangCode, TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-settings',
  imports: [NavbarComponent, BackButtonComponent],
  template: `
    <app-navbar />
    <main class="mx-auto max-w-2xl px-4 py-8">
      <app-back-button />
      <h1 class="mb-8 text-3xl font-bold text-white">{{ i18n.t('settings.title') }}</h1>

      <section class="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
        <h2 class="text-lg font-semibold text-white">
          {{ i18n.t('settings.languageSectionTitle') }}
        </h2>
        <p class="mt-1 text-sm text-slate-400">
          {{ i18n.t('settings.languageSectionDescription') }}
        </p>

        <div class="mt-4 flex gap-2">
          @for (option of i18n.availableLanguages; track option.code) {
            <button
              type="button"
              (click)="select(option.code)"
              class="rounded-lg px-4 py-2 text-sm font-medium transition"
              [class]="
                i18n.lang() === option.code
                  ? 'bg-violet-600 text-white'
                  : 'border border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white'
              "
            >
              {{ i18n.t(option.labelKey) }}
            </button>
          }
        </div>
      </section>
    </main>
  `,
})
export class SettingsComponent {
  readonly i18n = inject(TranslationService);

  select(lang: LangCode): void {
    this.i18n.setLang(lang);
  }
}
