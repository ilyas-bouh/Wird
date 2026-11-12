// Ayah highlighting per quran.ws: match `.ayahPolygon` by surah/ayah, keep a real fill and vary fill-opacity
// (never fill:none, it would stop taps). Stroke styles are our own extension; the docs do not cover them.

export type HighlightStyle = {
  name: string;
  fill: string;
  opacity: number;
  stroke?: string;
  strokeWidth?: number;
  dash?: string;
};

export const HIGHLIGHT_STYLES: HighlightStyle[] = [
  { name: 'mint', fill: '#2E7D32', opacity: 0.22 },
  { name: 'gold', fill: '#D6AD64', opacity: 0.4 },
  { name: 'teal', fill: '#15705D', opacity: 0.35 },
  { name: 'rose', fill: '#C2547A', opacity: 0.2 },
  { name: 'sky', fill: '#3F7CC4', opacity: 0.22 },
  { name: 'outline', fill: '#2E7D32', opacity: 0.06, stroke: '#2E7D32', strokeWidth: 1.2, dash: '3 2' },
];

export type Highlight = { surah: number; ayah: number; style: HighlightStyle };

/** Pick up to `count` random distinct ayahs, one style each (styles in random order too). */
export function pickRandomHighlights(
  ayahs: { surah: number; ayah: number }[],
  count = HIGHLIGHT_STYLES.length,
): Highlight[] {
  const shuffle = <T,>(a: T[]) => {
    const r = [...a];
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  };
  const styles = shuffle(HIGHLIGHT_STYLES);
  return shuffle(ayahs)
    .slice(0, Math.min(count, styles.length))
    .map((a, i) => ({ surah: a.surah, ayah: a.ayah, style: styles[i] }));
}

/** Script that applies the highlights to every page SVG in the document. */
export function highlightScript(highlights: Highlight[]) {
  return `
(function () {
  var H = ${JSON.stringify(highlights)};
  H.forEach(function (h) {
    document.querySelectorAll('.ayahPolygon[surah="' + h.surah + '"][ayah="' + h.ayah + '"]').forEach(function (p) {
      var s = h.style;
      p.setAttribute('fill', s.fill);
      p.setAttribute('fill-opacity', String(s.opacity));
      if (s.stroke) {
        p.setAttribute('stroke', s.stroke);
        p.setAttribute('stroke-width', String(s.strokeWidth));
        p.setAttribute('stroke-linejoin', 'round');
        if (s.dash) p.setAttribute('stroke-dasharray', s.dash);
      }
    });
  });
})();`;
}
