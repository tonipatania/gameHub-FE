import { Component, input } from '@angular/core';

/** Cornice delle pagine senza toolbar (login, registrazione, recupero password): centrata, stretta. */
@Component({
  selector: 'app-auth-shell',
  host: { class: 'flex min-h-screen items-center justify-center gh-gutter py-8' },
  template: `
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <span class="text-5xl">🎮</span>
        @if (brand()) {
          <h1 class="mt-4 text-3xl font-bold text-white">
            @if (headingPrefix()) {
              {{ headingPrefix() }}
            }
            Game<span class="text-violet-400">Hub</span>
          </h1>
        }
        @if (subtitle()) {
          <p class="mt-2 text-slate-400">{{ subtitle() }}</p>
        }
      </div>
      <ng-content />
    </div>
  `,
})
export class AuthShellComponent {
  /** mostra il titolo "GameHub" sotto il logo (la conferma email ha solo il logo) */
  readonly brand = input(true);
  /** testo prima di "GameHub", es. "Iscriviti a" */
  readonly headingPrefix = input('');
  readonly subtitle = input('');
}
