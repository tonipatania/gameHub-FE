import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ForgotPasswordComponent } from './forgot-password.component';
import { TranslationService } from '../../../core/services/translation.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

describe('ForgotPasswordComponent', () => {
  let httpMock: HttpTestingController;
  let i18n: TranslationService;
  let toastErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    httpMock = TestBed.inject(HttpTestingController);
    i18n = TestBed.inject(TranslationService);
    toastErrorSpy = vi.spyOn(TestBed.inject(ToastService), 'error');
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('keeps the form invalid until a valid email is entered', () => {
    const { componentInstance } = create();
    expect(componentInstance.form.invalid).toBe(true);

    componentInstance.form.setValue({ email: 'not-an-email' });
    expect(componentInstance.form.invalid).toBe(true);

    componentInstance.form.setValue({ email: 'mario@example.com' });
    expect(componentInstance.form.valid).toBe(true);
  });

  it('does not call the API when submitted while invalid', () => {
    create().componentInstance.onSubmit();
    httpMock.expectNone(() => true);
  });

  it('sends the email and switches to the confirmation state', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ email: 'mario@example.com' });

    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/forgot-password`);
    expect(req.request.body).toEqual({ email: 'mario@example.com' });
    req.flush('ok');
    fixture.detectChanges();

    expect(fixture.componentInstance.sent()).toBe(true);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(i18n.t('auth.forgotPassword.sentMessage'));
  });

  it('shows a rate-limit message on 429 and stays on the form', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ email: 'mario@example.com' });

    fixture.componentInstance.onSubmit();

    httpMock
      .expectOne(`${environment.apiUrl}/forgot-password`)
      .flush('Troppe richieste', { status: 429, statusText: 'Too Many Requests' });

    expect(fixture.componentInstance.sent()).toBe(false);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(toastErrorSpy).toHaveBeenCalledWith(i18n.t('auth.forgotPassword.tooManyRequests'));
  });

  it('shows a connection error when the request fails', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ email: 'mario@example.com' });

    fixture.componentInstance.onSubmit();

    httpMock
      .expectOne(`${environment.apiUrl}/forgot-password`)
      .error(new ProgressEvent('network error'));

    expect(fixture.componentInstance.sent()).toBe(false);
    expect(toastErrorSpy).toHaveBeenCalledWith(i18n.t('auth.login.connectionError'));
  });
});
