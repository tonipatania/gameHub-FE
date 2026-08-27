import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../../environments/environment';

describe('LoginComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let navigateSpy: ReturnType<typeof vi.spyOn>;
  let i18n: TranslationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    i18n = TestBed.inject(TranslationService);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = create();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('keeps the submit disabled while the form is invalid', () => {
    const fixture = create();
    expect(fixture.componentInstance.form.invalid).toBe(true);
  });

  it('does not call the API when submitted while invalid', () => {
    const fixture = create();
    fixture.componentInstance.onSubmit();
    httpMock.expectNone(() => true);
  });

  it('navigates to /home on a successful login', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ username: 'toni', password: 'password1' });

    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/login`);
    req.flush({ success: true, errorMessage: '', username: 'toni', token: 'tok', role: null });

    expect(navigateSpy).toHaveBeenCalledWith(['/home']);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('translates the invalid-credentials error code and does not navigate', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ username: 'toni', password: 'wrongpassword' });

    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/login`);
    req.flush({
      success: false,
      errorMessage: 'Credenziali non valide',
      errorCode: 'INVALID_CREDENTIALS',
      username: null,
      token: null,
      role: null,
    });

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error()).toBe(i18n.t('auth.login.invalidCredentials'));
  });

  it('translates the email-not-confirmed error code from a 401 response', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ username: 'toni', password: 'password1' });

    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/login`);
    req.flush(
      {
        success: false,
        errorMessage: "Account non confermato: controlla la tua email per completare la registrazione",
        errorCode: 'EMAIL_NOT_CONFIRMED',
        username: null,
        token: null,
        role: null,
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error()).toBe(i18n.t('auth.login.emailNotConfirmed'));
  });

  it('shows a connection error message when the request fails', () => {
    const fixture = create();
    fixture.componentInstance.form.setValue({ username: 'toni', password: 'password1' });

    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/login`);
    req.error(new ProgressEvent('network error'));

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.error()).not.toBe('');
  });
});
