import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastContentComponent } from '../../shared/components/toast/toast-content.component';

export type ToastType = 'success' | 'error' | 'info';

const DEFAULT_DURATION_MS: Record<ToastType, number> = {
  success: 5000,
  error: 7000,
  info: 5000,
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string, durationMs = DEFAULT_DURATION_MS.success): void {
    this.show('success', message, durationMs);
  }

  error(message: string, durationMs = DEFAULT_DURATION_MS.error): void {
    this.show('error', message, durationMs);
  }

  info(message: string, durationMs = DEFAULT_DURATION_MS.info): void {
    this.show('info', message, durationMs);
  }

  private show(type: ToastType, message: string, durationMs: number): void {
    this.snackBar.openFromComponent(ToastContentComponent, {
      data: { message, type, durationMs },
      duration: durationMs,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: ['gh-toast-panel'],
    });
  }
}
