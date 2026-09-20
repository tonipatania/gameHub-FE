import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivityCardComponent } from './activity-card.component';
import { ActivityItem } from '../../../core/models/activity.model';
import { TranslationService } from '../../../core/services/translation.service';

const review = {
  id: 'r1',
  title: 'Portal 2',
  userScore: 9,
  comment: 'A masterpiece',
  username: 'bob',
  likeCount: 7,
};

const baseActivity: ActivityItem = {
  id: 'a1',
  username: 'toniplayer',
  type: 'WISHLIST_ADD',
  gameName: 'Portal 2',
  createdAt: new Date().toISOString(),
  unseen: false,
};

describe('ActivityCardComponent', () => {
  let httpMock: HttpTestingController;
  let i18n: TranslationService;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.setItem('gamehub_lang', 'en');
    TestBed.configureTestingModule({
      imports: [ActivityCardComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    i18n = TestBed.inject(TranslationService);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  function create(activity: ActivityItem = baseActivity) {
    const fixture = TestBed.createComponent(ActivityCardComponent);
    fixture.componentRef.setInput('activity', activity);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the first two letters of the username as initials, uppercased', () => {
    const fixture = create();
    expect(fixture.componentInstance.initials()).toBe('TO');
  });

  it('reports "just now" for a timestamp seconds in the past', () => {
    const fixture = create({ ...baseActivity, createdAt: new Date().toISOString() });
    expect(fixture.componentInstance.relativeTime()).toBe('Just now');
  });

  it('reports minutes ago for a timestamp under an hour old', () => {
    const createdAt = new Date(Date.now() - 5 * 60_000).toISOString();
    const fixture = create({ ...baseActivity, createdAt });
    expect(fixture.componentInstance.relativeTime()).toBe('5m ago');
  });

  it('reports hours ago for a timestamp under a day old', () => {
    const createdAt = new Date(Date.now() - 3 * 3_600_000).toISOString();
    const fixture = create({ ...baseActivity, createdAt });
    expect(fixture.componentInstance.relativeTime()).toBe('3h ago');
  });

  it('reports days ago for a timestamp a day or more old', () => {
    const createdAt = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const fixture = create({ ...baseActivity, createdAt });
    expect(fixture.componentInstance.relativeTime()).toBe('2d ago');
  });

  describe('message', () => {
    it('describes a wishlist addition', () => {
      const fixture = create();
      expect(fixture.componentInstance.message()).toBe('added Portal 2 to their wishlist');
    });

    it('describes a review with its score', () => {
      const fixture = create({ ...baseActivity, type: 'REVIEW', score: 8, review });
      expect(fixture.componentInstance.message()).toBe('reviewed Portal 2 — 8/10');
    });

    it("describes a like naming the review's author and game", () => {
      const fixture = create({ ...baseActivity, type: 'LIKE_REVIEW', review });
      expect(fixture.componentInstance.message()).toBe("liked bob's review of Portal 2");
    });

    it('describes a follow naming who was followed', () => {
      const fixture = create({
        ...baseActivity,
        type: 'FOLLOW',
        gameName: undefined,
        targetUsername: 'carl',
      });
      expect(fixture.componentInstance.message()).toBe('started following carl');
    });
  });

  describe('content', () => {
    it('shows the game preview for a wishlist addition', () => {
      const fixture = create({
        ...baseActivity,
        game: { id: 'g1', name: 'Portal 2', genres: 'Puzzle', avgScore: 9, price: 9.99 },
      });

      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain('Portal 2');
      expect(text).toContain('Puzzle');
      expect(text).toContain('€9.99');
    });

    it('labels a zero price as free', () => {
      const fixture = create({
        ...baseActivity,
        game: { id: 'g1', name: 'Portal 2', avgScore: 9, price: 0 },
      });

      expect(fixture.nativeElement.textContent).toContain(i18n.t('common.free'));
    });

    it('shows the full review, with the like button, for a review activity', () => {
      const fixture = create({ ...baseActivity, type: 'REVIEW', score: 9, review });
      // ReviewCard carica i like dell'utente solo se c'e' una sessione
      const text: string = fixture.nativeElement.textContent;

      expect(text).toContain('A masterpiece');
      expect(fixture.nativeElement.querySelector('app-review-card')).not.toBeNull();
    });

    it('shows the liked review of another author for a like activity', () => {
      const fixture = create({ ...baseActivity, type: 'LIKE_REVIEW', review });

      expect(fixture.nativeElement.querySelector('app-review-card')).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain('bob');
    });

    it('shows the followed user with wishlist and follower counts', () => {
      const fixture = create({
        ...baseActivity,
        type: 'FOLLOW',
        gameName: undefined,
        targetUsername: 'carl',
        targetWishlistCount: 12,
        targetFollowers: 340,
      });

      expect(fixture.componentInstance.targetInitials()).toBe('CA');
      expect(fixture.componentInstance.targetStats()).toBe('12 games in wishlist · 340 followers');
      const link: HTMLAnchorElement =
        fixture.nativeElement.querySelector('a[href="/profile/carl"]');
      expect(link).not.toBeNull();
    });

    it('omits the stats line when the backend could not provide them', () => {
      const fixture = create({
        ...baseActivity,
        type: 'FOLLOW',
        gameName: undefined,
        targetUsername: 'carl',
      });

      expect(fixture.componentInstance.targetStats()).toBe('');
    });
  });

  describe('unseen state', () => {
    it('badges and highlights an unseen activity', () => {
      const fixture = create({ ...baseActivity, unseen: true });

      expect(fixture.nativeElement.textContent).toContain(i18n.t('activityFeed.new'));
      expect(fixture.nativeElement.querySelector('article').className).toContain(
        'border-violet-500',
      );
    });

    it('shows no badge for an already seen activity', () => {
      const fixture = create({ ...baseActivity, unseen: false });

      expect(fixture.nativeElement.textContent).not.toContain(i18n.t('activityFeed.new'));
    });
  });

  describe('like on an embedded review', () => {
    it('reflects a confirmed like on the displayed like count', () => {
      sessionStorage.setItem('gamehub_user', 'toni');
      const fixture = create({ ...baseActivity, type: 'REVIEW', score: 9, review });
      // il costruttore di ReviewCard scarica i like dell'utente
      httpMock.match((r) => r.url.endsWith('/user/reviewSelected/likedReviews'));

      expect(fixture.componentInstance.reviewView()?.likeCount).toBe(7);

      fixture.componentInstance.onLikeChange({ reviewId: 'r1', delta: 1 });
      expect(fixture.componentInstance.reviewView()?.likeCount).toBe(8);

      fixture.componentInstance.onLikeChange({ reviewId: 'r1', delta: -1 });
      expect(fixture.componentInstance.reviewView()?.likeCount).toBe(7);
    });

    it('has no review view for activities without a review', () => {
      const fixture = create();
      expect(fixture.componentInstance.reviewView()).toBeNull();
    });
  });

  it('forwards the seen event from the post to its parent', () => {
    const fixture = create();
    const seen = vi.fn();
    fixture.componentInstance.seen.subscribe(seen);

    fixture.debugElement
      .query((el) => el.name === 'article')
      .triggerEventHandler('appSeenOnView', undefined);

    expect(seen).toHaveBeenCalledTimes(1);
  });
});
