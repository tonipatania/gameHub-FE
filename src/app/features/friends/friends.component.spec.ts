import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { FriendsComponent } from './friends.component';
import { environment } from '../../../environments/environment';

const followedPage = (overrides: Partial<{ content: unknown[]; number: number; totalPages: number }> = {}) => ({
  content: overrides.content ?? [],
  totalPages: overrides.totalPages ?? 1,
  totalElements: 0,
  size: 20,
  number: overrides.number ?? 0,
  first: (overrides.number ?? 0) === 0,
  last: true,
});

describe('FriendsComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    // jsdom does not implement scrollIntoView; pagination handlers call it on page change
    Element.prototype.scrollIntoView = vi.fn();

    TestBed.configureTestingModule({
      imports: [FriendsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  function create() {
    const fixture = TestBed.createComponent(FriendsComponent);
    fixture.detectChanges();
    return fixture;
  }

  function flushInitialLoad(followed: { id: string; username: string }[] = []) {
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser`).flush(followed);
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser/page`)
      .flush(followedPage({ content: followed }));
  }

  it('does nothing when logged out', () => {
    create();
    httpMock.expectNone(() => true);
  });

  it('loads the followed set and the first following page on init', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad([{ id: 'u1', username: 'friend1' }]);

    const c = fixture.componentInstance;
    expect(c.loading()).toBe(false);
    expect(c.isFollowing('friend1')).toBe(true);
    expect(c.followingPage().map((u) => u.username)).toEqual(['friend1']);
  });

  it('an empty search clears results without hitting the API', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad();

    fixture.componentInstance.searchControl.setValue('   ');
    vi.advanceTimersByTime(400);

    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/user/search`);
    expect(fixture.componentInstance.searchResults()).toEqual([]);
  });

  it('debounces the search box and calls searchUsers after 400ms', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad();

    fixture.componentInstance.searchControl.setValue('zel');
    vi.advanceTimersByTime(399);
    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/user/search`);

    vi.advanceTimersByTime(1);
    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/search`);
    expect(req.request.params.get('query')).toBe('zel');
    req.flush([{ id: 'u2', username: 'zelda_fan' }]);

    expect(fixture.componentInstance.searchResults().map((u) => u.username)).toEqual(['zelda_fan']);
    expect(fixture.componentInstance.searching()).toBe(false);
  });

  it('follow() adds to the followed set and reloads the following page', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad();

    fixture.componentInstance.follow('newfriend');

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/follow`)
      .flush('followed');
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser/page`)
      .flush(followedPage({ content: [{ id: 'u3', username: 'newfriend' }] }));

    expect(fixture.componentInstance.isFollowing('newfriend')).toBe(true);
  });

  it('unfollow() removes from the followed set and reloads the following page', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad([{ id: 'u1', username: 'friend1' }]);
    expect(fixture.componentInstance.isFollowing('friend1')).toBe(true);

    fixture.componentInstance.unfollow('friend1');

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/unfollow`)
      .flush('unfollowed');
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser/page`).flush(followedPage());

    expect(fixture.componentInstance.isFollowing('friend1')).toBe(false);
  });

  it('nextFollowingPage advances the page and loads it, prevFollowingPage is a no-op on page 0', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser`).flush([]);
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser/page`)
      .flush(followedPage({ content: [{ id: 'u1', username: 'a' }], totalPages: 2, number: 0 }));

    fixture.componentInstance.prevFollowingPage();
    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/user/followedUser/page`);

    fixture.componentInstance.nextFollowingPage();
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser/page`)
      .flush(followedPage({ content: [{ id: 'u2', username: 'b' }], totalPages: 2, number: 1 }));

    expect(fixture.componentInstance.followingPageIndex()).toBe(1);
  });
});
