import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';
import { environment } from '../../../environments/environment';

function activityPage(
  content: unknown[] = [],
  overrides: Partial<{ number: number; totalPages: number; last: boolean }> = {},
) {
  return {
    content,
    totalPages: overrides.totalPages ?? 1,
    totalElements: content.length,
    size: 15,
    number: overrides.number ?? 0,
    first: (overrides.number ?? 0) === 0,
    last: overrides.last ?? true,
  };
}

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
    expect(fixture.componentInstance.rankingLoading()).toBe(true);
  });

  it('loads top ranked games and the friends activity feed on init', () => {
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
        {
          id: 'g2',
          name: 'Half-Life',
          reviews: [
            { id: 'r3', title: 'Half-Life', username: 'c', comment: 'amazing', userScore: 10, likeCount: 1 },
          ],
        },
      ]);

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/activity/friends`)
      .flush(
        activityPage(
          [
            {
              username: 'friend1',
              type: 'WISHLIST_ADD',
              gameName: 'Stardew Valley',
              createdAt: new Date().toISOString(),
            },
          ],
          { last: false },
        ),
      );

    const c = fixture.componentInstance;
    expect(c.rankingLoading()).toBe(false);
    expect(c.activityLoading()).toBe(false);
    // ranked by average review score desc: Half-Life (10) before Portal 2 ((9+5)/2 = 7)
    expect(c.topRankedGames().map((item) => item.game.id)).toEqual(['g2', 'g1']);
    expect(c.activities().map((a) => a.gameName)).toEqual(['Stardew Valley']);
    expect(c.activityHasMore()).toBe(true);
  });

  it('loadMoreActivity appends the next page and stops offering more once the last page arrives', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/withReviews`).flush([]);
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/activity/friends`)
      .flush(
        activityPage(
          [{ username: 'friend1', type: 'REVIEW', gameName: 'Portal 2', score: 8, createdAt: new Date().toISOString() }],
          { number: 0, last: false },
        ),
      );

    const c = fixture.componentInstance;
    expect(c.activityHasMore()).toBe(true);

    c.loadMoreActivity();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/activity/friends`);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(
      activityPage(
        [{ username: 'friend2', type: 'WISHLIST_ADD', gameName: 'Celeste', createdAt: new Date().toISOString() }],
        { number: 1, last: true },
      ),
    );

    expect(c.activities().map((a) => a.gameName)).toEqual(['Portal 2', 'Celeste']);
    expect(c.activityHasMore()).toBe(false);
    expect(c.activityLoadingMore()).toBe(false);
  });
});
