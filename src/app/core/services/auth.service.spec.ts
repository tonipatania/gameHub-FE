import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    sessionStorage.clear();
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('starts logged out when sessionStorage is empty', () => {
    expect(service.isLoggedIn()).toBe(false);
    expect(service.getUsername()).toBeNull();
  });

  it('stores username and token on successful login', () => {
    service.login({ username: 'toni', password: 'pw' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, errorMessage: '', username: 'toni', token: 'tok123', role: null });

    expect(service.isLoggedIn()).toBe(true);
    expect(service.getUsername()).toBe('toni');
    expect(service.getToken()).toBe('tok123');
    expect(sessionStorage.getItem('gamehub_user')).toBe('toni');
  });

  it('does not store credentials when login response reports failure', () => {
    service.login({ username: 'toni', password: 'wrong' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/login`);
    req.flush({
      success: false,
      errorMessage: 'bad creds',
      username: null,
      token: null,
      role: null,
    });

    expect(service.isLoggedIn()).toBe(false);
    expect(sessionStorage.getItem('gamehub_token')).toBeNull();
  });

  it('logout clears storage, signal and navigates to /login', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    sessionStorage.setItem('gamehub_token', 'tok123');
    service.currentUser.set('toni');

    service.logout();

    expect(service.isLoggedIn()).toBe(false);
    expect(sessionStorage.getItem('gamehub_user')).toBeNull();
    expect(sessionStorage.getItem('gamehub_token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);

    const req = httpMock.expectOne(`${environment.apiUrl}/logout`);
    req.flush(null);
  });

  it('logout revokes the token on the server with an explicit Authorization header', () => {
    sessionStorage.setItem('gamehub_token', 'tok123');

    service.logout();

    const req = httpMock.expectOne(`${environment.apiUrl}/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok123');
    req.flush(null);
  });

  it('logout still completes locally when the server-side revocation fails', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    sessionStorage.setItem('gamehub_token', 'tok123');
    service.currentUser.set('toni');

    service.logout();
    httpMock
      .expectOne(`${environment.apiUrl}/logout`)
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(service.isLoggedIn()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('logout does not call the server when there is no token', () => {
    service.logout();

    httpMock.expectNone(`${environment.apiUrl}/logout`);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('signup posts registration data and expects a text response', () => {
    const payload = {
      name: 'A',
      surname: 'B',
      username: 'ab',
      email: 'a@b.com',
      password: 'pw',
    };

    service.signup(payload).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/signup`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush('ok');
  });

  it('forgotPassword posts the email as text and does not touch the session', () => {
    let result: string | undefined;
    service.forgotPassword('mario@example.com').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/forgot-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'mario@example.com' });
    expect(req.request.responseType).toBe('text');
    req.flush('ok');

    expect(result).toBe('ok');
    expect(service.isLoggedIn()).toBe(false);
  });

  it('resetPassword posts the token and new password as text', () => {
    let result: string | undefined;
    service.resetPassword('tok-123', 'NewPassw0rd!').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/reset-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'tok-123', newPassword: 'NewPassw0rd!' });
    expect(req.request.responseType).toBe('text');
    req.flush('done');

    expect(result).toBe('done');
  });
});
