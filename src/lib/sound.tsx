"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

export type SoundName = "correct" | "wrong" | "transition";

type SoundValue = {
  soundEnabled: boolean;
  toggleSound: () => void;
  play: (name: SoundName) => void;
};

const STORAGE_KEY = "soundEnabled";
const listeners = new Set<() => void>();

function readEnabled() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// Short notes as [frequency Hz, start s, duration s]. Generated with Web Audio: no sound files.
const NOTES: Record<SoundName, [number, number, number][]> = {
  correct: [
    [660, 0, 0.12],
    [880, 0.1, 0.2],
  ],
  wrong: [
    [330, 0, 0.16],
    [247, 0.14, 0.24],
  ],
  transition: [[520, 0, 0.08]],
};

let audioContext: AudioContext | null = null;

function playNotes(name: SoundName) {
  try {
    audioContext ??= new AudioContext();
    const context = audioContext;
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    for (const [frequency, start, duration] of NOTES[name]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = name === "wrong" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      // Soft attack and release so the notes don't click.
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.12, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + start);
      oscillator.stop(now + start + duration + 0.02);
    }
  } catch {
    // No audio available: feedback is always shown as text and icons too.
  }
}

const SoundContext = createContext<SoundValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  // The server can't read localStorage, so it assumes the default (on).
  const soundEnabled = useSyncExternalStore(subscribe, readEnabled, () => true);

  const toggleSound = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(!readEnabled()));
    } catch {
      // Without storage the choice can't be kept; nothing else to do.
    }
    listeners.forEach((listener) => listener());
  }, []);

  const play = useCallback((name: SoundName) => {
    if (readEnabled()) playNotes(name);
  }, []);

  const value = useMemo(() => ({ soundEnabled, toggleSound, play }), [soundEnabled, toggleSound, play]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const value = useContext(SoundContext);
  if (!value) throw new Error("useSound must be used inside SoundProvider");
  return value;
}
