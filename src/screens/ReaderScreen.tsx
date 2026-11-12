import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StatusBar as RNStatusBar, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { setStatusBarHidden } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageView, { type PageViewHandle } from '../components/PageView';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { colors } from '../theme/colors';
import TafsirSheet, { SHEET_HEIGHT } from '../components/TafsirSheet';
import { useFocusMode } from '../context/FocusContext';
import { usePortion } from '../context/PortionContext';
import { textStyleCss } from '../theme/reading';
import { cropSvg, headerZones, selectRange } from '../lib/cropSvg';
import { ayahKey, hasAudio, useAyahPlayer, type AyahRef } from '../lib/useAyahPlayer';
import { portionAt } from '../lib/ranges';
import { swipeNavigate } from '../lib/swipeNav';
import pageInk from '../data/pageInk.json';
import { BUNDLED_PAGES, PAGE_JSONS, PAGE_SVGS } from '../data/pageAssets';

// Every page is cropped to the same width so the stacked pages share one scale.
const STRIP_WIDTH = 331;
const INK_TOP = pageInk as Record<string, number>;

async function loadSvg(module: number) {
  const asset = Asset.fromModule(module);
  if (Platform.OS === 'web') return (await fetch(asset.uri)).text();
  await asset.downloadAsync();
  return new File(asset.localUri ?? asset.uri).text();
}

function buildHtml(svgs: string[], next: { label: string; enabled: boolean }) {
  const pages = svgs.map((s) => `<section class="page">${s.replace(/<\?xml[^>]*\?>/, '')}</section>`).join('');
  const button = `<div class="next"><button id="next" ${next.enabled ? '' : 'disabled'}>${next.label}</button></div>`;
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin: 0; background: ${colors.paper}; touch-action: pan-y; }
  .page { padding: 0 10px; margin: 0; line-height: 0; }
  svg { display: block; width: 100%; height: auto; }
  svg path:not(.ayahPolygon) { pointer-events: none; }
  #content, #ayah_markers { pointer-events: none; }${textStyleCss()}
  .next { padding: 28px 24px 120px; text-align: center; }
  button { font-size: 17px; padding: 14px 28px; border: 0; border-radius: 999px;
           background: ${colors.accent}; color: #fff; font-family: sans-serif; }
  button[disabled] { background: ${colors.mint}; color: ${colors.textMuted}; }
</style></head><body>${pages}${button}
<script>
  // Native: React Native WebView bridge; web: the page runs in an iframe and posts to its parent.
  function post(m) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m);
    else window.parent.postMessage({ wird: m }, '*');
  }
  var b = document.getElementById('next');
  b.addEventListener('click', function (e) { e.stopPropagation(); post('next'); });

  // Tap an ayah to highlight it (tap it again to clear); tapping anywhere else toggles focus mode.
  // wirdSetCurrent(key, scroll) is also called from the app to follow the audio.
  var current = null;
  function paint(key, on) {
    var parts = key.split(':');
    document.querySelectorAll('.ayahPolygon[surah="' + parts[0] + '"][ayah="' + parts[1] + '"]').forEach(function (p) {
      p.setAttribute('fill', '#2E7D32');
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
  const { thumnIndex: index, setThumnIndex: setIndex, mode } = usePortion(); // portion setting, shared with the Tafsir tab
  const step = mode === 'rub' ? 2 : 1; // thumn steps per portion
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { focused, setFocused } = useFocusMode();

  const webRef = useRef<PageViewHandle>(null);
  const [ayahs, setAyahs] = useState<AyahRef[]>([]);
  const selected = useRef<string | null>(null); // ayah the user last tapped
  const [tafsirKey, setTafsirKey] = useState<string | null>(null); // ayah whose tafsir sheet is open

  // Move the page highlight (and scroll) to the ayah being recited.
  const follow = (a: AyahRef | null) => {
    const arg = a ? JSON.stringify(ayahKey(a)) : 'null';
    webRef.current?.inject(`window.wirdSetCurrent(${arg}, true); true;`);
  };
  const player = useAyahPlayer(ayahs, follow);

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
        const { start, end } = portionAt(mode, index);
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
        const nextIndex = Math.floor(index / step) * step + step;
        const next = nextIndex < 480 ? portionAt(mode, nextIndex) : null;
        const noun = mode === 'rub' ? "rub'" : 'thomon';
        const hasNext = !!next && next.end.page <= BUNDLED_PAGES;
        const label = !next
          ? 'End of the Quran'
          : hasNext
            ? `Next ${noun} (${next.n})`
            : `${noun[0].toUpperCase()}${noun.slice(1)} ${next.n}: pages not bundled yet`;
        if (!cancelled) {
          setAyahs(list);
          setHtml(buildHtml(out, { label, enabled: hasNext }));
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mode]);

  const onMessage = (msg: string) => {
    if (msg === 'next') setIndex((i) => Math.floor(i / step) * step + step);
    else if (msg === 'tap') setFocused((f) => !f);
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
    <View style={[styles.container, { paddingTop: topPad }]}>
      <PageView ref={webRef} key={`${mode}-${index}`} html={html} onMessage={onMessage} style={styles.web} />
      {ayahs.some(hasAudio) && (
        <View
          style={[styles.player, { bottom: insets.bottom + 24 + (tafsirKey ? SHEET_HEIGHT : 0) }]}
          pointerEvents="box-none"
        >
          {player.state !== 'idle' && (
            <Pressable onPress={player.stop} style={[styles.fab, styles.fabSmall]} accessibilityLabel="Stop">
              <Text style={styles.fabText}>■</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => player.toggle(selected.current)}
            style={styles.fab}
            accessibilityLabel={player.state === 'playing' ? 'Pause' : 'Play'}
          >
            <Text style={styles.fabText}>{player.state === 'playing' ? '❚❚' : '▶'}</Text>
          </Pressable>
        </View>
      )}
      <TafsirSheet ayahKey={tafsirKey} onClose={closeTafsir} />
    </View>
  );
}

const styles = StyleSheet.create({
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
  fabText: { color: '#fff', fontSize: 20 },
});
