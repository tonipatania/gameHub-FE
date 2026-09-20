import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ResetPasswordComponent } from './reset-password.component';
import { TranslationService } from '../../../core/services/translation.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

describe('ResetPasswordComponent', () => {
  let httpMock: HttpTestingController;
  let i18n: TranslationService;
  let toastErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'reset-password', component: ResetPasswordComponent }]),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    i18n = TestBed.inject(TranslationService);
    toastErrorSpy = vi.spyOn(TestBed.inject(ToastService), 'error');
  });

  afterEach(() => httpMock.verify());

  // Il token arriva dalla query string del link nell'email: si naviga davvero verso la rotta
  // invece di stubbare ActivatedRoute, che RouterLink nel template usa a sua volta.
  async function open(url: string) {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl(url, ResetPasswordComponent);
    harness.detectChanges();
    return { harness, component };
  }

  it('shows the invalid-link state and no form when the token is missing', async () => {
    const { harness, component } = await open('/reset-password');

    expect(component.token).toBeNull();
    expect(harness.routeNativeElement?.querySelector('form')).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain(
      i18n.t('auth.resetPassword.missingToken'),
    );

    component.onSubmit();
    httpMock.expectNone(() => true);
  });

  it('keeps the form invalid for weak or mismatching passwords', async () => {
    const { component } = await open('/reset-password?token=tok-123');

    component.form.setValue({ password: 'weakpass', confirmPassword: 'weakpass' });
    expect(component.form.invalid).toBe(true);

    component.form.setValue({ password: 'NewPassw0rd!', confirmPassword: 'Different1!' });
    expect(component.form.errors?.['passwordMismatch']).toBe(true);

    component.form.setValue({ password: 'NewPassw0rd!', confirmPassword: 'NewPassw0rd!' });
    expect(component.form.valid).toBe(true);
  });

  it('does not call the API when submitted while invalid', async () => {
    const { component } = await open('/reset-password?token=tok-123');

    component.onSubmit();

    httpMock.expectNone(() => true);
  });

  it('posts the token and new password and shows the success state', async () => {
    const { harness, component } = await open('/reset-password?token=tok-123');
    component.form.setValue({ password: 'NewPassw0rd!', confirmPassword: 'NewPassw0rd!' });

    component.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/reset-password`);
    expect(req.request.body).toEqual({ token: 'tok-123', newPassword: 'NewPassw0rd!' });
    req.flush('Password aggiornata con successo');
    harness.detectChanges();

    expect(component.done()).toBe(true);
    expect(component.loading()).toBe(false);
    expect(harness.routeNativeElement?.textContent).toContain(
      i18n.t('auth.resetPassword.successMessage'),
    );
  });

  it('shows the expired-link message on 410', async () => {
    const { component } = await open('/reset-password?token=tok-123');
    component.form.setValue({ password: 'NewPassw0rd!', confirmPassword: 'NewPassw0rd!' });

    component.onSubmit();

    httpMock
      .expectOne(`${environment.apiUrl}/reset-password`)
      .flush('scaduto', { status: 410, statusText: 'Gone' });

    expect(component.done()).toBe(false);
    expect(toastErrorSpy).toHaveBeenCalledWith(i18n.t('auth.resetPassword.expiredLink'));
  });

  it('shows the backend message on a 400 with a text body', async () => {
    const { component } = await open('/reset-password?token=tok-123');
    component.form.setValue({ password: 'NewPassw0rd!', confirmPassword: 'NewPassw0rd!' });

    component.onSubmit();

    httpMock
      .expectOne(`${environment.apiUrl}/reset-password`)
      .flush('Link di reimpostazione non valido o gia utilizzato', {
        status: 400,
        statusText: 'Bad Request',
      });

    expect(component.done()).toBe(false);
    expect(toastErrorSpy).toHaveBeenCalledWith(
      'Link di reimpostazione non valido o gia utilizzato',
    );
  });

  it('shows a connection error when the request fails', async () => {
    const { component } = await open('/reset-password?token=tok-123');
    component.form.setValue({ password: 'NewPassw0rd!', confirmPassword: 'NewPassw0rd!' });

    component.onSubmit();

    httpMock
      .expectOne(`${environment.apiUrl}/reset-password`)
      .error(new ProgressEvent('network error'));

    expect(component.loading()).toBe(false);
    expect(toastErrorSpy).toHaveBeenCalledWith(i18n.t('auth.login.connectionError'));
  });
});
