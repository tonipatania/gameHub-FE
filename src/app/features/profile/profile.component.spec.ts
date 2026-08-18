import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { environment } from '../../../environments/environment';

const wishlistPage = (overrides: Partial<{ content: unknown[]; totalPages: number; totalElements: number; number: number }> = {}) => ({
  content: overrides.content ?? [],
  totalPages: overrides.totalPages ?? 1,
  totalElements: overrides.totalElements ?? (overrides.content?.length ?? 0),
  size: 12,
  number: overrides.number ?? 0,
  first: (overrides.number ?? 0) === 0,
  last: true,
});

function routeFor(username: string) {
  return { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ username })) } };
}

describe('ProfileComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    httpMock = undefined as unknown as HttpTestingController;
  });

  afterEach(() => {
    httpMock?.verify();
    sessionStorage.clear();
  });

  function setup(routeUsername: string) {
    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        routeFor(routeUsername),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads its own profile: skips the common-wishlist call and marks isOwnProfile', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = setup('toni');

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/getUser`).flush({ id: 'u1', username: 'toni' });
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist/page`)
      .flush(wishlistPage({ content: [{ id: 'g1', name: 'Portal 2' }], totalElements: 1 }));
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser`).flush([]);
    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist/common`);

    const c = fixture.componentInstance;
    expect(c.loading()).toBe(false);
    expect(c.isOwnProfile()).toBe(true);
    expect(c.user()?.username).toBe('toni');
    expect(c.wishlist().length).toBe(1);
  });

  it('loads another user profile: fetches common games and following state', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = setup('friend1');

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/getUser`).flush({ id: 'u2', username: 'friend1' });
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist/page`)
      .flush(wishlistPage());
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist/common`)
      .flush([{ id: 'g1', name: 'Shared Game' }]);
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser`)
      .flush([{ id: 'u2', username: 'friend1' }]);

    const c = fixture.componentInstance;
    expect(c.isOwnProfile()).toBe(false);
    expect(c.commonCount()).toBe(1);
    expect(c.isCommon('Shared Game')).toBe(true);
    expect(c.isFollowing()).toBe(true);
  });

  it('updateUsername persists the new username, updates AuthService and reloads the profile', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = setup('toni');

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/getUser`).flush({ id: 'u1', username: 'toni' });
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist/page`).flush(wishlistPage());
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser`).flush([]);

    const c = fixture.componentInstance;
    c.usernameForm.setValue({ newUsername: 'toni2' });
    c.updateUsername();

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/updateUser`).flush('updated');

    expect(c.updateMessage()).toBeTruthy();
    expect(sessionStorage.getItem('gamehub_user')).toBe('toni2');

    // updateUsername() triggers a fresh loadProfile() for the renamed user
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/getUser`).flush({ id: 'u1', username: 'toni2' });
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist/page`).flush(wishlistPage());
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser`).flush([]);
  });

  it('toggleFollow follows/unfollows without a full profile reload', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = setup('friend1');

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/getUser`).flush({ id: 'u2', username: 'friend1' });
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist/page`).flush(wishlistPage());
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist/common`).flush([]);
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser`).flush([]);

    const c = fixture.componentInstance;
    expect(c.isFollowing()).toBe(false);

    c.toggleFollow();
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/follow`).flush('followed');
    expect(c.isFollowing()).toBe(true);

    c.toggleFollow();
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/unfollow`).flush('unfollowed');
    expect(c.isFollowing()).toBe(false);
  });

  it('changeSort reloads the wishlist page with the new sort and resets to page 0', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = setup('toni');

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/getUser`).flush({ id: 'u1', username: 'toni' });
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist/page`).flush(wishlistPage());
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser`).flush([]);

    const c = fixture.componentInstance;
    c.changeSort('price');

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist/page`);
    expect(req.request.params.get('sort')).toBe('price');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(wishlistPage());

    expect(c.wishlistSort()).toBe('price');
  });
});
