import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ReviewCardComponent } from './review-card.component';
import { Review } from '../../../core/models/review.model';
import { environment } from '../../../../environments/environment';

const baseReview: Review = {
  id: 'r1',
  title: 'Portal 2',
  username: 'author',
  comment: 'Great game!',
  userScore: 9,
  likeCount: 3,
};

describe('ReviewCardComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [ReviewCardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  function create(review: Review = baseReview) {
    const fixture = TestBed.createComponent(ReviewCardComponent);
    fixture.componentRef.setInput('review', review);
    fixture.detectChanges();
    return fixture;
  }

  it('does not call loadLikedReviews when logged out', () => {
    create();
    httpMock.expectNone(() => true);
  });

  it('loads liked state on construction when logged in', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/likedReviews`)
      .flush(['r1']);

    expect(fixture.componentInstance.liked()).toBe(true);
  });

  it('renders the review text and score', () => {
    const fixture = create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Great game!');
    expect(text).toContain('author');
    expect(text).toContain('9');
  });

  it('isLong is true only for comments over 220 characters', () => {
    const fixture = create({ ...baseReview, comment: 'x'.repeat(221) });
    expect(fixture.componentInstance.isLong()).toBe(true);

    const shortFixture = create({ ...baseReview, comment: 'short' });
    expect(shortFixture.componentInstance.isLong()).toBe(false);
  });

  it('does nothing when toggling a like while logged out', () => {
    const fixture = create();
    fixture.componentInstance.onToggleLike();
    httpMock.expectNone(() => true);
  });

  it('likes a review and emits likeChange with delta +1', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/likedReviews`)
      .flush([]);

    const emitted: unknown[] = [];
    fixture.componentInstance.likeChange.subscribe((e) => emitted.push(e));

    fixture.componentInstance.onToggleLike();
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/addLikeReview`)
      .flush('added like');

    expect(emitted).toEqual([{ reviewId: 'r1', delta: 1 }]);
    expect(fixture.componentInstance.liked()).toBe(true);
  });

  it('unlikes an already-liked review and emits likeChange with delta -1', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/likedReviews`)
      .flush(['r1']);
    expect(fixture.componentInstance.liked()).toBe(true);

    const emitted: unknown[] = [];
    fixture.componentInstance.likeChange.subscribe((e) => emitted.push(e));

    fixture.componentInstance.onToggleLike();
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/removeLikeReview`)
      .flush('removed like');

    expect(emitted).toEqual([{ reviewId: 'r1', delta: -1 }]);
    expect(fixture.componentInstance.liked()).toBe(false);
  });

  it('does not emit likeChange when the backend reports a no-op', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/likedReviews`)
      .flush([]);

    const emitted: unknown[] = [];
    fixture.componentInstance.likeChange.subscribe((e) => emitted.push(e));

    fixture.componentInstance.onToggleLike();
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/addLikeReview`)
      .flush('already liked');

    expect(emitted).toEqual([]);
    expect(fixture.componentInstance.liked()).toBe(false);
  });

  it('encodeName encodes the game title for the router link', () => {
    const fixture = create();
    expect(fixture.componentInstance.encodeName('Half-Life: Alyx')).toBe(
      encodeURIComponent('Half-Life: Alyx'),
    );
  });
});
