import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { GameCardComponent } from './game-card.component';
import { Game } from '../../../core/models/game.model';

const baseGame: Game = {
  id: '1',
  name: 'Portal 2',
  genres: 'Puzzle, Platformer',
  avgScore: 9,
  price: 0,
};

describe('GameCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GameCardComponent],
      providers: [provideRouter([])],
    });
  });

  function createComponent(game: Game = baseGame) {
    const fixture = TestBed.createComponent(GameCardComponent);
    fixture.componentRef.setInput('game', game);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the game name and score', () => {
    const fixture = createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Portal 2');
    expect(text).toContain('9/10');
  });

  it('treats a missing or zero price as free', () => {
    const fixture = createComponent({ ...baseGame, price: 0 });
    expect(fixture.componentInstance.isFree()).toBe(true);
  });

  it('formats a non-zero price in euros', () => {
    const fixture = createComponent({ ...baseGame, price: 19.99 });
    expect(fixture.componentInstance.isFree()).toBe(false);
    expect(fixture.componentInstance.priceLabel()).toBe('€19.99');
  });

  it('emits wishlistToggle with the game name and does not bubble the click', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('showWishlistButton', true);
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.wishlistToggle.subscribe((name) => emitted.push(name));

    const button = fixture.debugElement.query(By.css('button'));
    button.triggerEventHandler('click', { stopPropagation: () => {} });

    expect(emitted).toEqual(['Portal 2']);
  });

  it('encodes the game name for the router link', () => {
    const fixture = createComponent({ ...baseGame, name: 'Half-Life: Alyx' });
    expect(fixture.componentInstance.encodeName('Half-Life: Alyx')).toBe(
      encodeURIComponent('Half-Life: Alyx'),
    );
  });

  it('shows the rank number on the image only when a rank is given', () => {
    const plain = createComponent();
    expect((plain.nativeElement as HTMLElement).querySelector('.text-5xl')).toBeNull();

    const ranked = createComponent();
    ranked.componentRef.setInput('rank', 3);
    ranked.detectChanges();
    expect(
      (ranked.nativeElement as HTMLElement).querySelector('.text-5xl')?.textContent?.trim(),
    ).toBe('3');
  });

  describe('compact variant', () => {
    function createCompact(inWishlist = false) {
      const fixture = createComponent();
      fixture.componentRef.setInput('compact', true);
      fixture.componentRef.setInput('showWishlistButton', true);
      fixture.componentRef.setInput('inWishlist', inWishlist);
      fixture.detectChanges();
      return fixture;
    }

    it('shows the name, the genres and a small add button', () => {
      const fixture = createCompact();
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Portal 2');
      expect(el.textContent).toContain('Puzzle, Platformer');
      expect(el.querySelector('button')?.textContent?.trim()).toBe('+');
    });

    it('the button is not nested inside the link (invalid HTML)', () => {
      const fixture = createCompact();
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('a button')).toBeNull();
      expect(el.querySelector('a')?.getAttribute('href')).toContain('/games/');
    });

    it('emits the game name when the button is clicked', () => {
      const fixture = createCompact();
      const emitted: string[] = [];
      fixture.componentInstance.wishlistToggle.subscribe((name) => emitted.push(name));

      fixture.nativeElement.querySelector('button').click();

      expect(emitted).toEqual(['Portal 2']);
    });

    it('shows a filled heart for a game already in the wishlist', () => {
      const fixture = createCompact(true);
      expect(fixture.nativeElement.querySelector('button').textContent.trim()).toBe('♥');
    });
  });
});
