// Mushaf text styling (applied to the page SVGs inside the Reader WebView).
// The text is vector outlines, so "bold" is an outline stroke around each glyph.
export const TEXT_STYLE = {
  /** glyph colour (the shipped SVGs use #231f20) */
  color: '#000000',
  /** glyph outline thickness in glyph units: 0 = original weight, ~0.1 = semi-bold, ~0.25 = bold */
  bold: 0.12,
  /** colour of the ayah-end medallions */
  marker: '#2E7D32',
};

export function textStyleCss(t = TEXT_STYLE) {
  return `
  #content path { fill: ${t.color}; stroke: ${t.color}; stroke-width: ${t.bold}; stroke-linejoin: round; }
  #ayah_markers path { fill: ${t.marker}; }`;
}
