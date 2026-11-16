import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StatusBar as RNStatusBar, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { setStatusBarHidden } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageView, { type PageViewHandle } from '../components/PageView';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';
import type { Palette } from '../theme/colors';
import TafsirSheet, { SHEET_HEIGHT } from '../components/TafsirSheet';
import { useFocusMode } from '../context/FocusContext';
import { MAX_STAGE, useGarden } from '../context/GardenContext';
import { sealText, type SealText } from '../lib/seal';
import { usePortion } from '../context/PortionContext';
import { TEXT_STYLE, TEXT_STYLE_DARK, textStyleCss } from '../theme/reading';
import { cropSvg, headerZones, selectRange } from '../lib/cropSvg';
import { ayahKey, hasAudio, useAyahPlayer, type AyahRef } from '../lib/useAyahPlayer';
import { portionAt, type Portion } from '../lib/ranges';
import { useOnboarding } from '../context/OnboardingContext';
import { CoachCard } from '../components/CoachMark';
import { swipeNavigate, swipeNavigateTo } from '../lib/swipeNav';
import { svgFromBr } from '../lib/brotli';
import pageInk from '../data/pageInk.json';
import { BUNDLED_PAGES, PAGE_JSONS, PAGE_SVGS } from '../data/pageAssets';

// Every page is cropped to the same width so the stacked pages share one scale.
const STRIP_WIDTH = 331;
const INK_TOP = pageInk as Record<string, number>;

async function loadSvg(module: number) {
  const asset = Asset.fromModule(module);
  if (Platform.OS === 'web') return svgFromBr(new Uint8Array(await (await fetch(asset.uri)).arrayBuffer()));
  await asset.downloadAsync();
  return svgFromBr(new Uint8Array(await new File(asset.localUri ?? asset.uri).arrayBuffer()));
}

type Seal = { text: SealText; done: boolean };
/** Onboarding mode of the page: 'read' pins a pulsing seal to the bottom and hides everything else; 'ayah' hides the seal. */
type Onb = { mode: 'read' | 'ayah'; title: string; text: string } | null;

/** Al-Fatiha alone, shown during the first-run tour. */
const FATIHA: Portion = {
  mode: 'thumn', n: 1,
  start: { surah: 1, ayah: 1, id: 1, page: 1 },
  end: { surah: 1, ayah: 7, id: 7, page: 1 },
};

type Nav = { label: string; enabled: boolean; prevLabel: string; hasPrev: boolean; lockedHint: string };

