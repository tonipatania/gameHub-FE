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

  describe('mobile menu', () => {
    function toggle(fixture: ReturnType<typeof create>): HTMLButtonElement {
      return (fixture.nativeElement as HTMLElement).querySelector(
        'button[aria-controls="mobile-menu"]',
      ) as HTMLButtonElement;
    }

    it('has no menu button when logged out', () => {
      const fixture = create();
      expect(toggle(fixture)).toBeNull();
    });

    it('opens and closes a menu with the nav links, profile, settings and logout', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      const fixture = create();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('#mobile-menu')).toBeNull();
      expect(toggle(fixture).getAttribute('aria-expanded')).toBe('false');

      toggle(fixture).click();
      fixture.detectChanges();

      const menu = root.querySelector('#mobile-menu') as HTMLElement;
      expect(menu).not.toBeNull();
      expect(toggle(fixture).getAttribute('aria-expanded')).toBe('true');
      const hrefs = Array.from(menu.querySelectorAll('a')).map((a) => a.getAttribute('href'));
      expect(hrefs).toEqual([
        '/home',
        '/games',
        '/wishlist',
        '/friends',
        '/profile/toni',
        '/settings',
      ]);
      expect(menu.textContent).toContain('Log out');

      toggle(fixture).click();
      fixture.detectChanges();
      expect(root.querySelector('#mobile-menu')).toBeNull();
    });

    it('closes the menu when a link is chosen', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      const fixture = create();
      // il link e' un vero routerLink e nel test non ci sono rotte: si intercetta la navigazione
      vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      toggle(fixture).click();
      fixture.detectChanges();

      const link = (fixture.nativeElement as HTMLElement).querySelector(
        '#mobile-menu a',
      ) as HTMLAnchorElement;
      link.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });

    it('logs out from the menu and closes it', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      sessionStorage.setItem('gamehub_token', 'tok');
      const fixture = create();
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      toggle(fixture).click();
      fixture.detectChanges();

      const logout = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('#mobile-menu button'),
      ).find((b) => b.textContent?.includes('Log out')) as HTMLButtonElement;
      logout.click();
      fixture.detectChanges();

      expect(sessionStorage.getItem('gamehub_user')).toBeNull();
      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });
  });
});
