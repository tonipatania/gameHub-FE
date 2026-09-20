import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { FriendsComponent } from './friends.component';
import { Connection } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';

const connectionsPage = (
  content: Connection[] = [],
  overrides: Partial<{ number: number; totalPages: number }> = {},
) => ({
  content,
  totalPages: overrides.totalPages ?? 1,
  totalElements: content.length,
  size: 20,
  number: overrides.number ?? 0,
  first: (overrides.number ?? 0) === 0,
  last: true,
});

const conn = (username: string, mutual = false): Connection => ({
  id: `id-${username}`,
  username,
  mutual,
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

  const connectionsUrl = () => `${environment.apiUrl}/user/connections/page`;

  function flushInitialLoad(
    following: Connection[] = [],
    suggested: { id: string; username: string }[] = [],
    stats = { following: following.length, followers: 0, mutual: 0 },
  ) {
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser`)
      .flush(following.map((u) => ({ id: u.id, username: u.username })));
    httpMock.expectOne(`${environment.apiUrl}/user/connections/stats`).flush(stats);
    const list = httpMock.expectOne((r) => r.url === connectionsUrl());
    expect(list.request.params.get('type')).toBe('following');
    list.flush(connectionsPage(following));
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/SuggestFriends`)
      .flush(suggested);
  }

  it('does nothing when logged out', () => {
    create();
    httpMock.expectNone(() => true);
  });

  it('loads the followed set, the counters and the first "following" page on init', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad([conn('friend1')], [], { following: 1, followers: 5, mutual: 1 });

    const c = fixture.componentInstance;
    expect(c.listLoading()).toBe(false);
    expect(c.isFollowing('friend1')).toBe(true);
    expect(c.connections().map((u) => u.username)).toEqual(['friend1']);
    expect(c.statValue('following')).toBe('1');
    expect(c.statValue('followers')).toBe('5');
    expect(c.statValue('mutual')).toBe('1');
  });

  it('shows a placeholder for the counters until they arrive', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();

    expect(fixture.componentInstance.statValue('followers')).toBe('–');

    flushInitialLoad();
  });

  it('selecting the followers tab loads that list and labels non-reciprocated people', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad();
    const c = fixture.componentInstance;

    c.selectTab('followers');

    const req = httpMock.expectOne((r) => r.url === connectionsUrl());
    expect(req.request.params.get('type')).toBe('followers');
    req.flush(connectionsPage([conn('fan', false), conn('pal', true)]));

    expect(c.tab()).toBe('followers');
    expect(c.relationOf(conn('fan', false))).toBe('followsYou');
    expect(c.relationOf(conn('pal', true))).toBe('mutual');
  });

  it('in the following tab only reciprocated people get a label', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad();

    expect(fixture.componentInstance.relationOf(conn('a', false))).toBe('none');
    expect(fixture.componentInstance.relationOf(conn('b', true))).toBe('mutual');
  });

  it('selecting the tab that is already open does not reload it', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad();

    fixture.componentInstance.selectTab('following');

    httpMock.expectNone((r) => r.url === connectionsUrl());
  });

  it('ignores a slow response for a tab the user already left', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad();
    const c = fixture.componentInstance;

    c.selectTab('followers');
    const followersReq = httpMock.expectOne((r) => r.url === connectionsUrl());
    c.selectTab('mutual');
    const mutualReq = httpMock.expectOne((r) => r.url === connectionsUrl());

    mutualReq.flush(connectionsPage([conn('pal', true)]));
    // arriva in ritardo, dopo quella della tab attiva
    followersReq.flush(connectionsPage([conn('fan')]));

    expect(c.connections().map((u) => u.username)).toEqual(['pal']);
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

  it('clearSearch empties the search box', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad();

    fixture.componentInstance.searchControl.setValue('zel');
    fixture.componentInstance.clearSearch();

    expect(fixture.componentInstance.searchControl.value).toBe('');
  });

  it('follow() adds to the followed set, then refreshes counters and the open list', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad();

    fixture.componentInstance.follow('newfriend');

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/follow`)
      .flush('followed');
    httpMock
      .expectOne(`${environment.apiUrl}/user/connections/stats`)
      .flush({ following: 1, followers: 0, mutual: 0 });
    httpMock
      .expectOne((r) => r.url === connectionsUrl())
      .flush(connectionsPage([conn('newfriend')]));

    expect(fixture.componentInstance.isFollowing('newfriend')).toBe(true);
    expect(fixture.componentInstance.connections().map((u) => u.username)).toEqual(['newfriend']);
    expect(fixture.componentInstance.statValue('following')).toBe('1');
  });

  it('unfollow() removes from the followed set and refreshes the list', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad([conn('friend1')]);
    expect(fixture.componentInstance.isFollowing('friend1')).toBe(true);

    fixture.componentInstance.unfollow('friend1');

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/unfollow`)
      .flush('unfollowed');
    httpMock
      .expectOne(`${environment.apiUrl}/user/connections/stats`)
      .flush({ following: 0, followers: 0, mutual: 0 });
    httpMock.expectOne((r) => r.url === connectionsUrl()).flush(connectionsPage());

    expect(fixture.componentInstance.isFollowing('friend1')).toBe(false);
    expect(fixture.componentInstance.connections()).toEqual([]);
  });

  it('toggleFollow follows someone new and unfollows someone already followed', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad([conn('friend1')]);
    const c = fixture.componentInstance;

    c.toggleFollow('friend1');
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/unfollow`);

    c.toggleFollow('stranger');
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/follow`);
  });

  it('goToPage moves forward and is a no-op outside the available pages', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/user/connections/stats`).flush({
      following: 25,
      followers: 0,
      mutual: 0,
    });
    httpMock
      .expectOne((r) => r.url === connectionsUrl())
      .flush(connectionsPage([conn('a')], { totalPages: 2, number: 0 }));
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/SuggestFriends`).flush([]);

    fixture.componentInstance.goToPage(-1);
    httpMock.expectNone((r) => r.url === connectionsUrl());

    fixture.componentInstance.goToPage(1);
    const req = httpMock.expectOne((r) => r.url === connectionsUrl());
    expect(req.request.params.get('page')).toBe('1');
    req.flush(connectionsPage([conn('b')], { totalPages: 2, number: 1 }));

    expect(fixture.componentInstance.pageIndex()).toBe(1);

    fixture.componentInstance.goToPage(2);
    httpMock.expectNone((r) => r.url === connectionsUrl());
  });

  it('steps back one page when the last item of the last page disappears', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/user/connections/stats`).flush({
      following: 21,
      followers: 0,
      mutual: 0,
    });
    httpMock
      .expectOne((r) => r.url === connectionsUrl())
      .flush(connectionsPage([conn('a')], { totalPages: 2, number: 0 }));
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/SuggestFriends`).flush([]);

    fixture.componentInstance.goToPage(1);
    httpMock
      .expectOne((r) => r.url === connectionsUrl())
      .flush(connectionsPage([conn('b')], { totalPages: 2, number: 1 }));

    // b viene tolto: la pagina 1 torna vuota, si ricarica la 0
    fixture.componentInstance.unfollow('b');
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/unfollow`)
      .flush('ok');
    httpMock.expectOne(`${environment.apiUrl}/user/connections/stats`).flush({
      following: 20,
      followers: 0,
      mutual: 0,
    });
    httpMock
      .expectOne((r) => r.url === connectionsUrl() && r.params.get('page') === '1')
      .flush(connectionsPage([], { totalPages: 1, number: 1 }));
    const back = httpMock.expectOne((r) => r.url === connectionsUrl());
    expect(back.request.params.get('page')).toBe('0');
    back.flush(connectionsPage([conn('a')]));

    expect(fixture.componentInstance.pageIndex()).toBe(0);
  });

  it('loads suggested friends on init', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushInitialLoad([], [{ id: 'u9', username: 'suggested1' }]);

    const c = fixture.componentInstance;
    expect(c.suggestionsLoading()).toBe(false);
    expect(c.suggestedFriends().map((u) => u.username)).toEqual(['suggested1']);
  });
});
