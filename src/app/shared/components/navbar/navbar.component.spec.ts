import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  // non lette dell'utente: si pilota da qui senza far partire il polling vero
  const unreadCount = signal(0);

  beforeEach(() => {
    sessionStorage.clear();
    unreadCount.set(0);
    TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        { provide: NotificationService, useValue: { unreadCount, refreshUnread: () => undefined } },
      ],
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

  describe('notifications bell', () => {
    const badge = (fixture: ReturnType<typeof create>) =>
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="bell-badge"]');
    const bell = (fixture: ReturnType<typeof create>) =>
      (fixture.nativeElement as HTMLElement).querySelector(
        'a[href="/notifications"]',
      ) as HTMLAnchorElement;

    it('is hidden when logged out', () => {
      const fixture = create();
      expect(bell(fixture)).toBeNull();
    });

    it('links to the notifications page without a badge when nothing is unread', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      const fixture = create();

      expect(bell(fixture)).not.toBeNull();
      expect(badge(fixture)).toBeNull();
      expect(bell(fixture).getAttribute('aria-label')).toBe('Notifications');
    });

    it('shows the unread count in a badge and announces it', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      unreadCount.set(3);
      const fixture = create();

      expect(badge(fixture)?.textContent?.trim()).toBe('3');
      expect(bell(fixture).getAttribute('aria-label')).toBe('Notifications (3 unread)');
    });

    it('caps the badge at 99+', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      unreadCount.set(250);
      const fixture = create();

      expect(badge(fixture)?.textContent?.trim()).toBe('99+');
    });

    it('follows the count as it changes', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      const fixture = create();
      expect(badge(fixture)).toBeNull();

      unreadCount.set(1);
      fixture.detectChanges();
      expect(badge(fixture)?.textContent?.trim()).toBe('1');

      unreadCount.set(0);
      fixture.detectChanges();
      expect(badge(fixture)).toBeNull();
    });

    it('marks the burger button with a dot on small screens and shows the count in the menu', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      unreadCount.set(2);
      const fixture = create();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('[data-testid="menu-dot"]')).not.toBeNull();

      (root.querySelector('button[aria-controls="mobile-menu"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      // aperto il menu il puntino non serve piu': il conteggio e' sulla voce Notifiche
      expect(root.querySelector('[data-testid="menu-dot"]')).toBeNull();
      const entry = root.querySelector('#mobile-menu a[href="/notifications"]') as HTMLElement;
      expect(entry.textContent).toContain('Notifications');
      expect(entry.textContent).toContain('2');
    });
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
        '/notifications',
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
