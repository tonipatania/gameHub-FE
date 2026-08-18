import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { GamesComponent } from './games-list.component';
import { environment } from '../../../../environments/environment';

const emptyPage = { content: [], totalPages: 1, totalElements: 0, size: 24, number: 0, first: true, last: true };

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

  function createAndLoad(firstPage: typeof emptyPage = emptyPage) {
    const fixture = TestBed.createComponent(GamesComponent);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/getAll`).flush(firstPage);
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/genres`).flush(['RPG', 'Action']);

    return fixture;
  }

  it('loads the first page of games and the genre list on init', () => {
    const fixture = createAndLoad();
    const c = fixture.componentInstance;

    expect(c.loading()).toBe(false);
    expect(c.allGenres()).toEqual(['RPG', 'Action']);
  });

  it('debounces name search and calls searchFilter after 400ms of silence', () => {
    const fixture = createAndLoad();
    const c = fixture.componentInstance;

    c.filterForm.setValue({ name: 'zelda' });
    vi.advanceTimersByTime(399);
    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/game/searchFilter`);

    vi.advanceTimersByTime(1);
    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/game/searchFilter` && r.params.get('name') === 'zelda',
    );
    req.flush(emptyPage);

    expect(c.isSearching()).toBe(true);
  });

  it('toggling a genre applies the filter immediately with the selected genres', () => {
    const fixture = createAndLoad();
    const c = fixture.componentInstance;

    c.toggleGenre('RPG');

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/game/searchFilter` && !!r.params.getAll('genres')?.includes('RPG'),
    );
    req.flush(emptyPage);

    expect(c.selectedGenres().has('RPG')).toBe(true);
  });

  it('nextPage loads the next page of results (not-searching path)', () => {
    const fixture = createAndLoad({ ...emptyPage, totalPages: 3 });
    const c = fixture.componentInstance;

    c.nextPage();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/getAll`);
    req.flush({ ...emptyPage, number: 1, totalPages: 3 });

    expect(c.currentPage()).toBe(1);
    expect(c.navigating()).toBe(false);
  });

  it('prevPage is a no-op on the first page', () => {
    const fixture = createAndLoad();
    fixture.componentInstance.prevPage();
    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/game/getAll`);
  });
});
