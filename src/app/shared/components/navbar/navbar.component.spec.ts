import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([])],
    });
  });

  afterEach(() => sessionStorage.clear());

  function create() {
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('hides the user menu (settings, username, logout) when logged out', () => {
    const fixture = create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Log out');
  });

  it('shows the username and a logout button when logged in', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('toni');
    expect(text).toContain('Log out');
  });

  it('logs out and navigates to /login when the logout button is clicked', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    sessionStorage.setItem('gamehub_token', 'tok');
    const fixture = create();
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const logoutButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((b) => b.textContent?.includes('Log out'));
    logoutButton?.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();

    expect(sessionStorage.getItem('gamehub_user')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('exposes the four primary nav links', () => {
    const fixture = create();
    expect(fixture.componentInstance.navLinks.map((l) => l.path)).toEqual([
      '/home',
      '/games',
      '/wishlist',
      '/friends',
    ]);
  });
});
