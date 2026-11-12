import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AYAH_AUDIO } from '../data/audioAssets';

export type AyahRef = { surah: number; ayah: number };
export type PlayerState = 'idle' | 'playing' | 'paused';

export const ayahKey = (a: AyahRef) => `${a.surah}:${a.ayah}`;
export const hasAudio = (a: AyahRef) => ayahKey(a) in AYAH_AUDIO;

/**
 * Plays the given ayahs one after another from the local MP3s and reports the current ayah.
 * Ayahs without a local MP3 are skipped.
 */
export function useAyahPlayer(ayahs: AyahRef[], onAyah: (a: AyahRef | null) => void) {
  const [state, setState] = useState<PlayerState>('idle');
  const stateRef = useRef<PlayerState>('idle');
  const player = useRef<AudioPlayer | null>(null);
  const idx = useRef(-1);
  const list = useRef(ayahs);
  list.current = ayahs;
  const cb = useRef(onAyah);
  cb.current = onAyah;
  const playAtRef = useRef<(from: number) => void>(() => {});

  const set = (s: PlayerState) => {
    stateRef.current = s;
    setState(s);
  };

  const ensure = () => {
    if (!player.current) {
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
      const p = createAudioPlayer();
      p.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish && stateRef.current === 'playing') playAtRef.current(idx.current + 1);
      });
      player.current = p;
    }
    return player.current;
  };

  const stop = useCallback(() => {
    player.current?.pause();
    idx.current = -1;
    set('idle');
    cb.current(null);
  }, []);

  playAtRef.current = (from: number) => {
    const l = list.current;
    let i = from;
    while (i < l.length && !hasAudio(l[i])) i++;
    if (i >= l.length) return stop();
    idx.current = i;
    const p = ensure();
    p.replace(AYAH_AUDIO[ayahKey(l[i])]);
    p.play();
    set('playing');
    cb.current(l[i]);
  };

  /** idle: start at `startKey` (or the first ayah); playing: pause; paused: resume. */
  const toggle = useCallback((startKey?: string | null) => {
    if (stateRef.current === 'playing') {
      player.current?.pause();
      set('paused');
    } else if (stateRef.current === 'paused') {
      player.current?.play();
      set('playing');
    } else {
      const i = startKey ? list.current.findIndex((a) => ayahKey(a) === startKey) : 0;
      playAtRef.current(Math.max(i, 0));
    }
  }, []);

  /** While active, jump playback to the given ayah. */
  const jumpTo = useCallback((key: string) => {
    if (stateRef.current === 'idle') return;
    const i = list.current.findIndex((a) => ayahKey(a) === key);
    if (i >= 0) playAtRef.current(i);
  }, []);

  useEffect(
    () => () => {
      player.current?.remove();
      player.current = null;
    },
    [],
  );

  return { state, toggle, stop, jumpTo };
}
