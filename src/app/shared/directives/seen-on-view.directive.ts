import { DestroyRef, Directive, ElementRef, afterNextRender, inject, output } from '@angular/core';

/** Quanto deve restare visibile un elemento perche' conti come "letto" dall'utente. */
export const SEEN_DWELL_MS = 1000;
/** Frazione minima dell'elemento (o dello schermo, per elementi molto alti) da vedere. */
export const SEEN_MIN_VISIBLE_RATIO = 0.5;

/**
 * Emette `appSeenOnView` una sola volta quando l'elemento e' almeno per meta' nel viewport per
 * SEEN_DWELL_MS di fila, con la scheda in primo piano. Una scorsa veloce non conta: serve a
 * distinguere "l'utente ha guardato questa attivita'" da "e' passata di fianco durante lo scroll".
 */
@Directive({ selector: '[appSeenOnView]' })
export class SeenOnViewDirective {
  readonly appSeenOnView = output<void>();

  constructor() {
    const element: HTMLElement = inject(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    // afterNextRender non gira lato server; il controllo copre anche jsdom, che non ha
    // IntersectionObserver
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') return;

      let visible = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const stopTimer = () => {
        clearTimeout(timer);
        timer = undefined;
      };

      const evaluate = () => {
        if (visible && document.visibilityState === 'visible') {
          timer ??= setTimeout(() => {
            cleanup();
            this.appSeenOnView.emit();
          }, SEEN_DWELL_MS);
        } else {
          stopTimer();
        }
      };

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          // un elemento piu' alto dello schermo non raggiunge mai il 50% di se': per lui basta
          // che occupi meta' del viewport
          const fillsHalfViewport =
            entry.intersectionRect.height >=
            (entry.rootBounds?.height ?? Infinity) * SEEN_MIN_VISIBLE_RATIO;
          visible =
            entry.isIntersecting &&
            (entry.intersectionRatio >= SEEN_MIN_VISIBLE_RATIO || fillsHalfViewport);
          evaluate();
        },
        { threshold: [0, 0.25, SEEN_MIN_VISIBLE_RATIO, 0.75, 1] },
      );

      const cleanup = () => {
        stopTimer();
        observer.disconnect();
        document.removeEventListener('visibilitychange', evaluate);
      };

      observer.observe(element);
      document.addEventListener('visibilitychange', evaluate);
      destroyRef.onDestroy(cleanup);
    });
  }
}
