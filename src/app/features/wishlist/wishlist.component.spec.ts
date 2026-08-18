import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { WishlistComponent } from './wishlist.component';
import { Game } from '../../core/models/game.model';
import { environment } from '../../../environments/environment';

const games: Game[] = [
  { id: 'g1', name: 'Zelda', genres: 'Adventure', price: 59.99, releaseDate: 'Jan 1, 2020' },
  { id: 'g2', name: 'Alpha', genres: 'Adventure, Puzzle', price: 0, releaseDate: 'Jan 1, 2022' },
  { id: 'g3', name: 'Beta', genres: 'Puzzle', price: 19.99, releaseDate: 'not a date' },
];

describe('WishlistComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [WishlistComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  function create() {
    const fixture = TestBed.createComponent(WishlistComponent);
    fixture.detectChanges();
    return fixture;
  }

  function flushWishlist(list: Game[] = games) {
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/user/userSelected/wishlist`).flush(list);
  }

  it('does nothing when logged out', () => {
    create();
    httpMock.expectNone(() => true);
  });

  it('loads the wishlist on init', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushWishlist();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.games().length).toBe(3);
  });

  it('sorts alphabetically by name (default)', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushWishlist();

    expect(fixture.componentInstance.sortedGames().map((g) => g.name)).toEqual(['Alpha', 'Beta', 'Zelda']);
  });

  it('sorts by price ascending, treating a missing/zero price as free', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushWishlist();

    fixture.componentInstance.sortBy.set('price');
    expect(fixture.componentInstance.sortedGames().map((g) => g.name)).toEqual(['Alpha', 'Beta', 'Zelda']);
  });

  it('sorts by release date descending, pushing unparseable dates to the end', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushWishlist();

    fixture.componentInstance.sortBy.set('release');
    expect(fixture.componentInstance.sortedGames().map((g) => g.name)).toEqual(['Alpha', 'Zelda', 'Beta']);
  });

  it('computes total price, free label, genre count and top genre', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushWishlist();

    const c = fixture.componentInstance;
    expect(c.totalPrice()).toBe('€79.98');
    expect(c.genreCount()).toBe(2);
    expect(c.topGenre()).toBe('Adventure');
  });

  it('shows "Free" as the total when every game is free', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushWishlist([{ id: 'g1', name: 'FreeGame', price: 0 }]);

    expect(fixture.componentInstance.totalPrice()).toBe('Free');
  });

  it('remove() drops the game from the list after the backend confirms', () => {
    sessionStorage.setItem('gamehub_user', 'toni');
    const fixture = create();
    flushWishlist();

    fixture.componentInstance.remove('Zelda');

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/user/wishlist/deleteWishlistGame`)
      .flush('removed');

    expect(fixture.componentInstance.games().map((g) => g.name)).toEqual(['Alpha', 'Beta']);
  });
});
