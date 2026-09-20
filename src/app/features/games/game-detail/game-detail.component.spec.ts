import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { GameDetailComponent } from './game-detail.component';
import { ToastService } from '../../../core/services/toast.service';
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

const emptyPage = {
  content: [],
  totalPages: 1,
  totalElements: 0,
  size: 1,
  number: 0,
  first: true,
  last: true,
};

describe('GameDetailComponent', () => {
  let httpMock: HttpTestingController;
  // ?review=...&thread=1 quando si arriva da una notifica
  let queryParams: Record<string, string> = {};

  beforeEach(() => {
    sessionStorage.clear();
    queryParams = {};

    TestBed.configureTestingModule({
      imports: [GameDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ name: 'Portal 2' })),
            // getter: il test imposta i parametri dopo la configurazione, prima di create()
            get snapshot() {
              return { queryParamMap: convertToParamMap(queryParams) };
            },
          },
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

  function flushGameLookup(page = gamePage(), replyCounts: Record<string, number> = {}) {
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/searchFilter`).flush(page);
    flushReplyCounts(page.content[0]?.reviews ?? [], replyCounts);
  }

  // i conteggi delle risposte si chiedono solo se ci sono recensioni da contare
  function flushReplyCounts(reviews: unknown[], counts: Record<string, number> = {}) {
    if (reviews.length === 0) {
      httpMock.expectNone((r) => r.url === `${environment.apiUrl}/review/replies/counts`);
      return;
    }
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/review/replies/counts`)
      .flush(counts);
  }

  it('loads the game matching the decoded route param', () => {
    const fixture = create();
    flushGameLookup();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.game()?.name).toBe('Portal 2');
  });

  describe('arriving from a notification (?review=)', () => {
    const embedded = {
      id: 'r1',
      title: 'Portal 2',
      username: 'anna',
      comment: 'Top',
      userScore: 9,
      likeCount: 5,
    };
    const outside = {
      id: 'r9',
      title: 'Portal 2',
      username: 'toni',
      comment: 'Mia',
      userScore: 7,
      likeCount: 0,
    };

    it('highlights the review when it is among the loaded ones, without fetching it', () => {
      queryParams = { review: 'r1', thread: '1' };
      const fixture = create();
      flushGameLookup(gamePage({ reviews: [embedded] }));
      fixture.detectChanges();
      // il thread si apre da solo (?thread=1): la card lo carica
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/review/replies`).flush([]);

      httpMock.expectNone(`${environment.apiUrl}/review/r1`);
      expect(fixture.componentInstance.pinnedReview()).toBeNull();
      expect(fixture.componentInstance.focusReviewId).toBe('r1');
      expect(fixture.componentInstance.openThread).toBe(true);
    });

    it('fetches and pins the review when it is not among the loaded ones', () => {
      queryParams = { review: 'r9' };
      const fixture = create();
      flushGameLookup(gamePage({ reviews: [embedded] }));

      httpMock.expectOne(`${environment.apiUrl}/review/r9`).flush(outside);
      // il conteggio risposte ora include anche la recensione appuntata
      const counts = httpMock.expectOne(
        (r) => r.url === `${environment.apiUrl}/review/replies/counts`,
      );
      expect(counts.request.params.getAll('ids')).toEqual(['r1', 'r9']);
      counts.flush({});
      fixture.detectChanges();

      expect(fixture.componentInstance.pinnedReview()?.id).toBe('r9');
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mia');
      // non gonfia il conteggio "Top recensioni"
      expect(fixture.componentInstance.reviews()).toHaveLength(1);
    });

    it('ignores a review that belongs to another game', () => {
      queryParams = { review: 'r9' };
      const fixture = create();
      flushGameLookup(gamePage({ reviews: [embedded] }));

      httpMock
        .expectOne(`${environment.apiUrl}/review/r9`)
        .flush({ ...outside, title: 'Half-Life' });

      expect(fixture.componentInstance.pinnedReview()).toBeNull();
    });

    it('tells the user when the review no longer exists', () => {
      queryParams = { review: 'gone' };
      const info = vi
        .spyOn(TestBed.inject(ToastService), 'info')
        .mockImplementation(() => undefined);
      const fixture = create();
      flushGameLookup(gamePage({ reviews: [embedded] }));

      httpMock
        .expectOne(`${environment.apiUrl}/review/gone`)
        .flush('nope', { status: 404, statusText: 'Not Found' });

      expect(info).toHaveBeenCalled();
      expect(fixture.componentInstance.pinnedReview()).toBeNull();
    });

    it('does nothing special without the query parameter', () => {
      const fixture = create();
      flushGameLookup(gamePage({ reviews: [embedded] }));

      expect(fixture.componentInstance.focusReviewId).toBeNull();
      expect(fixture.componentInstance.openThread).toBe(false);
    });

    it('keeps the pinned review in sync when it is liked', () => {
      queryParams = { review: 'r9' };
      const fixture = create();
      flushGameLookup(gamePage({ reviews: [embedded] }));
      httpMock.expectOne(`${environment.apiUrl}/review/r9`).flush(outside);
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/review/replies/counts`).flush({});

      fixture.componentInstance.onLikeChange({ reviewId: 'r9', delta: 1 });

      expect(fixture.componentInstance.pinnedReview()?.likeCount).toBe(1);
    });
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
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist`)
      .flush([]);

    const toastSuccessSpy = vi.spyOn(TestBed.inject(ToastService), 'success');

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
    const reloaded = [
      {
        id: 'r1',
        title: 'Portal 2',
        username: 'toni',
        comment: 'Loved it',
        userScore: 10,
        likeCount: 0,
      },
    ];
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/game/searchFilter`)
      .flush(gamePage({ reviews: reloaded }));
    flushReplyCounts(reloaded);

    expect(fixture.componentInstance.submittingReview()).toBe(false);
    expect(toastSuccessSpy).toHaveBeenCalled();
    expect(fixture.componentInstance.reviewForm.value.comment).toBe('');
    expect(fixture.componentInstance.reviews().length).toBe(1);
  });

  it('does not submit an invalid review form', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushGameLookup();
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist`)
      .flush([]);

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

  it('asks for the reply counts of all the reviews in one call and keeps them by review id', () => {
    const fixture = create();
    flushGameLookup(
      gamePage({
        reviews: [
          { id: 'r1', title: 'Portal 2', username: 'a', comment: 'x', userScore: 9, likeCount: 1 },
          { id: 'r2', title: 'Portal 2', username: 'b', comment: 'y', userScore: 7, likeCount: 5 },
        ],
      }),
      { r2: 3 },
    );

    expect(fixture.componentInstance.replyCounts()).toEqual({ r2: 3 });
  });

  it('still shows the reviews when the reply counts cannot be loaded', () => {
    const fixture = create();
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/game/searchFilter`)
      .flush(
        gamePage({
          reviews: [
            {
              id: 'r1',
              title: 'Portal 2',
              username: 'a',
              comment: 'x',
              userScore: 9,
              likeCount: 1,
            },
          ],
        }),
      );
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/review/replies/counts`)
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.reviews().length).toBe(1);
    expect(fixture.componentInstance.replyCounts()).toEqual({});
  });

  it('the review form uses the score picker, defaulting to 8', () => {
    const fixture = create();
    flushGameLookup();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-score-picker')).toBeTruthy();
    expect(el.querySelector('input[type="number"]')).toBeNull();
    expect(fixture.componentInstance.reviewForm.value.userScore).toBe(8);
  });

  it('picking a score in the widget updates the form control', () => {
    const fixture = create();
    flushGameLookup();
    fixture.detectChanges();

    const ticks = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      'app-score-picker [role="radio"]',
    );
    ticks[9].click();

    expect(fixture.componentInstance.reviewForm.value.userScore).toBe(10);
  });
});
