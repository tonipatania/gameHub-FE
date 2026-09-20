import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { NotificationsComponent } from './notifications.component';
import { NotificationItem } from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

const api = environment.apiUrl;

const item = (overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id: 'n1',
  type: 'LIKE_REVIEW',
  actor: 'lunark',
  gameName: 'Portal 2',
  reviewId: 'r1',
  excerpt: 'Bellissimo',
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const page = (
  content: NotificationItem[],
  overrides: { number?: number; totalPages?: number } = {},
) => ({
  content,
  totalPages: overrides.totalPages ?? 1,
  totalElements: content.length,
  size: 15,
  number: overrides.number ?? 0,
  first: (overrides.number ?? 0) === 0,
  last: true,
});

describe('NotificationsComponent', () => {
  let httpMock: HttpTestingController;
  // il servizio vero (con il suo polling) non serve qui: si finge, tenendo il badge osservabile
  const unreadCount = signal(0);
  const service = {
    unreadCount,
    refreshUnread: vi.fn(),
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('gamehub_user', 'toni');
    unreadCount.set(0);
    Object.values(service).forEach(
      (fn) => typeof fn === 'function' && 'mockReset' in fn && fn.mockReset(),
    );

    TestBed.configureTestingModule({
      imports: [NotificationsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationService, useValue: service },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  async function create(result = page([item()])) {
    const { of } = await import('rxjs');
    service.list.mockReturnValue(of(result));
    service.markRead.mockReturnValue(of(undefined));
    service.markAllRead.mockReturnValue(of(undefined));
    service.remove.mockReturnValue(of(undefined));
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.detectChanges();
    return fixture;
  }

  const text = (fixture: { nativeElement: unknown }) =>
    ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

  it('loads the first page on init and refreshes the badge', async () => {
    const fixture = await create();

    expect(service.list).toHaveBeenCalledWith(0, 15);
    expect(service.refreshUnread).toHaveBeenCalled();
    expect(fixture.componentInstance.items()).toHaveLength(1);
  });

  it('describes each notification type', async () => {
    const fixture = await create(
      page([
        item({
          id: 'a',
          type: 'FOLLOW',
          actor: 'mira',
          gameName: undefined,
          reviewId: undefined,
          excerpt: undefined,
          followingBack: false,
        }),
        item({ id: 'b', type: 'LIKE_REVIEW', actor: 'lunark' }),
        item({ id: 'c', type: 'REPLY_REVIEW', actor: 'kai', excerpt: 'Concordo!' }),
      ]),
    );
    const t = text(fixture);

    expect(t).toContain('mira started following you');
    expect(t).toContain('lunark liked your review of Portal 2');
    expect(t).toContain('kai replied to your review of Portal 2');
    // l'anteprima della risposta e' visibile
    expect(t).toContain('Concordo!');
  });

  it('shows the empty state when there are no notifications', async () => {
    const fixture = await create(page([]));

    expect(text(fixture)).toContain('No notifications yet');
  });

  it('shows an error message when loading fails', async () => {
    const { throwError } = await import('rxjs');
    service.list.mockReturnValue(throwError(() => new Error('boom')));
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBe(true);
    expect(text(fixture)).toContain("Couldn't load notifications");
  });

  it('highlights unread notifications only', async () => {
    const fixture = await create(
      page([item({ id: 'a', read: false }), item({ id: 'b', read: true })]),
    );

    const rows = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('li[data-unread]'),
    ).map((li) => li.getAttribute('data-unread'));
    expect(rows).toEqual(['true', 'false']);
  });

  it('links a like to the review on the game page, highlighting it', async () => {
    const fixture = await create();
    const link = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).find(
      (a) => a.textContent?.includes('View review'),
    ) as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('/games/Portal%202?review=r1');
  });

  it('links a reply to the game page asking to open the thread', async () => {
    const fixture = await create(page([item({ type: 'REPLY_REVIEW' })]));
    const link = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).find(
      (a) => a.textContent?.includes('Read the reply'),
    ) as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('/games/Portal%202?review=r1&thread=1');
  });

  it('marks a notification as read when its link is followed', async () => {
    const fixture = await create();
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const link = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).find(
      (a) => a.textContent?.includes('View review'),
    ) as HTMLAnchorElement;

    link.click();

    expect(service.markRead).toHaveBeenCalledWith('n1');
    expect(fixture.componentInstance.items()[0].read).toBe(true);
  });

  it('markRead is a no-op for an already read notification', async () => {
    const fixture = await create(page([item({ read: true })]));

    fixture.componentInstance.markRead(fixture.componentInstance.items()[0]);

    expect(service.markRead).not.toHaveBeenCalled();
  });

  it('puts the notification back to unread when marking it read fails', async () => {
    const { throwError } = await import('rxjs');
    const fixture = await create();
    service.markRead.mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.markRead(fixture.componentInstance.items()[0]);

    expect(fixture.componentInstance.items()[0].read).toBe(false);
  });

  it('"mark all as read" is disabled with nothing unread and marks every row when used', async () => {
    const fixture = await create(page([item({ id: 'a' }), item({ id: 'b' })]));
    const button = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Mark all as read'),
      ) as HTMLButtonElement;
    expect(button().disabled).toBe(true);

    unreadCount.set(2);
    fixture.detectChanges();
    expect(button().disabled).toBe(false);

    button().click();
    expect(service.markAllRead).toHaveBeenCalled();
    expect(fixture.componentInstance.items().every((n) => n.read)).toBe(true);
  });

  it('deletes a notification from the list', async () => {
    const fixture = await create(page([item({ id: 'a' }), item({ id: 'b' })]));

    fixture.componentInstance.remove(fixture.componentInstance.items()[0]);

    expect(service.remove).toHaveBeenCalledWith('a');
    expect(fixture.componentInstance.items().map((n) => n.id)).toEqual(['b']);
  });

  it('keeps the notification and shows a toast when deleting fails', async () => {
    const { throwError } = await import('rxjs');
    const fixture = await create();
    const toast = vi
      .spyOn(TestBed.inject(ToastService), 'error')
      .mockImplementation(() => undefined);
    service.remove.mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.remove(fixture.componentInstance.items()[0]);

    expect(fixture.componentInstance.items()).toHaveLength(1);
    expect(toast).toHaveBeenCalled();
  });

  describe('follow back', () => {
    const follower = item({
      id: 'f1',
      type: 'FOLLOW',
      actor: 'mira',
      gameName: undefined,
      reviewId: undefined,
      excerpt: undefined,
      followingBack: false,
    });

    const followButton = (fixture: { nativeElement: unknown }) =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Follow back') || b.textContent?.trim() === 'Following',
      ) as HTMLButtonElement;

    it('follows the actor, flips the button and marks the notification as read', async () => {
      const fixture = await create(page([follower]));

      followButton(fixture).click();
      const req = httpMock.expectOne((r) => r.url === `${api}/user/userSelected/follow`);
      expect(req.request.params.get('followedUsername')).toBe('mira');
      req.flush('Followed successfully');
      fixture.detectChanges();

      expect(fixture.componentInstance.items()[0].followingBack).toBe(true);
      expect(service.markRead).toHaveBeenCalledWith('f1');
      expect(followButton(fixture).disabled).toBe(true);
    });

    it('does not offer to follow someone the user already follows', async () => {
      const fixture = await create(page([{ ...follower, followingBack: true }]));

      expect(followButton(fixture).disabled).toBe(true);
      fixture.componentInstance.followBack(fixture.componentInstance.items()[0]);
      httpMock.expectNone((r) => r.url === `${api}/user/userSelected/follow`);
    });

    it('shows a toast and stays followable when the follow fails', async () => {
      const fixture = await create(page([follower]));
      const toast = vi
        .spyOn(TestBed.inject(ToastService), 'error')
        .mockImplementation(() => undefined);

      followButton(fixture).click();
      httpMock
        .expectOne((r) => r.url === `${api}/user/userSelected/follow`)
        .flush('x', { status: 500, statusText: 'Server Error' });

      expect(fixture.componentInstance.items()[0].followingBack).toBe(false);
      expect(toast).toHaveBeenCalled();
    });
  });

  it('paginates: shows the controls only with several pages and loads the requested one', async () => {
    const single = await create(page([item()]));
    expect((single.nativeElement as HTMLElement).querySelector('app-pagination')).toBeNull();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NotificationsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationService, useValue: service },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const multi = await create(page([item()], { totalPages: 3 }));
    expect((multi.nativeElement as HTMLElement).querySelector('app-pagination')).not.toBeNull();

    multi.componentInstance.goTo(1);
    expect(service.list).toHaveBeenLastCalledWith(1, 15);
  });
});