/** Next and back stay locked until today's portion is sealed (`seal.done`); sealing it unlocks them in place. */
function buildHtml(svgs: string[], next: Nav, colors: Palette, seal: Seal, onb: Onb = null) {
  const pages = svgs.map((s) => `<section class="page">${s.replace(/<\?xml[^>]*\?>/, '')}</section>`).join('');
  const sealHtml = `<div class="seal-wrap" dir="rtl">
  <button id="seal" class="seal${seal.done ? ' in done instant' : onb?.mode === 'read' ? ' in' : ''}" aria-label="${seal.text.title}">
    <span class="shine"></span>
    <svg class="star" viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,3 97,50 50,97 3,50"/><polygon points="19,19 81,19 81,81 19,81"/></svg>
    <span class="body">
      <svg class="check" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="25"/><path d="M16 29l8.5 8.5L40 20"/></svg>
      <span class="texts">
        <span class="t ready"><b>${seal.text.title}</b><em>${seal.text.sub}</em></span>
        <span class="t finished"><b>${seal.text.doneTitle}</b><em>${seal.text.doneSub}</em></span>
      </span>
    </span>
  </button>
  <div class="burst"></div>
</div>`.replace('<div class="seal-wrap" dir="rtl">', onb?.mode === 'read'
    ? `<div class="seal-wrap" dir="rtl"><div class="coach"><b>${onb.title}</b><span>${onb.text}</span><svg class="arrow" viewBox="0 0 24 24"><path d="M12 3v15M5.5 12.5 12 19l6.5-6.5"/></svg></div>`
    : '<div class="seal-wrap" dir="rtl">');
  const ok = (can: boolean) => `data-ok="${can ? 1 : 0}" ${can && seal.done ? '' : 'disabled'}`;
  const button = `<div class="next"><div class="navrow"><button id="prev" ${ok(next.hasPrev)}>${next.prevLabel}</button><button id="next" ${ok(next.enabled)}>${next.label}</button></div><p id="lock"${seal.done ? ' hidden' : ''}>${next.lockedHint}</p></div>`;
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin: 0; background: ${colors.paper}; touch-action: pan-y; }
  .page { padding: 0 10px; margin: 0; line-height: 0; }
  svg { display: block; width: 100%; height: auto; }
  svg path:not(.ayahPolygon) { pointer-events: none; }
  #content, #ayah_markers { pointer-events: none; }${textStyleCss(colors.dark ? TEXT_STYLE_DARK : TEXT_STYLE)}
  .next { padding: 4px 24px 120px; text-align: center; }
  /* ---- completion seal: a squircle that pops in, shines and bursts into petals ---- */
  .seal-wrap { position: relative; display: flex; justify-content: center; padding: 44px 18px 10px; }
  .seal { position: relative; width: min(84vw, 300px); aspect-ratio: 1.12 / 1; border: 0; border-radius: 38px; padding: 0;
          overflow: hidden; color: ${colors.onAccent}; cursor: pointer; -webkit-tap-highlight-color: transparent;
          font-family: 'Noto Naskh Arabic', 'Amiri', serif; background: linear-gradient(145deg, ${colors.accent}, ${colors.darkGreen});
          box-shadow: 0 18px 38px -14px ${colors.accent}, inset 0 1px 0 rgba(255,255,255,.35), inset 0 -10px 24px rgba(0,0,0,.18);
          opacity: 0; transform: translateY(28px) scale(.9); animation: breathe 3.4s ease-in-out infinite; }
  .seal.in { opacity: 1; transform: none; transition: opacity .6s ease, transform .8s cubic-bezier(.2,1.35,.4,1); }
  .seal.in:active { transform: scale(.96); transition-duration: .12s; }
  .seal::before { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity .7s ease;
                  background: linear-gradient(145deg, #E2B646, ${colors.accent} 75%); }
  .seal.done::before { opacity: 1; }
  .seal .shine { position: absolute; inset: -60% -40%; z-index: 2; pointer-events: none;
                 background: linear-gradient(115deg, transparent 42%, rgba(255,255,255,.38) 50%, transparent 58%);
                 transform: translateX(-130%); animation: sweep 4.6s ease-in-out 1.2s infinite; }
  .seal .star { position: absolute; right: -34px; bottom: -34px; width: 190px; height: 190px; fill: none; stroke: #fff;
                stroke-width: 1.6; opacity: .16; animation: spin 40s linear infinite; }
  .seal .body { position: relative; z-index: 3; height: 100%; display: flex; flex-direction: column; align-items: center;
                justify-content: center; gap: 12px; padding: 18px 22px; text-align: center; }
  .seal .check { width: 58px; height: 58px; fill: rgba(255,255,255,.14); stroke: #fff; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .seal .check path { stroke-dasharray: 60; stroke-dashoffset: 60; stroke-opacity: 0; }
  .seal.done .check { fill: rgba(255,255,255,.28); }
  .seal.done .check path { stroke-dashoffset: 0; stroke-opacity: 1; transition: stroke-dashoffset .6s ease .25s, stroke-opacity .1s ease .25s; }
  .seal .texts { display: grid; }
  .seal .t { grid-area: 1 / 1; display: flex; flex-direction: column; gap: 4px; transition: opacity .45s ease, transform .45s ease; }
  .seal .t b { font-size: 25px; line-height: 1.35; font-weight: 700; }
  .seal .t em { font-size: 16px; font-style: normal; opacity: .9; line-height: 1.5; }
  .seal .t.finished { opacity: 0; transform: translateY(10px); }
  .seal.done .t.ready { opacity: 0; transform: translateY(-10px); }
  .seal.done .t.finished { opacity: 1; transform: none; }
  .seal.instant, .seal.instant * { transition: none !important; }
  .seal.done { animation: breathe-gold 3.4s ease-in-out infinite; }
  .burst { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; z-index: 5; }
  .burst i { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 3px;
             animation: fly 1s cubic-bezier(.1,.75,.3,1) forwards; }
  @keyframes breathe { 0%,100% { box-shadow: 0 18px 38px -14px ${colors.accent}, inset 0 1px 0 rgba(255,255,255,.35), inset 0 -10px 24px rgba(0,0,0,.18); }
                       50% { box-shadow: 0 22px 52px -10px ${colors.accent}, inset 0 1px 0 rgba(255,255,255,.35), inset 0 -10px 24px rgba(0,0,0,.18); } }
  @keyframes breathe-gold { 0%,100% { box-shadow: 0 18px 38px -14px #E2B646, inset 0 1px 0 rgba(255,255,255,.4); }
                            50% { box-shadow: 0 22px 54px -8px #E2B646, inset 0 1px 0 rgba(255,255,255,.4); } }
  @keyframes sweep { 0% { transform: translateX(-130%); } 55%,100% { transform: translateX(130%); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fly { 0% { transform: translate(0,0) rotate(0) scale(.4); opacity: 1; }
                   100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(1); opacity: 0; } }
  button { font-size: 17px; padding: 14px 28px; border: 0; border-radius: 999px;
           background: ${colors.accent}; color: ${colors.onAccent}; font-family: sans-serif; }
  button[disabled] { background: ${colors.mint}; color: ${colors.textMuted}; }
  /* "Next" is a quiet secondary action: a small muted text link, not a button */
  #next { background: transparent; color: ${colors.textMuted}; opacity: .5; font-size: 13px; padding: 10px 14px;
          border-radius: 10px; text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px;
          font-family: sans-serif; transition: opacity .25s ease; }
  #prev { background: transparent; color: ${colors.textMuted}; opacity: .5; font-size: 13px; padding: 10px 14px;
          border-radius: 10px; text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px;
          font-family: sans-serif; transition: opacity .25s ease; }
  #next:active, #prev:active { opacity: .9; }
  #next[disabled], #prev[disabled] { background: transparent; opacity: .28; text-decoration: none; }
  .navrow { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
  #lock { margin: 6px 0 0; font: 12px sans-serif; color: ${colors.textMuted}; opacity: .8; line-height: 1.5; }
${onb ? `
  /* ---- first-run tour: no next/back, and the seal is pinned to the bottom, pulsing, impossible to miss ---- */
  .next { display: none; }
  body { padding-bottom: ${onb.mode === 'read' ? 300 : 120}px; }
  ${onb.mode === 'ayah' ? '.seal-wrap { display: none; }' : `
  .seal-wrap { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; flex-direction: column; align-items: center; padding: 56px 18px 26px;
               background: linear-gradient(to bottom, transparent, ${colors.paper} 38%); }
  .seal { zoom: .7; animation: pulse 1.5s ease-out infinite !important; }
  .seal.done { animation: breathe-gold 3.4s ease-in-out infinite !important; }
  .coach { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 8px; text-align: center; font-family: sans-serif; direction: ltr; }
  .coach b { font-size: 19px; color: ${colors.darkGreen}; }
  .coach span { font-size: 14px; color: ${colors.textMuted}; line-height: 1.5; }
  .coach .arrow { width: 34px; height: 34px; fill: none; stroke: ${colors.accent}; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; animation: bob .9s ease-in-out infinite alternate; }
  .seal-wrap:has(.done) .coach { display: none; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 ${colors.accent}, 0 18px 38px -14px ${colors.accent}; } 80%,100% { box-shadow: 0 0 0 30px transparent, 0 18px 38px -14px ${colors.accent}; } }
  @keyframes bob { from { transform: translateY(-5px); } to { transform: translateY(7px); } }`}` : ''}
</style></head><body>${pages}${sealHtml}${button}
<script>
  // Native: React Native WebView bridge; web: the page runs in an iframe and posts to its parent.
  function post(m) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m);
    else window.parent.postMessage({ wird: m }, '*');
  }
  // Completion seal: pops in when scrolled to, bursts and turns gold when pressed.
  var seal = document.getElementById('seal');
  if (seal) {
    if (!seal.classList.contains('in')) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) seal.classList.add('in'); });
      }, { threshold: 0.35 }).observe(seal);
    }
    seal.addEventListener('click', function (e) {
      e.stopPropagation();
      if (seal.classList.contains('done')) return;
      seal.classList.add('done');
      var box = document.querySelector('.burst');
      var cols = ['${colors.mint}', '#F4D06F', '#FFFFFF', '${colors.accent}'];
      for (var i = 0; i < 26; i++) {
        var p = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 130;
        p.style.setProperty('--dx', Math.cos(a) * d + 'px');
        p.style.setProperty('--dy', Math.sin(a) * d + 'px');
        p.style.setProperty('--rot', Math.round(Math.random() * 540 - 270) + 'deg');
        p.style.background = cols[i % cols.length];
        p.style.animationDelay = Math.round(Math.random() * 90) + 'ms';
        box.appendChild(p);
      }
      setTimeout(function () { box.innerHTML = ''; }, 1400);
      // today's portion is done: next / back open up
      document.querySelectorAll('#prev[data-ok="1"], #next[data-ok="1"]').forEach(function (b) { b.disabled = false; });
      var lock = document.getElementById('lock'); if (lock) lock.hidden = true;
      post('done');
    });
  }
  document.getElementById('next').addEventListener('click', function (e) { e.stopPropagation(); post('next'); });
  document.getElementById('prev').addEventListener('click', function (e) { e.stopPropagation(); post('prev'); });

  // Tap an ayah to highlight it (tap it again to clear); tapping anywhere else toggles focus mode.
  // wirdSetCurrent(key, scroll) is also called from the app to follow the audio.
  var current = null;
  function paint(key, on) {
    var parts = key.split(':');
    document.querySelectorAll('.ayahPolygon[surah="' + parts[0] + '"][ayah="' + parts[1] + '"]').forEach(function (p) {
      p.setAttribute('fill', '${colors.accent}');
      p.setAttribute('fill-opacity', on ? '0.22' : '0');
    });
  }
  window.wirdSetCurrent = function (key, scroll) {
    if (current) paint(current, false);
    current = key;
    if (!key) return;
    paint(key, true);
    if (scroll) {
      var parts = key.split(':');
      var el = document.querySelector('.ayahPolygon[surah="' + parts[0] + '"][ayah="' + parts[1] + '"]');
      if (el) {
        var r = el.getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + r.top - window.innerHeight * 0.3, behavior: 'smooth' });
      }
    }
  };
  // A mostly-horizontal swipe moves to the next/previous screen (the app loops across its three tabs).
  var sx = 0, sy = 0, st = 0;
  document.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; st = Date.now(); });
  document.addEventListener('pointerup', function (e) {
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy) && Date.now() - st < 900) post(dx < 0 ? 'swipe:left' : 'swipe:right');
  });
  document.addEventListener('click', function (e) {
    var p = e.target.closest ? e.target.closest('.ayahPolygon') : null;
    if (!p) { post('tap'); return; }
    var key = p.getAttribute('surah') + ':' + p.getAttribute('ayah');
    window.wirdSetCurrent(current === key ? null : key, false);
    post('ayah:' + (current || ''));
  });
