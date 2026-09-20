import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent, SPARSE_FEED_THRESHOLD } from './home.component';
import { ActivityItem, CommunityHighlights } from '../../core/models/activity.model';
import { TranslationService } from '../../core/services/translation.service';
import { environment } from '../../../environments/environment';

const FEED_URL = `${environment.apiUrl}/user/activity/friends`;
const SEEN_URL = `${environment.apiUrl}/user/activity/friends/seen`;
const HIGHLIGHTS_URL = `${environment.apiUrl}/user/community/highlights`;
const SUGGESTIONS_URL = `${environment.apiUrl}/user/SuggestFriends`;

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

function activity(id: string, overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id,
    username: 'friend1',
    type: 'WISHLIST_ADD',
    gameName: 'Stardew Valley',
    createdAt: `2026-09-20T10:0${id.replace(/\D/g, '') || '0'}:00.000Z`,
    unseen: false,
    ...overrides,
  };
}

const emptyHighlights: CommunityHighlights = { trendingReviews: [], hotGames: [] };

describe('HomeComponent', () => {
  let httpMock: HttpTestingController;
  let i18n: TranslationService;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.setItem('gamehub_lang', 'en');

    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    httpMock = TestBed.inject(HttpTestingController);
    i18n = TestBed.inject(TranslationService);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  function create(user: string | null = 'toni') {
    if (user) sessionStorage.setItem('gamehub_user', user);
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    return fixture;
  }

  // risponde alle due richieste iniziali (feed + community) e, se il feed e' scarno, ai
  // suggerimenti che ne conseguono
  function flushInit(
    page: ReturnType<typeof activityPage>,
    highlights: CommunityHighlights = emptyHighlights,
    suggestions: unknown[] | null = [],
  ) {
    httpMock.expectOne((r) => r.url === FEED_URL).flush(page);
    httpMock.expectOne(HIGHLIGHTS_URL).flush(highlights);
    if (suggestions) {
      httpMock.expectOne((r) => r.url === SUGGESTIONS_URL).flush(suggestions);
    }
  }

  it('does nothing when no user is logged in', () => {
    const fixture = create(null);

    httpMock.expectNone(() => true);
    expect(fixture.componentInstance.activityLoading()).toBe(true);
  });

  it('no longer shows the welcome heading, its subtitle or the top-ranked games', () => {
    const fixture = create();
    flushInit(activityPage([activity('a1')]), emptyHighlights, []);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).not.toContain('Welcome back');
    expect(text).not.toContain('Top ranked');
    // e nessuna richiesta di classifica giochi parte piu' dalla Home
    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/game/withReviews`);
  });

  it('loads the friends feed and the community highlights on init', () => {
    const fixture = create();
    flushInit(
      activityPage(
        [activity('a1'), activity('a2'), activity('a3'), activity('a4'), activity('a5')],
        { last: false },
      ),
      {
        trendingReviews: [
          {
            review: {
              id: 'r1',
              title: 'Portal 2',
              username: 'bob',
              comment: 'wow',
              userScore: 9,
              likeCount: 40,
            },
            recentLikes: 6,
            windowHours: 48,
          },
        ],
        hotGames: [],
      },
      null,
    );

    const c = fixture.componentInstance;
    expect(c.activityLoading()).toBe(false);
    expect(c.highlightsLoading()).toBe(false);
    expect(c.activities().map((a) => a.id)).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
    expect(c.activityHasMore()).toBe(true);
    expect(c.highlights().trendingReviews).toHaveLength(1);
  });

  it('requests the feed without a username: it is derived from the token', () => {
    create();

    const req = httpMock.expectOne((r) => r.url === FEED_URL);
    expect(req.request.params.has('username')).toBe(false);
    req.flush(activityPage());
    httpMock.expectOne(HIGHLIGHTS_URL).flush(emptyHighlights);
    httpMock.expectOne((r) => r.url === SUGGESTIONS_URL).flush([]);
  });

  it('a feed failure does not block the community section', () => {
    const fixture = create();
    httpMock
      .expectOne((r) => r.url === FEED_URL)
      .flush('boom', {
        status: 500,
        statusText: 'Server Error',
      });
    httpMock.expectOne(HIGHLIGHTS_URL).flush({
      trendingReviews: [],
      hotGames: [
        { game: { id: 'g1', name: 'Celeste', avgScore: 9, price: 5 }, recentWishlistAdds: 4 },
      ],
    });
    httpMock.expectOne((r) => r.url === SUGGESTIONS_URL).flush([]);

    const c = fixture.componentInstance;
    expect(c.activityLoading()).toBe(false);
    expect(c.highlights().hotGames).toHaveLength(1);
  });

  it('shows the empty message when the network has no recent activity', () => {
    const fixture = create();
    flushInit(activityPage([]), emptyHighlights, []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(i18n.t('home.feedEmpty'));
    expect(fixture.nativeElement.textContent).toContain(i18n.t('community.empty'));
  });

  describe('sparse feed fallback: people to follow', () => {
    it('offers suggested people when the feed is empty', () => {
      const fixture = create();
      flushInit(activityPage([]), emptyHighlights, [
        { id: 'u9', username: 'stranger', reason: 'POPULAR', followers: 12 },
      ]);
      fixture.detectChanges();

      expect(fixture.componentInstance.showSuggestions()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('stranger');
    });

    it(`offers them while the feed has fewer than ${SPARSE_FEED_THRESHOLD} items`, () => {
      const fixture = create();
      flushInit(activityPage([activity('a1'), activity('a2')]), emptyHighlights, []);

      expect(fixture.componentInstance.showSuggestions()).toBe(true);
    });

    it('does not fetch suggestions for a healthy feed', () => {
      const fixture = create();
      flushInit(
        activityPage(
          Array.from({ length: SPARSE_FEED_THRESHOLD }, (_, i) => activity(`a${i + 1}`)),
          { last: true },
        ),
        emptyHighlights,
        null,
      );

      expect(fixture.componentInstance.showSuggestions()).toBe(false);
      httpMock.expectNone((r) => r.url === SUGGESTIONS_URL);
    });

    it('does not fetch suggestions while more feed pages are waiting', () => {
      const fixture = create();
      flushInit(activityPage([activity('a1')], { last: false }), emptyHighlights, null);

      expect(fixture.componentInstance.showSuggestions()).toBe(false);
    });

    it('follows and unfollows a suggested person from the Home', () => {
      const fixture = create();
      flushInit(activityPage([]), emptyHighlights, [{ id: 'u9', username: 'stranger' }]);
      const c = fixture.componentInstance;

      c.toggleFollow('stranger');
      httpMock
        .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/follow`)
        .flush('ok');
      expect(c.followed().has('stranger')).toBe(true);

      c.toggleFollow('stranger');
      httpMock
        .expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/unfollow`)
        .flush('ok');
      expect(c.followed().has('stranger')).toBe(false);
    });
  });

  describe('pagination', () => {
    it('loadMoreActivity appends the next page and stops offering more on the last one', () => {
      const fixture = create();
      flushInit(activityPage([activity('a1')], { number: 0, last: false }), emptyHighlights, null);
      const c = fixture.componentInstance;
      expect(c.activityHasMore()).toBe(true);

      c.loadMoreActivity();

      const req = httpMock.expectOne((r) => r.url === FEED_URL);
      expect(req.request.params.get('page')).toBe('1');
      req.flush(activityPage([activity('a2')], { number: 1, last: true }));

      expect(c.activities().map((a) => a.id)).toEqual(['a1', 'a2']);
      expect(c.activityHasMore()).toBe(false);
      expect(c.activityLoadingMore()).toBe(false);
    });

    it('ignores a second loadMoreActivity while one is in flight', () => {
      const fixture = create();
      flushInit(activityPage([activity('a1')], { last: false }), emptyHighlights, null);
      const c = fixture.componentInstance;

      c.loadMoreActivity();
      c.loadMoreActivity();

      httpMock.expectOne((r) => r.url === FEED_URL).flush(activityPage([], { number: 1 }));
    });
  });

  describe('new / seen tracking', () => {
    const list = [
      activity('a3', { unseen: true, createdAt: '2026-09-20T10:03:00.000Z' }),
      activity('a2', { unseen: true, createdAt: '2026-09-20T10:02:00.000Z' }),
      activity('a1', { unseen: false, createdAt: '2026-09-20T10:01:00.000Z' }),
    ];

    function setupWithNew() {
      const fixture = create();
      flushInit(activityPage(list), emptyHighlights, []);
      return fixture;
    }

    it('counts the new activities and lowers the count as they are seen', () => {
      const c = setupWithNew().componentInstance;
      expect(c.remainingNew()).toBe(2);

      c.onActivitySeen(list[0]);
      expect(c.remainingNew()).toBe(1);
    });

    it('splits the feed into a "new" section and an "already seen" one', () => {
      const fixture = setupWithNew();
      fixture.detectChanges();

      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain(i18n.t('home.sectionNew'));
      expect(text).toContain(i18n.t('home.sectionEarlier'));
    });

    it('shows no section headings when nothing is new', () => {
      const fixture = create();
      flushInit(activityPage([activity('a1'), activity('a2')]), emptyHighlights, []);
      fixture.detectChanges();

      const text: string = fixture.nativeElement.textContent;
      expect(text).not.toContain(i18n.t('home.sectionNew'));
      expect(text).not.toContain(i18n.t('home.sectionEarlier'));
    });

    it('does not move the bookmark while some new activity is still unseen', () => {
      const c = setupWithNew().componentInstance;

      // visto il primo post ma non il secondo: le novita' non sono finite
      c.onActivitySeen(list[0]);

      httpMock.expectNone((r) => r.url === SEEN_URL);
    });

    it('moves the bookmark to the newest activity once every new one has been seen', () => {
      const c = setupWithNew().componentInstance;

      c.onActivitySeen(list[0]);
      c.onActivitySeen(list[1]);

      const req = httpMock.expectOne((r) => r.url === SEEN_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.params.get('upTo')).toBe('2026-09-20T10:03:00.000Z');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('does not move the bookmark for a partial scroll that skipped the top of the feed', () => {
      const c = setupWithNew().componentInstance;

      // ha visto solo le piu' vecchie: la piu' recente (che e' anche nuova) manca
      c.onActivitySeen(list[1]);
      c.onActivitySeen(list[2]);

      httpMock.expectNone((r) => r.url === SEEN_URL);
    });

    it('sends the bookmark only once for the same newest activity', () => {
      const c = setupWithNew().componentInstance;

      c.onActivitySeen(list[0]);
      c.onActivitySeen(list[1]);
      httpMock.expectOne((r) => r.url === SEEN_URL).flush(null, { status: 204, statusText: '' });

      c.onActivitySeen(list[2]);
      httpMock.expectNone((r) => r.url === SEEN_URL);
    });

    it('establishes the bookmark on a first visit, when nothing is flagged new', () => {
      const fixture = create();
      const first = activity('a1', { createdAt: '2026-09-20T10:01:00.000Z' });
      flushInit(activityPage([first]), emptyHighlights, []);

      fixture.componentInstance.onActivitySeen(first);

      const req = httpMock.expectOne((r) => r.url === SEEN_URL);
      expect(req.request.params.get('upTo')).toBe('2026-09-20T10:01:00.000Z');
      req.flush(null, { status: 204, statusText: '' });
    });

    it('retries the bookmark on the next seen activity after a failed save', () => {
      const c = setupWithNew().componentInstance;

      c.onActivitySeen(list[0]);
      c.onActivitySeen(list[1]);
      httpMock
        .expectOne((r) => r.url === SEEN_URL)
        .flush('boom', {
          status: 500,
          statusText: 'Server Error',
        });

      c.onActivitySeen(list[2]);
      httpMock.expectOne((r) => r.url === SEEN_URL).flush(null, { status: 204, statusText: '' });
    });
  });

  describe('community section', () => {
    it('labels the trending window in hours or as a week', () => {
      const c = create().componentInstance;
      httpMock.expectOne((r) => r.url === FEED_URL).flush(activityPage());
      httpMock.expectOne(HIGHLIGHTS_URL).flush(emptyHighlights);
      httpMock.expectOne((r) => r.url === SUGGESTIONS_URL).flush([]);

      expect(c.windowLabel(48)).toBe('in the last 48 hours');
      expect(c.windowLabel(168)).toBe('in the last week');
    });

    it('renders trending reviews and the most wished-for games', () => {
      const fixture = create();
      flushInit(
        activityPage([activity('a1')]),
        {
          trendingReviews: [
            {
              review: {
                id: 'r1',
                title: 'Portal 2',
                username: 'bob',
                comment: 'A masterpiece',
                userScore: 9,
                likeCount: 40,
              },
              recentLikes: 6,
              windowHours: 48,
            },
          ],
          hotGames: [
            { game: { id: 'g1', name: 'Celeste', avgScore: 9, price: 5 }, recentWishlistAdds: 4 },
          ],
        },
        [],
      );
      fixture.detectChanges();

      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain('A masterpiece');
      expect(text).toContain('+6 likes in the last 48 hours');
      expect(text).toContain('Celeste');
      expect(text).toContain('4 wishlist additions');
    });
  });
});
