import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReviewService } from './review.service';
import { environment } from '../../../environments/environment';

describe('ReviewService', () => {
  let service: ReviewService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('create posts the review and expects a text response', () => {
    const review = { title: 'Portal 2', username: 'toni', comment: 'great', userScore: 9 };
    service.create(review).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/review/gameSelected/create`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(review);
    req.flush('created');
  });

  it('hasLiked is false before any liked reviews are loaded', () => {
    expect(service.hasLiked('r1')).toBe(false);
  });

  it('loadLikedReviews populates the liked set and is a no-op the second time for the same user', () => {
    service.loadLikedReviews('toni');
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/likedReviews`)
      .flush(['r1', 'r2']);

    expect(service.hasLiked('r1')).toBe(true);
    expect(service.hasLiked('r3')).toBe(false);

    // second call for the same user must not trigger another request
    service.loadLikedReviews('toni');
    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/user/reviewSelected/likedReviews`);
  });

  it('loadLikedReviews retries on a later call after a failed request', () => {
    service.loadLikedReviews('toni');
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/likedReviews`)
      .flush('error', { status: 500, statusText: 'Server Error' });

    service.loadLikedReviews('toni');
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/likedReviews`)
      .flush(['r1']);

    expect(service.hasLiked('r1')).toBe(true);
  });

  it('likeReview resolves true and marks the review as liked when the backend confirms', () => {
    let result: boolean | undefined;
    service.likeReview('toni', 'r1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/user/reviewSelected/addLikeReview`,
    );
    expect(req.request.params.get('username')).toBe('toni');
    expect(req.request.params.get('id')).toBe('r1');
    req.flush('added like');

    expect(result).toBe(true);
    expect(service.hasLiked('r1')).toBe(true);
  });

  it('likeReview resolves false and does not mark liked when the backend reports a no-op', () => {
    let result: boolean | undefined;
    service.likeReview('toni', 'r1').subscribe((r) => (result = r));

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/addLikeReview`)
      .flush('already liked');

    expect(result).toBe(false);
    expect(service.hasLiked('r1')).toBe(false);
  });

  it('unlikeReview resolves true and clears the liked flag when the backend confirms', () => {
    // seed liked state first
    service.likeReview('toni', 'r1').subscribe();
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/addLikeReview`)
      .flush('added like');
    expect(service.hasLiked('r1')).toBe(true);

    let result: boolean | undefined;
    service.unlikeReview('toni', 'r1').subscribe((r) => (result = r));
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/removeLikeReview`)
      .flush('removed like');

    expect(result).toBe(true);
    expect(service.hasLiked('r1')).toBe(false);
  });

  it('unlikeReview resolves false and keeps the liked flag when the backend reports a no-op', () => {
    // seed liked state first
    service.likeReview('toni', 'r1').subscribe();
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/addLikeReview`)
      .flush('added like');
    expect(service.hasLiked('r1')).toBe(true);

    let result: boolean | undefined;
    service.unlikeReview('toni', 'r1').subscribe((r) => (result = r));
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/removeLikeReview`)
      .flush('not liked');

    expect(result).toBe(false);
    expect(service.hasLiked('r1')).toBe(true);
  });
});
