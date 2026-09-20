import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  SEEN_DWELL_MS,
  SEEN_MIN_VISIBLE_RATIO,
  SeenOnViewDirective,
} from './seen-on-view.directive';

@Component({
  imports: [SeenOnViewDirective],
  template: `<div appSeenOnView (appSeenOnView)="count = count + 1">post</div>`,
})
class HostComponent {
  count = 0;
}

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  disconnected = false;

  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe = vi.fn();
  disconnect = () => {
    this.disconnected = true;
  };

  report(ratio: number, viewportHeight = 800, elementHeight = 300): void {
    this.callback(
      [
        {
          isIntersecting: ratio > 0,
          intersectionRatio: ratio,
          intersectionRect: { height: ratio * elementHeight },
          rootBounds: { height: viewportHeight },
        } as unknown as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

describe('SeenOnViewDirective', () => {
  function create() {
    const fixture = TestBed.createComponent(HostComponent);
    // afterNextRender parte dopo il primo ciclo di rendering
    fixture.detectChanges();
    TestBed.tick();
    return fixture;
  }

  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('emits once after the element stays mostly visible for the dwell time', () => {
    const fixture = create();
    const observer = FakeIntersectionObserver.instances[0];

    observer.report(0.8);
    vi.advanceTimersByTime(SEEN_DWELL_MS);

    expect(fixture.componentInstance.count).toBe(1);
    // dopo l'evento smette di osservare: non puo' emettere una seconda volta
    expect(observer.disconnected).toBe(true);
  });

  it('does not emit for a quick scroll-past shorter than the dwell time', () => {
    const fixture = create();
    const observer = FakeIntersectionObserver.instances[0];

    observer.report(0.9);
    vi.advanceTimersByTime(SEEN_DWELL_MS - 100);
    observer.report(0);
    vi.advanceTimersByTime(SEEN_DWELL_MS * 2);

    expect(fixture.componentInstance.count).toBe(0);
  });

  it('does not count an element that is only barely in view', () => {
    const fixture = create();
    const observer = FakeIntersectionObserver.instances[0];

    observer.report(SEEN_MIN_VISIBLE_RATIO - 0.2);
    vi.advanceTimersByTime(SEEN_DWELL_MS * 2);

    expect(fixture.componentInstance.count).toBe(0);
  });

  it('counts an element taller than the viewport once it fills half of it', () => {
    const fixture = create();
    const observer = FakeIntersectionObserver.instances[0];

    // il 30% dell'elemento, ma 480px su 800 di viewport: e' quello che l'utente sta leggendo
    observer.report(0.3, 800, 1600);
    vi.advanceTimersByTime(SEEN_DWELL_MS);

    expect(fixture.componentInstance.count).toBe(1);
  });

  it('does not emit while the tab is in the background', () => {
    const fixture = create();
    const observer = FakeIntersectionObserver.instances[0];
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

    observer.report(1);
    vi.advanceTimersByTime(SEEN_DWELL_MS * 2);
    expect(fixture.componentInstance.count).toBe(0);

    // tornando in primo piano il conteggio riparte
    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(SEEN_DWELL_MS);
    expect(fixture.componentInstance.count).toBe(1);
  });

  it('disconnects the observer when the element is destroyed', () => {
    const fixture = create();
    const observer = FakeIntersectionObserver.instances[0];

    fixture.destroy();

    expect(observer.disconnected).toBe(true);
  });

  it('does nothing where IntersectionObserver is not available', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    const fixture = create();

    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    expect(fixture.componentInstance.count).toBe(0);
  });
});
