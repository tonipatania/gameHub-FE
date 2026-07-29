import { Component, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-back-button',
  template: `
    <button
      type="button"
      (click)="goBack()"
      class="mb-6 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-300 transition hover:border-violet-500/50 hover:text-white"
    >
      <span aria-hidden="true">←</span> {{ label() }}
    </button>
  `,
})
export class BackButtonComponent {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly label = input('Indietro');
  /** dove andare quando non c'e' cronologia (link aperto in una scheda nuova, refresh) */
  readonly fallback = input('/home');

  goBack(): void {
    // Location.back() su una scheda senza cronologia non fa nulla e l'utente resta bloccato:
    // in quel caso si naviga su una rotta di fallback.
    if (this.hasHistory()) {
      this.location.back();
      return;
    }
    this.router.navigate([this.fallback()]);
  }

  private hasHistory(): boolean {
    return typeof history !== 'undefined' && history.length > 1;
  }
}
