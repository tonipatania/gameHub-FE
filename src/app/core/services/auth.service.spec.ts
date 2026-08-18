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
    req.flush({ success: false, errorMessage: 'bad creds', username: null, token: null, role: null });

    expect(service.isLoggedIn()).toBe(false);
    expect(sessionStorage.getItem('gamehub_token')).toBeNull();
  });

  it('logout clears storage, signal and navigates to /login', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    sessionStorage.setItem('gamehub_token', 'tok123');
    service.updateUsername('toni');

    service.logout();

    expect(service.isLoggedIn()).toBe(false);
    expect(sessionStorage.getItem('gamehub_user')).toBeNull();
    expect(sessionStorage.getItem('gamehub_token')).toBeNull();
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
});
