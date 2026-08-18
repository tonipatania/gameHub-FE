import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GameService } from './game.service';
import { environment } from '../../../environments/environment';

describe('GameService', () => {
  let service: GameService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GameService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll sends page/size and an optional sort param', () => {
    service.getAll(2, 10, 'name').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/game/getAll`,
    );
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('sort')).toBe('name');
    req.flush({ content: [], totalPages: 1, totalElements: 0, size: 10, number: 2, first: false, last: true });
  });

  it('searchFilter only sets params that are provided', () => {
    service.searchFilter({ name: 'zelda', genres: ['RPG', 'Action'], avgScore: 8 }, 0, 24).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/searchFilter`);
    expect(req.request.params.get('name')).toBe('zelda');
    expect(req.request.params.getAll('genres')).toEqual(['RPG', 'Action']);
    expect(req.request.params.get('avgScore')).toBe('8');
    req.flush({ content: [], totalPages: 1, totalElements: 0, size: 24, number: 0, first: true, last: true });
  });

  it('searchFilter omits genres/avgScore params when absent', () => {
    service.searchFilter({}, 0, 24).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/searchFilter`);
    expect(req.request.params.has('name')).toBe(false);
    expect(req.request.params.has('genres')).toBe(false);
    expect(req.request.params.has('avgScore')).toBe(false);
    req.flush({ content: [], totalPages: 1, totalElements: 0, size: 24, number: 0, first: true, last: true });
  });

  it('getGamesWithReviews sends a size param', () => {
    service.getGamesWithReviews(5).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/game/withReviews`);
    expect(req.request.params.get('size')).toBe('5');
    req.flush([]);
  });

  it('getGenres returns the array as-is', () => {
    let result: string[] | undefined;
    service.getGenres().subscribe((r) => (result = r));

    httpMock.expectOne(`${environment.apiUrl}/game/genres`).flush(['RPG', 'Action']);
    expect(result).toEqual(['RPG', 'Action']);
  });

  it('getGenres falls back to an empty array on a non-array (string) response', () => {
    let result: string[] | undefined;
    service.getGenres().subscribe((r) => (result = r));

    httpMock.expectOne(`${environment.apiUrl}/game/genres`).flush('no genres');
    expect(result).toEqual([]);
  });

  it('suggestGames encodes the username in the URL', () => {
    let result: unknown;
    service.suggestGames('to ni').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      `${environment.apiUrl}/game/suggestGames/${encodeURIComponent('to ni')}`,
    );
    req.flush([{ id: 'g1', name: 'Portal' }]);
    expect(result).toEqual([{ id: 'g1', name: 'Portal' }]);
  });

  it('suggestGames falls back to an empty array on a non-array response', () => {
    let result: unknown;
    service.suggestGames('toni').subscribe((r) => (result = r));

    httpMock
      .expectOne(`${environment.apiUrl}/game/suggestGames/toni`)
      .flush('user not found');
    expect(result).toEqual([]);
  });
});
