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

  describe('own reviews', () => {
    const own: Review = { ...baseReview, username: 'toni' };

    it("has no like button on the user's own review, only the count", () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      const fixture = create(own);
      httpMock
        .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/likedReviews`)
        .flush([]);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(fixture.componentInstance.isOwn()).toBe(true);
      expect(el.querySelector('button[aria-pressed]')).toBeNull();
      expect(el.textContent).toContain('3 like');
    });

    it('never calls the backend when toggling a like on an own review', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      const fixture = create(own);
      httpMock
        .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/likedReviews`)
        .flush([]);

      fixture.componentInstance.onToggleLike();

      httpMock.expectNone((r) => r.url.includes('LikeReview'));
    });

    it("other people's reviews keep the like button", () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      const fixture = create();
      httpMock
        .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/likedReviews`)
        .flush([]);
      fixture.detectChanges();

      expect(fixture.componentInstance.isOwn()).toBe(false);
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('button[aria-pressed]'),
      ).toBeTruthy();
    });
  });

  describe('arriving from a notification', () => {
    it('is not highlighted by default', () => {
      const fixture = create();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('article')?.className,
      ).not.toContain('ring-2');
    });

    it('is highlighted and scrolled into view when asked to', () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      const fixture = TestBed.createComponent(ReviewCardComponent);
      fixture.componentRef.setInput('review', baseReview);
      fixture.componentRef.setInput('highlight', true);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('article')?.className).toContain(
        'ring-2',
      );
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
    });

    it('opens the reply thread on arrival, and the user can still close it', () => {
      const fixture = TestBed.createComponent(ReviewCardComponent);
      fixture.componentRef.setInput('review', baseReview);
      fixture.componentRef.setInput('allowReplies', true);
      fixture.componentRef.setInput('replyCount', 2);
      fixture.componentRef.setInput('openThread', true);
      fixture.detectChanges();

      expect(fixture.componentInstance.repliesOpen()).toBe(true);
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/review/replies`).flush([]);

      fixture.componentInstance.repliesOpen.set(false);
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('app-review-replies')).toBeNull();
    });
  });

  describe('replies', () => {
    function createWithReplies(review: Review, replyCount: number) {
      const fixture = TestBed.createComponent(ReviewCardComponent);
      fixture.componentRef.setInput('review', review);
      fixture.componentRef.setInput('allowReplies', true);
      fixture.componentRef.setInput('replyCount', replyCount);
      fixture.detectChanges();
      return fixture;
    }

    function flushLiked() {
      httpMock
        .expectOne((r) => r.url === `${environment.apiUrl}/user/reviewSelected/likedReviews`)
        .flush([]);
    }

    it('does not show any reply control unless replies are allowed', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      const fixture = create();
      flushLiked();
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Reply');
    });

    it('offers "Reply" on someone else\'s review and opens the thread on click', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      const fixture = createWithReplies(baseReview, 0);
      flushLiked();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(fixture.componentInstance.canReply()).toBe(true);
      expect(fixture.componentInstance.repliesLabel()).toBe('Reply');

      fixture.componentInstance.repliesOpen.set(true);
      fixture.detectChanges();
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/review/replies`).flush([]);
      fixture.detectChanges();

      expect(el.querySelector('app-review-replies')).toBeTruthy();
      expect(el.querySelector('textarea')).toBeTruthy();
    });

    it('shows the reply count, singular and plural', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      const one = createWithReplies(baseReview, 1);
      flushLiked();
      expect(one.componentInstance.repliesLabel()).toBe('1 reply');

      const many = createWithReplies(baseReview, 4);
      expect(many.componentInstance.repliesLabel()).toBe('4 replies');
    });

    it('the author of the review cannot reply: no reply box, but can read the thread', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      const fixture = createWithReplies({ ...baseReview, username: 'toni' }, 2);
      flushLiked();

      expect(fixture.componentInstance.canReply()).toBe(false);
      expect(fixture.componentInstance.repliesLabel()).toBe('2 replies');

      fixture.componentInstance.repliesOpen.set(true);
      fixture.detectChanges();
      httpMock
        .expectOne((r) => r.url === `${environment.apiUrl}/review/replies`)
        .flush([
          {
            id: 'p1',
            reviewId: 'r1',
            username: 'other',
            comment: 'Nice',
            createdAt: new Date().toISOString(),
          },
        ]);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Nice');
      expect(el.querySelector('textarea')).toBeNull();
    });

    it('an own review without replies has nothing to open', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      const fixture = createWithReplies({ ...baseReview, username: 'toni' }, 0);
      flushLiked();
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Reply');
    });
  });
});
