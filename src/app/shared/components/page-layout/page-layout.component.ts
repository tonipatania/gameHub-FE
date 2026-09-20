import { Component } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';

/**
 * Guscio comune di tutte le pagine autenticate: toolbar + contenuto a tutta larghezza con gli
 * stessi margini (`gh-gutter`) della toolbar. Le pagine ci mettono dentro solo il proprio contenuto.
 */
@Component({
  selector: 'app-page-layout',
  imports: [NavbarComponent],
  host: { class: 'block' },
  template: `
    <app-navbar />
    <main class="gh-gutter py-6 sm:py-8">
      <ng-content />
    </main>
  `,
})
export class PageLayoutComponent {}
