/** Voti 1-10: la scala di colori (rosso -> verde) e le etichette sono le stesse ovunque. */
export const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Colore del voto: da rosso (1) a verde (10) passando per giallo, restando leggibile su sfondo scuro. */
export function scoreColor(score: number, alpha = 1): string {
  const clamped = Math.min(10, Math.max(1, Math.round(score)));
  const hue = ((clamped - 1) / 9) * 135;
  return `hsl(${hue} 72% 52% / ${alpha})`;
}

/** Chiave i18n del giudizio a parole ("Ottimo", "Capolavoro"...). */
export function scoreLabelKey(score: number): string {
  const clamped = Math.min(10, Math.max(1, Math.round(score)));
  return `score.label${clamped}`;
}
