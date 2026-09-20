import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationService, UNREAD_POLL_INTERVAL_MS } from './notification.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const unreadUrl = `${environment.apiUrl}/notifications/unread-count`;

describe('NotificationService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      // il setup globale mette un finto inerte: qui serve il servizio vero
      providers: [NotificationService, provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    httpMock.verify();
    sessionStorage.clear();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });

  // crea il servizio e fa girare l'effect di avvio (i root effect partono al tick)
  function start(): NotificationService {
    const service = TestBed.inject(NotificationService);
    TestBed.tick();
    return service;
  }

  function setHidden(hidden: boolean) {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  }

  it('does not talk to the server while logged out', () => {
    const service = start();

    httpMock.expectNone(unreadUrl);
    expect(service.unreadCount()).toBe(0);
  });

  it('fetches the unread count as soon as a user is logged in', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const service = start();

    httpMock.expectOne(unreadUrl).flush({ count: 4 });

    expect(service.unreadCount()).toBe(4);
  });

  it('keeps polling on an interval', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const service = start();
    httpMock.expectOne(unreadUrl).flush({ count: 1 });

    vi.advanceTimersByTime(UNREAD_POLL_INTERVAL_MS);
    httpMock.expectOne(unreadUrl).flush({ count: 2 });

    expect(service.unreadCount()).toBe(2);
  });

  it('skips the poll while the tab is hidden and refreshes when it becomes visible again', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    start();
    httpMock.expectOne(unreadUrl).flush({ count: 0 });

    setHidden(true);
    vi.advanceTimersByTime(UNREAD_POLL_INTERVAL_MS);
    httpMock.expectNone(unreadUrl);

    setHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));
    httpMock.expectOne(unreadUrl).flush({ count: 5 });
  });

  it('stops polling and resets the badge when the user logs out', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const service = start();
    httpMock.expectOne(unreadUrl).flush({ count: 3 });

    TestBed.inject(AuthService).currentUser.set(null);
    TestBed.tick();
    vi.advanceTimersByTime(UNREAD_POLL_INTERVAL_MS * 2);

    httpMock.expectNone(unreadUrl);
    expect(service.unreadCount()).toBe(0);
  });

  it('keeps the previous count when the poll fails', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const service = start();
    httpMock.expectOne(unreadUrl).flush({ count: 3 });

    vi.advanceTimersByTime(UNREAD_POLL_INTERVAL_MS);
    httpMock.expectOne(unreadUrl).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(service.unreadCount()).toBe(3);
  });

  it('list requests the given page of the token user', () => {
    const service = start();
    service.list(2, 15).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/notifications`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('15');
    req.flush({ content: [] });
  });

  it('markRead posts to the notification and refreshes the badge', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const service = start();
    httpMock.expectOne(unreadUrl).flush({ count: 2 });

    service.markRead('n 1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/notifications/n%201/read`);
    expect(req.request.method).toBe('POST');
    req.flush(null);

    httpMock.expectOne(unreadUrl).flush({ count: 1 });
    expect(service.unreadCount()).toBe(1);
  });

  it('markAllRead zeroes the badge without another request', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const service = start();
    httpMock.expectOne(unreadUrl).flush({ count: 7 });

    service.markAllRead().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/notifications/read-all`);
    expect(req.request.method).toBe('POST');
    req.flush(null);

    expect(service.unreadCount()).toBe(0);
  });

  it('remove deletes the notification and refreshes the badge', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const service = start();
    httpMock.expectOne(unreadUrl).flush({ count: 2 });

    service.remove('n1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/notifications/n1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    httpMock.expectOne(unreadUrl).flush({ count: 1 });
    expect(service.unreadCount()).toBe(1);
  });
});