</script></body></html>`;
}

export default function ReaderScreen() {
  const { colors } = useTheme();
  const { t, lang } = useI18n();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { thumnIndex: index, setThumnIndex: setIndex, mode } = usePortion(); // portion setting, shared with the Tafsir tab
  const step = mode === 'rub' ? 2 : 1; // thumn steps per portion
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { focused, setFocused } = useFocusMode();
  const { finish, stageOf } = useGarden();
  const onb = useOnboarding();
  const tour = onb.step === 'read' || onb.step === 'ayah' ? onb.step : null;

  const webRef = useRef<PageViewHandle>(null);
  const [ayahs, setAyahs] = useState<AyahRef[]>([]);
  const selected = useRef<string | null>(null); // ayah the user last tapped
  const [cardH, setCardH] = useState(0); // height of the tour card, so the page starts below it
  const [tafsirKey, setTafsirKey] = useState<string | null>(null); // ayah whose tafsir sheet is open

  // Move the page highlight (and scroll) to the ayah being recited.
  const follow = (a: AyahRef | null) => {
    const arg = a ? JSON.stringify(ayahKey(a)) : 'null';
    webRef.current?.inject(`window.wirdSetCurrent(${arg}, true); true;`);
  };
  const player = useAyahPlayer(ayahs, follow, tour === 'ayah');

  // Entering the Reader starts in focus mode (no tab bar, no status bar).
  useEffect(() => {
    if (isFocused) setFocused(true);
  }, [isFocused, setFocused]);
  useEffect(() => {
    setStatusBarHidden(isFocused && focused, 'fade');
    return () => setStatusBarHidden(false, 'fade');
  }, [isFocused, focused]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        player.stop();
        selected.current = null;
        setTafsirKey(null);
        setHtml(null);
        const { start, end } = tour ? FATIHA : portionAt(mode, index);
        const out: string[] = [];
        const list: AyahRef[] = [];
        for (let p = start.page; p <= end.page; p++) {
          const svg = await loadSvg(PAGE_SVGS[p]);
          const inRange = selectRange(PAGE_JSONS[p], start, end);
          for (const e of inRange) {
            const r = { surah: e.surahNumber, ayah: e.ayahNumber };
            if (!list.some((x) => ayahKey(x) === ayahKey(r))) list.push(r);
          }
          const zones = headerZones(PAGE_JSONS[p], inRange, INK_TOP[String(p)]);
          const others = PAGE_JSONS[p].filter((e) => !inRange.includes(e)).map((e) => e.polygon);
          out.push(cropSvg(svg, inRange.map((e) => e.polygon), { width: STRIP_WIDTH, zones, cover: others, paper: colors.paper }));
        }
        const first = Math.floor(index / step) * step; // the portion's thumns: one in thomon mode, two in rub' mode
        const done = tour ? tour === 'ayah' : Array.from({ length: step }, (_, k) => first + k).every((i) => stageOf(i) === MAX_STAGE);
        const nextIndex = first + step;
        const next = nextIndex < 480 ? portionAt(mode, nextIndex) : null;
        const noun = t(mode === 'rub' ? 'reader.noun.rub' : 'reader.noun.thumn');
        const hasNext = !!next && next.end.page <= BUNDLED_PAGES;
        const label = !next
          ? t('reader.end')
          : hasNext
            ? t('reader.next', { noun, n: next.n })
            : t('reader.notBundled', { noun, n: next.n });
        const first0 = first; // previous portion starts one step back
        const prevIndex = first0 - step;
        const prev = prevIndex >= 0 ? portionAt(mode, prevIndex) : null;
        const prevLabel = prev ? t('reader.prev', { noun, n: prev.n }) : '';
        if (!cancelled) {
          setAyahs(list);
          const text: SealText = tour
            ? { title: t('onb.read.seal.t'), sub: t('onb.read.seal.s'), doneTitle: t('seal.doneTitle'), doneSub: t('seal.doneSub') }
            : sealText(t, mode, portionAt(mode, index).n);
          setHtml(buildHtml(out, { label, enabled: hasNext, prevLabel, hasPrev: !!prev, lockedHint: t('reader.locked') }, colors, { text, done },
            tour ? { mode: tour, title: t('onb.read.title'), text: t('onb.read.text') } : null));
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mode, colors, lang, tour]);

  const onMessage = (msg: string) => {
    if (tour) {
      // first-run tour: only the seal (step 'read') and tapping an ayah (step 'ayah') do anything
      if (msg === 'done' && tour === 'read') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setTimeout(() => {
          onb.next(); // the maple gift fades in over the Reader; the Garden opens unseen behind it
        }, 600);
      } else if (msg.startsWith('ayah:') && tour === 'ayah') {
        selected.current = msg.slice(5) || null;
        setTafsirKey(selected.current);
        if (selected.current) player.jumpTo(selected.current);
      }
      return;
    }
    // next / back only work once today's portion is sealed (the page keeps them disabled until then; this is the safety net)
    const first = Math.floor(index / step) * step;
    const sealed = Array.from({ length: step }, (_, k) => first + k).every((i) => stageOf(i) === MAX_STAGE);
    if (msg === 'next') {
      if (sealed) setIndex(first + step);
    } else if (msg === 'prev') {
      if (sealed && first - step >= 0) setIndex(first - step);
    } else if (msg === 'done') {
      // the completion seal: a little buzz, and the whole portion grows its plant
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const first = Math.floor(index / step) * step;
      finish(Array.from({ length: step }, (_, k) => first + k));
    } else if (msg === 'tap') setFocused((f) => !f);
    else if (msg === 'swipe:left') swipeNavigate('left');
    else if (msg === 'swipe:right') swipeNavigate('right');
    else if (msg.startsWith('ayah:')) {
      selected.current = msg.slice(5) || null;
      setTafsirKey(selected.current); // tapping an ayah opens its tafsir; un-highlighting closes it
      if (selected.current) player.jumpTo(selected.current); // while playing, a tap jumps there
    }
  };

  const closeTafsir = () => {
    selected.current = null;
    setTafsirKey(null);
    webRef.current?.inject('window.wirdSetCurrent(null, false); true;');
  };

  // Keep clear of the camera cutout / notch, plus a little breathing room.
  const topPad = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0) + 16;

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!html) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return (
    <View style={[styles.container, { paddingTop: topPad + (tour === 'ayah' ? cardH + 8 : 0) }]}>
      <PageView ref={webRef} key={`${mode}-${index}-${tour ?? ''}`} html={html} onMessage={onMessage} style={styles.web} />
      {ayahs.some(hasAudio) && (
        <View
          style={[styles.player, { bottom: insets.bottom + 24 + (tafsirKey ? SHEET_HEIGHT : 0) }]}
          pointerEvents="box-none"
        >
          {player.state !== 'idle' && (
            <Pressable onPress={player.stop} style={[styles.fab, styles.fabSmall]} accessibilityLabel={t('reader.stop')}>
              <Text style={styles.fabText}>■</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => player.toggle(selected.current)}
            style={styles.fab}
            accessibilityLabel={player.state === 'playing' ? t('reader.pause') : t('reader.play')}
          >
            <Text style={styles.fabText}>{player.state === 'playing' ? '❚❚' : '▶'}</Text>
          </Pressable>
        </View>
      )}
      <TafsirSheet ayahKey={tafsirKey} onClose={closeTafsir} />
      {tour === 'ayah' && (
        <CoachCard
          top={topPad}
          onHeight={setCardH}
          title={t('onb.ayah.title')}
          text={tafsirKey ? t('onb.ayah.text2') : t('onb.ayah.text')}
          button={t('onb.continue')}
          onPress={() => {
            closeTafsir();
            player.stop();
            onb.next(); // on to the seal
          }}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  web: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, padding: 24 },
  error: { color: colors.textMuted, textAlign: 'center' },
  player: { position: 'absolute', right: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.darkGreen },
  fabText: { color: colors.onAccent, fontSize: 20 },
});
