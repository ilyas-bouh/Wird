export type Palette = {
  accent: string;
  /** text/icons placed on top of `accent` */
  onAccent: string;
  mint: string;
  paleGreen: string;
  paper: string;
  /** raised surfaces: cards, pills, sheets */
  card: string;
  /** the tinted strip behind rows of small plants */
  surface: string;
  darkGreen: string;
  deepGreen: string;
  text: string;
  textMuted: string;
  dark: boolean;
};

export const lightColors: Palette = {
  accent: '#2E7D32',
  onAccent: '#FFFFFF',
  mint: '#A5D6A7',
  paleGreen: '#E8F5E9',
  paper: '#FBFDF9',
  card: '#FFFFFF',
  surface: '#F1F8EC',
  darkGreen: '#1B3A22',
  deepGreen: '#0F2415',
  text: '#1B2A1E',
  textMuted: '#5E7463',
  dark: false,
};

/** night: deep blue-black paper, cream text, moonlit blues in place of the pale greens */
export const darkColors: Palette = {
  accent: '#7FD6A2',
  onAccent: '#08160E',
  mint: '#2C4B61',
  paleGreen: '#172231',
  paper: '#0E1520',
  card: '#1B2737',
  surface: '#141E2B',
  darkGreen: '#E4EEE8',
  deepGreen: '#070C12',
  text: '#F0E8D4',
  textMuted: '#93A4B3',
  dark: true,
};

/** the light palette, for anything that is not themed yet */
export const colors = lightColors;
