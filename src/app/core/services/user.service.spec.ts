import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { environment } from '../../../environments/environment';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getUser returns the user object when the backend finds one', () => {
    let result: unknown;
    service.getUser('toni').subscribe((r) => (result = r));

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/getUser`)
      .flush({ id: 'u1', username: 'toni' });

    expect(result).toEqual({ id: 'u1', username: 'toni' });
  });

  it('getUser resolves to null when the backend returns a non-user payload', () => {
    let result: unknown;
    service.getUser('ghost').subscribe((r) => (result = r));

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/getUser`).flush('not found');

    expect(result).toBeNull();
  });

  it('getWishlist adds an optional friendUsername param and normalizes non-array responses', () => {
    service.getWishlist('toni', 'friend').subscribe();
    let req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist`);
    expect(req.request.params.get('username')).toBe('toni');
    expect(req.request.params.get('friendUsername')).toBe('friend');
    req.flush([{ id: 'g1', name: 'Portal' }]);

    let result: unknown;
    service.getWishlist('toni').subscribe((r) => (result = r));
    req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist`);
    expect(req.request.params.has('friendUsername')).toBe(false);
    req.flush('no wishlist');
    expect(result).toEqual([]);
  });

  it('getWishlistPage sends all pagination and sort params', () => {
    service.getWishlistPage('toni', 'friend', 1, 12, 'price', true).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist/page`,
    );
    expect(req.request.params.get('username')).toBe('toni');
    expect(req.request.params.get('friendUsername')).toBe('friend');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('12');
    expect(req.request.params.get('sort')).toBe('price');
    expect(req.request.params.get('onlyCommon')).toBe('true');
    req.flush({ content: [], totalPages: 1, totalElements: 0, size: 12, number: 1, first: false, last: true });
  });

  it('getCommonWishlistGames normalizes a non-array response to an empty array', () => {
    let result: unknown;
    service.getCommonWishlistGames('toni', 'friend').subscribe((r) => (result = r));

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist/common`)
      .flush('no common games');

    expect(result).toEqual([]);
  });

  it('addToWishlist posts username/name params and expects a text response', () => {
    service.addToWishlist('toni', 'Portal 2').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/user/wishlist/addWishlistGame`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('username')).toBe('toni');
    expect(req.request.params.get('name')).toBe('Portal 2');
    req.flush('added');
  });

  it('removeFromWishlist posts username/name params', () => {
    service.removeFromWishlist('toni', 'Portal 2').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/user/wishlist/deleteWishlistGame`,
    );
    expect(req.request.params.get('name')).toBe('Portal 2');
    req.flush('removed');
  });

  it('getFollowedUsers normalizes a non-array response', () => {
    let result: unknown;
    service.getFollowedUsers('toni').subscribe((r) => (result = r));

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser`).flush('none');
    expect(result).toEqual([]);
  });

  it('getFollowedUsersPage sends pagination params', () => {
    service.getFollowedUsersPage('toni', 2, 5).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser/page`);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('5');
    req.flush({ content: [], totalPages: 1, totalElements: 0, size: 5, number: 2, first: false, last: true });
  });

  it('searchUsers sends query and username params', () => {
    service.searchUsers('zel', 'toni').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/search`);
    expect(req.request.params.get('query')).toBe('zel');
    expect(req.request.params.get('username')).toBe('toni');
    req.flush([]);
  });

  it('getSuggestedFriends normalizes a non-array response', () => {
    let result: unknown;
    service.getSuggestedFriends('toni').subscribe((r) => (result = r));

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/SuggestFriends`).flush('none');
    expect(result).toEqual([]);
  });

  it('followUser posts follower/followed params', () => {
    service.followUser('toni', 'friend').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/follow`);
    expect(req.request.params.get('followerUsername')).toBe('toni');
    expect(req.request.params.get('followedUsername')).toBe('friend');
    req.flush('followed');
  });

  it('unfollowUser posts follower/followed params', () => {
    service.unfollowUser('toni', 'friend').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/unfollow`);
    expect(req.request.params.get('followerUsername')).toBe('toni');
    req.flush('unfollowed');
  });

  it('updateUsername sends a PATCH with username/newUsername params', () => {
    service.updateUsername('toni', 'toni2').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/updateUser`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.params.get('username')).toBe('toni');
    expect(req.request.params.get('newUsername')).toBe('toni2');
    req.flush('updated');
  });
});
