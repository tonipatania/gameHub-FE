import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authStub: { getToken: ReturnType<typeof vi.fn>; isLoggedIn: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authStub = {
      getToken: vi.fn().mockReturnValue(null),
      isLoggedIn: vi.fn().mockReturnValue(false),
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authStub },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('does not add an Authorization header when there is no token', () => {
    http.get('/api/ping').subscribe();

    const req = httpMock.expectOne('/api/ping');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('adds a Bearer Authorization header when a token is present', () => {
    authStub.getToken.mockReturnValue('tok123');

    http.get('/api/ping').subscribe();

    const req = httpMock.expectOne('/api/ping');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok123');
    req.flush({});
  });

  it('logs the user out on a 401 while a session is active', () => {
    authStub.getToken.mockReturnValue('tok123');
    authStub.isLoggedIn.mockReturnValue(true);

    http.get('/api/ping').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/ping');
    req.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authStub.logout).toHaveBeenCalled();
  });

  it('does not log out on a 401 when no session is active', () => {
    authStub.isLoggedIn.mockReturnValue(false);

    http.get('/api/ping').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/ping');
    req.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authStub.logout).not.toHaveBeenCalled();
  });

  it('propagates non-401 errors without logging out', () => {
    authStub.isLoggedIn.mockReturnValue(true);
    let caughtStatus: number | undefined;

    http.get('/api/ping').subscribe({ error: (err) => (caughtStatus = err.status) });

    const req = httpMock.expectOne('/api/ping');
    req.flush('server error', { status: 500, statusText: 'Internal Server Error' });

    expect(caughtStatus).toBe(500);
    expect(authStub.logout).not.toHaveBeenCalled();
  });
});
