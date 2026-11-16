import type { PortionMode } from './ranges';
import type { StringKey } from '../i18n/I18nContext';

export type SealText = { title: string; sub: string; doneTitle: string; doneSub: string };

type T = (key: StringKey, vars?: Record<string, string | number>) => string;

const LINES = ['seal.l1', 'seal.l2', 'seal.l3', 'seal.l4', 'seal.l5'] as const;

/**
 * What the completion seal says: "I finished my thumn / rub'", said with a smile, in the app's language.
 * The line is chosen by the portion number, so it varies day to day but is stable while reading.
 */
export function sealText(t: T, mode: PortionMode, n: number): SealText {
  const vars = { mine: t(`seal.mine.${mode}` as StringKey), of: t(`seal.of.${mode}` as StringKey), the: t(`seal.the.${mode}` as StringKey) };
  const line = LINES[(n - 1 + LINES.length * 1000) % LINES.length];
  return {
    title: t(`${line}.t` as StringKey, vars),
    sub: t(`${line}.s` as StringKey, vars),
    doneTitle: t('seal.doneTitle'),
    doneSub: t('seal.doneSub'),
  };
}
