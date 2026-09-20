import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { GamesComponent } from './games-list.component';
import { GameRails } from '../../../core/models/game.model';
import { environment } from '../../../../environments/environment';

const emptyPage = {
  content: [],
  totalPages: 1,
  totalElements: 0,
  size: 24,
  number: 0,
  first: true,
  last: true,
};

describe('GamesComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    // jsdom does not implement scrollIntoView; pagination handlers call it on page change
    Element.prototype.scrollIntoView = vi.fn();

    TestBed.configureTestingModule({
      imports: [GamesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  const rails = (overrides: Partial<GameRails> = {}): GameRails => ({
    weekly: [{ id: 'w1', name: 'Weekly One', url: { headerImage: 'w1.jpg' } }],
    favorites: [{ id: 'f1', name: 'Fav One' }],
    latest: [{ id: 'l1', name: 'Latest One' }],
    ...overrides,
  });

  // la pagina si apre sugli scaffali: il catalogo A-Z non viene caricato finche' non serve
  function createAndLoad(loadedRails: GameRails = rails()) {
    const fixture = TestBed.createComponent(GamesComponent);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/game/rails`).flush(loadedRails);
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/game/genres`)
      .flush(['RPG', 'Action']);

    return fixture;
  }

  function openCatalogAndLoad(fixture: ReturnType<typeof createAndLoad>, page = emptyPage) {
    fixture.componentInstance.openCatalog();
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/getAll`).flush(page);
  }

  it('opens on the rails and does not load the A-Z catalog', () => {
    const fixture = createAndLoad();
    const c = fixture.componentInstance;

    expect(c.showRails()).toBe(true);
    expect(c.railsLoading()).toBe(false);
    expect(c.allGenres()).toEqual(['RPG', 'Action']);
    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/game/getAll`);
  });

  it('renders the three rails with their titles and puts the weekly #1 in the hero', () => {
    const fixture = createAndLoad();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(fixture.componentInstance.featured()?.name).toBe('Weekly One');
    expect(text).toContain('Top games of the week');
    expect(text).toContain('Community favorites');
    expect(text).toContain('Latest releases');
    expect(text).toContain('Weekly One');
    expect(text).toContain('Fav One');
    expect(text).toContain('Latest One');
  });

  it('hides an empty rail instead of showing an empty shelf', () => {
    const fixture = createAndLoad(rails({ favorites: [] }));
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).not.toContain('Community favorites');
    expect(text).toContain('Latest releases');
  });

  it('falls back to a message and the catalog button when the rails cannot be loaded', () => {
    const fixture = TestBed.createComponent(GamesComponent);
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/game/rails`)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/genres`).flush([]);
    fixture.detectChanges();

    expect(fixture.componentInstance.hasRails()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('load the latest picks');
  });

  it('opening the catalog shows the A-Z grid, and Discover brings the rails back', () => {
    const fixture = createAndLoad();
    const c = fixture.componentInstance;

    openCatalogAndLoad(fixture);
    expect(c.showRails()).toBe(false);

    c.showDiscover();
    expect(c.showRails()).toBe(true);
    // gli scaffali restano quelli gia' caricati: nessuna nuova richiesta
    httpMock.expectNone(() => true);
  });

  it('searching shows the results grid without opening the catalog', () => {
    const fixture = createAndLoad();
    const c = fixture.componentInstance;

    c.filterForm.setValue({ name: 'zelda' });
    vi.advanceTimersByTime(400);
    httpMock
      .expectOne(
        (r) =>
          r.url === `${environment.apiUrl}/game/searchFilter` && r.params.get('name') === 'zelda',
      )
      .flush(emptyPage);

    expect(c.showRails()).toBe(false);
    expect(c.catalogOpen()).toBe(false);
  });

  it('clearing the search goes back to the rails', () => {
    const fixture = createAndLoad();
    const c = fixture.componentInstance;

    c.filterForm.setValue({ name: 'zelda' });
    vi.advanceTimersByTime(400);
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/searchFilter`).flush(emptyPage);

    c.filterForm.setValue({ name: '' });
    vi.advanceTimersByTime(400);

    expect(c.showRails()).toBe(true);
    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/game/getAll`);
  });

  it('debounces name search and calls searchFilter after 400ms of silence', () => {
    const fixture = createAndLoad();
    const c = fixture.componentInstance;

    c.filterForm.setValue({ name: 'zelda' });
    vi.advanceTimersByTime(399);
    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/game/searchFilter`);

    vi.advanceTimersByTime(1);
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/game/searchFilter` && r.params.get('name') === 'zelda',
    );
    req.flush(emptyPage);

    expect(c.isSearching()).toBe(true);
  });

  it('toggling a genre applies the filter immediately with the selected genres', () => {
    const fixture = createAndLoad();
    const c = fixture.componentInstance;

    c.toggleGenre('RPG');

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/game/searchFilter` &&
        !!r.params.getAll('genres')?.includes('RPG'),
    );
    req.flush(emptyPage);

    expect(c.selectedGenres().has('RPG')).toBe(true);
  });

  it('nextPage loads the next page of results (not-searching path)', () => {
    const fixture = createAndLoad();
    openCatalogAndLoad(fixture, { ...emptyPage, totalPages: 3 });
    const c = fixture.componentInstance;

    c.nextPage();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/getAll`);
    req.flush({ ...emptyPage, number: 1, totalPages: 3 });

    expect(c.currentPage()).toBe(1);
    expect(c.navigating()).toBe(false);
  });

  it('prevPage is a no-op on the first page', () => {
    const fixture = createAndLoad();
    openCatalogAndLoad(fixture);
    fixture.componentInstance.prevPage();
    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/game/getAll`);
  });
});
