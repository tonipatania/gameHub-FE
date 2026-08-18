import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('auth.guard', () => {
  let authStub: { isLoggedIn: ReturnType<typeof vi.fn> };
  let router: { createUrlTree: ReturnType<typeof vi.fn> };
  let fakeTree: UrlTree;

  beforeEach(() => {
    fakeTree = {} as UrlTree;
    authStub = { isLoggedIn: vi.fn() };
    router = { createUrlTree: vi.fn().mockReturnValue(fakeTree) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: Router, useValue: router },
      ],
    });
  });

  describe('authGuard', () => {
    it('allows navigation when logged in', () => {
      authStub.isLoggedIn.mockReturnValue(true);
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('redirects to /login when logged out', () => {
      authStub.isLoggedIn.mockReturnValue(false);
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
      expect(result).toBe(fakeTree);
    });
  });

  describe('guestGuard', () => {
    it('allows navigation when logged out', () => {
      authStub.isLoggedIn.mockReturnValue(false);
      const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('redirects to /home when already logged in', () => {
      authStub.isLoggedIn.mockReturnValue(true);
      const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
      expect(router.createUrlTree).toHaveBeenCalledWith(['/home']);
      expect(result).toBe(fakeTree);
    });
  });
});
