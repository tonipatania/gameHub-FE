import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { GameDetailComponent } from './game-detail.component';
import { environment } from '../../../../environments/environment';

const gamePage = (overrides: Partial<{ name: string; reviews: unknown[] }> = {}) => ({
  content: [
    {
      id: 'g1',
      name: overrides.name ?? 'Portal 2',
      genres: 'Puzzle',
      reviews: overrides.reviews ?? [],
    },
  ],
  totalPages: 1,
  totalElements: 1,
  size: 1,
  number: 0,
  first: true,
  last: true,
});

const emptyPage = { content: [], totalPages: 1, totalElements: 0, size: 1, number: 0, first: true, last: true };

describe('GameDetailComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      imports: [GameDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ name: 'Portal 2' })) },
        },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  function create() {
    const fixture = TestBed.createComponent(GameDetailComponent);
    fixture.detectChanges();
    return fixture;
  }

  function flushGameLookup(page = gamePage()) {
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/searchFilter`).flush(page);
  }

  it('loads the game matching the decoded route param', () => {
    const fixture = create();
    flushGameLookup();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.game()?.name).toBe('Portal 2');
  });

  it('leaves game as null when the backend finds nothing', () => {
    const fixture = create();
    flushGameLookup(emptyPage);

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.game()).toBeNull();
  });

  it('does not check the wishlist when logged out', () => {
    create();
    flushGameLookup();
    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist`);
  });

  it('marks the game as already in the wishlist when logged in', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushGameLookup();

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist`)
      .flush([{ id: 'g1', name: 'Portal 2' }]);

    expect(fixture.componentInstance.inWishlist()).toBe(true);
  });

  it('toggleWishlist adds the game when logged in and not yet in the wishlist', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushGameLookup();
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist`)
      .flush([]);

    fixture.componentInstance.toggleWishlist();

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/wishlist/addWishlistGame`)
      .flush('added');

    expect(fixture.componentInstance.inWishlist()).toBe(true);
  });

  it('toggleWishlist does nothing when logged out', () => {
    const fixture = create();
    flushGameLookup();

    fixture.componentInstance.toggleWishlist();
    httpMock.expectNone((r) => r.url.includes('Wishlist'));
  });

  it('submitReview posts the review, shows a confirmation and reloads the review list', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushGameLookup();
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist`).flush([]);

    fixture.componentInstance.reviewForm.setValue({ comment: 'Loved it', userScore: 10 });
    fixture.componentInstance.submitReview();

    const createReq = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/review/gameSelected/create`,
    );
    expect(createReq.request.body).toEqual({
      title: 'Portal 2',
      username: 'toni',
      comment: 'Loved it',
      userScore: 10,
    });
    createReq.flush('created');

    // submitReview() reloads the reviews for the game after a successful post
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/searchFilter`).flush(
      gamePage({
        reviews: [{ id: 'r1', title: 'Portal 2', username: 'toni', comment: 'Loved it', userScore: 10, likeCount: 0 }],
      }),
    );

    expect(fixture.componentInstance.submittingReview()).toBe(false);
    expect(fixture.componentInstance.reviewMessage()).toBeTruthy();
    expect(fixture.componentInstance.reviewForm.value.comment).toBe('');
    expect(fixture.componentInstance.reviews().length).toBe(1);
  });

  it('does not submit an invalid review form', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushGameLookup();
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist`).flush([]);

    fixture.componentInstance.reviewForm.setValue({ comment: '', userScore: 8 });
    fixture.componentInstance.submitReview();

    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/review/gameSelected/create`);
  });

  it('onLikeChange updates only the matching review', () => {
    const fixture = create();
    flushGameLookup(
      gamePage({
        reviews: [
          { id: 'r1', title: 'Portal 2', username: 'a', comment: 'x', userScore: 9, likeCount: 1 },
          { id: 'r2', title: 'Portal 2', username: 'b', comment: 'y', userScore: 7, likeCount: 5 },
        ],
      }),
    );

    fixture.componentInstance.onLikeChange({ reviewId: 'r2', delta: -1 });

    const reviews = fixture.componentInstance.reviews();
    expect(reviews.find((r) => r.id === 'r1')?.likeCount).toBe(1);
    expect(reviews.find((r) => r.id === 'r2')?.likeCount).toBe(4);
  });
});
