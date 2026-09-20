import { Component, inject } from '@angular/core';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { BackButtonComponent } from '../../shared/components/back-button/back-button.component';
import { LangCode, TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-settings',
  imports: [PageLayoutComponent, PageHeaderComponent, BackButtonComponent],
  template: `
    <app-page-layout>
      <app-back-button />
      <app-page-header [title]="i18n.t('settings.title')" />

      <div class="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        <section class="gh-card p-6">
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
                class="gh-btn"
                [class]="i18n.lang() === option.code ? 'gh-btn-primary' : 'gh-btn-outline'"
              >
                {{ i18n.t(option.labelKey) }}
              </button>
            }
          </div>
        </section>
      </div>
    </app-page-layout>
  `,
})
export class SettingsComponent {
  readonly i18n = inject(TranslationService);

  select(lang: LangCode): void {
    this.i18n.setLang(lang);
  }
}
