import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MAPLE, PLANT_NAMES, hizbOf, type PlantId } from '../plants/catalog';
import { surahName, type AyahPos, type Portion } from '../lib/ranges';
import { ar, PLANT_NAMES_AR } from './ar';
import { en } from './en';

export type Lang = 'ar' | 'en';
export type StringKey = keyof typeof en;
type Vars = Record<string, string | number>;

const KEY = 'wird.lang';
const DICTS: Record<Lang, Record<StringKey, string>> = { ar, en };

export type I18n = {
  lang: Lang;
  /** Arabic reads right to left: rows are mirrored by hand (no app restart needed) */
  rtl: boolean;
  setLang: (l: Lang) => void;
  t: (key: StringKey, vars?: Vars) => string;
  plantName: (id: PlantId) => string;
  surah: (n: number) => string;
  portionTitle: (p: Portion) => string;
  portionRange: (p: Portion) => string;
  pages: (p: Portion) => string;
  ayahChip: (ayahs: AyahPos[]) => string;
};

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : s);

function build(lang: Lang, setLang: (l: Lang) => void): I18n {
  const dict = DICTS[lang];
  const t = (key: StringKey, vars?: Vars) => fill(dict[key], vars);
  const surah = (n: number) => surahName(n)[lang];
  return {
    lang,
    rtl: lang === 'ar',
    setLang,
    t,
    plantName: (id) => (id === MAPLE ? t('plant.maple') : (lang === 'ar' ? PLANT_NAMES_AR : PLANT_NAMES)[hizbOf(id)]),
    surah,
    portionTitle: (p) => `${t(p.mode === 'rub' ? 'tafsir.portion.rub' : 'tafsir.portion.thumn')} ${p.n}`,
    portionRange: (p) => {
      const s = surah(p.start.surah);
      if (p.start.surah === p.end.surah) {
        return p.start.ayah === p.end.ayah
          ? t('tafsir.rangeSame', { s, a: p.start.ayah })
          : t('tafsir.rangeIn', { s, a: p.start.ayah, b: p.end.ayah });
      }
      return t('tafsir.rangeAcross', { s, a: p.start.ayah, e: surah(p.end.surah), b: p.end.ayah });
    },
    pages: (p) =>
      p.start.page === p.end.page ? t('tafsir.page', { n: p.start.page }) : t('tafsir.pages', { a: p.start.page, b: p.end.page }),
    ayahChip: (ayahs) =>
      ayahs.length === 1
        ? t('tafsir.ayah', { n: ayahs[0].ayah })
        : t('tafsir.ayahs', { a: ayahs[0].ayah, b: ayahs[ayahs.length - 1].ayah }),
  };
}

const Ctx = createContext<I18n>(build('ar', () => {}));

/** Arabic by default; the choice is remembered. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => (v === 'ar' || v === 'en') && setLangState(v))
      .catch(() => {});
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(KEY, l).catch(() => {});
  }, []);

  const value = useMemo(() => build(lang, setLang), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
