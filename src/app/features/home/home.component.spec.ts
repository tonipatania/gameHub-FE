import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';
import { environment } from '../../../environments/environment';

describe('HomeComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('does nothing when no user is logged in', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    httpMock.expectNone(() => true);
    expect(fixture.componentInstance.reviewsLoading()).toBe(true);
  });

  it('loads reviews, suggested games and suggested friends on init', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/game/withReviews`)
      .flush([
        {
          id: 'g1',
          name: 'Portal 2',
          reviews: [
            { id: 'r1', title: 'Portal 2', username: 'a', comment: 'great', userScore: 9, likeCount: 3 },
            { id: 'r2', title: 'Portal 2', username: 'b', comment: 'meh', userScore: 5, likeCount: 9 },
          ],
        },
      ]);

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/game/suggestGames/toni`)
      .flush([{ id: 'g2', name: 'Half-Life' }]);

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/SuggestFriends`)
      .flush([{ id: 'u1', username: 'friend1' }]);

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser`)
      .flush([{ id: 'u2', username: 'friend2' }]);

    fixture.detectChanges();

    // rendering <app-review-card> for each review triggers its own constructor call to
    // ReviewService.loadLikedReviews, so that request needs flushing too
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/likedReviews`)
      .flush([]);

    const c = fixture.componentInstance;
    expect(c.reviewsLoading()).toBe(false);
    expect(c.gamesLoading()).toBe(false);
    expect(c.friendsLoading()).toBe(false);
    // reviews are sorted by likeCount desc
    expect(c.reviews().map((r) => r.id)).toEqual(['r2', 'r1']);
    expect(c.suggestedGames().map((g) => g.id)).toEqual(['g2']);
    expect(c.suggestedFriends().map((u) => u.username)).toEqual(['friend1']);
    expect(c.isFollowing('friend2')).toBe(true);
    expect(c.isFollowing('friend1')).toBe(false);
  });

  it('onLikeChange updates the like count of the matching review only', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = TestBed.createComponent(HomeComponent);
    const c = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/withReviews`).flush([
      { id: 'g1', name: 'Portal 2', reviews: [{ id: 'r1', title: 'Portal 2', username: 'a', comment: 'x', userScore: 9, likeCount: 3 }] },
    ]);
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/suggestGames/toni`).flush([]);
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/SuggestFriends`).flush([]);
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/followedUser`).flush([]);

    // no second detectChanges() here, so <app-review-card> (and its own HTTP call) never mounts

    c.onLikeChange({ reviewId: 'r1', delta: 1 });

    expect(c.reviews()[0].likeCount).toBe(4);
  });
});
