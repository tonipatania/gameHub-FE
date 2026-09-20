import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GameRailComponent } from './game-rail.component';
import { Game } from '../../../core/models/game.model';

const games: Game[] = [
  { id: 'g1', name: 'Alpha' },
  { id: 'g2', name: 'Beta' },
  { id: 'g3', name: 'Gamma' },
];

@Component({
  imports: [GameRailComponent],
  template: `
    <app-game-rail
      title="Top of the week"
      subtitle="Hot right now"
      [games]="games"
      [ranked]="ranked"
      [wishlistNames]="wishlist"
      (wishlistToggle)="toggled.push($event)"
    />
  `,
})
class HostComponent {
  games = games;
  ranked = false;
  wishlist = new Set(['Beta']);
  toggled: string[] = [];
}

describe('GameRailComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    });
  });

  function create(configure?: (host: HostComponent) => void) {
    const fixture = TestBed.createComponent(HostComponent);
    configure?.(fixture.componentInstance);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the title, the subtitle and one card per game', () => {
    const el = create().nativeElement as HTMLElement;

    expect(el.textContent).toContain('Top of the week');
    expect(el.textContent).toContain('Hot right now');
    expect(el.querySelectorAll('app-game-card').length).toBe(3);
  });

  it('numbers the cards only when the rail is ranked', () => {
    const plain = create().nativeElement as HTMLElement;
    expect(plain.querySelector('[aria-hidden="true"].text-5xl')).toBeNull();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] });
    const ranked = create((h) => (h.ranked = true)).nativeElement as HTMLElement;
    const numbers = Array.from(ranked.querySelectorAll('.text-5xl')).map((n) =>
      n.textContent?.trim(),
    );
    expect(numbers).toEqual(['1', '2', '3']);
  });

  it('marks the cards of games already in the wishlist', () => {
    const el = create().nativeElement as HTMLElement;
    const cards = Array.from(el.querySelectorAll('app-game-card'));

    expect(cards[0].textContent).toContain('+ Wishlist');
    expect(cards[1].textContent).toContain('In wishlist');
  });

  it('re-emits the wishlist toggle of a card with the game name', () => {
    const fixture = create();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'app-game-card button',
    )!;

    button.click();

    expect(fixture.componentInstance.toggled).toEqual(['Alpha']);
  });

  it('the arrows page the track by most of its width, and start disabled when nothing overflows', () => {
    const fixture = create();
    const el = fixture.nativeElement as HTMLElement;
    const track = el.querySelector<HTMLElement>('.gh-rail')!;
    track.scrollBy = vi.fn() as unknown as typeof track.scrollBy;
    Object.defineProperty(track, 'clientWidth', { value: 1000, configurable: true });

    const rail = fixture.debugElement.children[0].componentInstance as GameRailComponent;
    rail.scrollByPage(1);
    rail.scrollByPage(-1);

    expect(track.scrollBy).toHaveBeenNthCalledWith(1, { left: 850, behavior: 'smooth' });
    expect(track.scrollBy).toHaveBeenNthCalledWith(2, { left: -850, behavior: 'smooth' });
    // in jsdom non c'e' layout: niente da scorrere, quindi le frecce sono spente
    expect(rail.canScrollPrev()).toBe(false);
    expect(rail.canScrollNext()).toBe(false);
  });

  it('enables the next arrow when the content overflows the track', () => {
    const fixture = create();
    const track = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.gh-rail')!;
    Object.defineProperty(track, 'clientWidth', { value: 500, configurable: true });
    Object.defineProperty(track, 'scrollWidth', { value: 1500, configurable: true });

    const rail = fixture.debugElement.children[0].componentInstance as GameRailComponent;
    rail.updateArrows();

    expect(rail.canScrollNext()).toBe(true);
    expect(rail.canScrollPrev()).toBe(false);
  });
});
