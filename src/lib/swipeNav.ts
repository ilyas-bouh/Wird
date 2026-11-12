import { createNavigationContainerRef } from '@react-navigation/native';

type Tabs = { Garden: undefined; Reader: undefined; Tafsir: undefined };

export const navigationRef = createNavigationContainerRef<Tabs>();

const ORDER: (keyof Tabs)[] = ['Garden', 'Reader', 'Tafsir'];

/** Jump to the next (left) or previous (right) screen right away; the three screens loop endlessly. */
export function goSwipe(dir: 'left' | 'right') {
  if (!navigationRef.isReady()) return;
  const current = navigationRef.getCurrentRoute()?.name as keyof Tabs | undefined;
  const i = current ? ORDER.indexOf(current) : -1;
  if (i < 0) return;
  navigationRef.navigate(ORDER[(i + (dir === 'left' ? 1 : -1) + ORDER.length) % ORDER.length]);
}

// SwipeNav registers an animated version (slide out, switch, slide in); without it we just switch.
let animator: ((dir: 'left' | 'right') => void) | null = null;
export function registerSwipeAnimator(fn: ((dir: 'left' | 'right') => void) | null) {
  animator = fn;
}

/** Swipe left = next screen, swipe right = previous. Animated when the SwipeNav wrapper is mounted. */
export function swipeNavigate(dir: 'left' | 'right') {
  if (animator) animator(dir);
  else goSwipe(dir);
}
