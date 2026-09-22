import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Stessa policy del backend (RegistrationDTO / ResetPasswordDTO): una maiuscola e un carattere
 * speciale, senza spazi. Lo spazio e' escluso esplicitamente dal carattere speciale richiesto,
 * altrimenti basterebbe uno spazio a soddisfare il requisito.
 */
export const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9\s])\S+$/;

/** Stessa policy del backend (RegistrationDTO): alfanumerico, punti, underscore e trattini, senza spazi. */
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}
