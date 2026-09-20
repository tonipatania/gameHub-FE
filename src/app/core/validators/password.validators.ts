import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Stessa policy del backend (RegistrationDTO / ResetPasswordDTO): una maiuscola e un carattere speciale. */
export const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/;

export function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}
