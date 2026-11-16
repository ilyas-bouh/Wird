import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { hasLocalAudio, localAudioUris } from './localResources';

export type AyahRef = { surah: number; ayah: number };
export type PlayerState = 'idle' | 'playing' | 'paused';

export const ayahKey = (a: AyahRef) => `${a.surah}:${a.ayah}`;
export const hasAudio = (a: AyahRef) => hasLocalAudio();

/**
 * Plays the given ayahs one after another from the local MP3s and reports the current ayah.
 * Ayahs without a local MP3 are skipped.
 */
export function useAyahPlayer(ayahs: AyahRef[], onAyah: (a: AyahRef | null) => void, single = false) {
  const [state, setState] = useState<PlayerState>('idle');
  const stateRef = useRef<PlayerState>('idle');
  const player = useRef<AudioPlayer | null>(null);
  const idx = useRef(-1);
  const sub = useRef(0); // which file of the current ayah (a Warsh ayah can span two Hafs-cut files)
  const files = useRef<string[]>([]);
  const list = useRef(ayahs);
  list.current = ayahs;
  const singleRef = useRef(single); // play just the chosen ayah, then stop
  singleRef.current = single;
  const cb = useRef(onAyah);
  cb.current = onAyah;
  const stopRef = useRef<() => void>(() => {});
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
        if (status.didJustFinish && stateRef.current === 'playing') {
          if (sub.current + 1 < files.current.length) {
            sub.current += 1;
            player.current?.replace(files.current[sub.current]);
            player.current?.play();
          } else if (singleRef.current) stopRef.current();
          else playAtRef.current(idx.current + 1);
        }
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

  stopRef.current = stop;
  playAtRef.current = (from: number) => {
    const l = list.current;
    let i = from;
    while (i < l.length && !localAudioUris(l[i].surah, l[i].ayah).length) i++;
    if (i >= l.length) return stop();
    idx.current = i;
    files.current = localAudioUris(l[i].surah, l[i].ayah);
    sub.current = 0;
    const p = ensure();
    p.replace(files.current[0]);
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
