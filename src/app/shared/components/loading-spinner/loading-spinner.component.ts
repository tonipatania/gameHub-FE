import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  template: `
    <div class="flex items-center justify-center py-16">
      <div
        class="h-10 w-10 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"
      ></div>
    </div>
  `,
})
export class LoadingSpinnerComponent {}
