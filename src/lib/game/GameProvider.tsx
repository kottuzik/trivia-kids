"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePreferences } from "@/lib/preferences";
import { useSound } from "@/lib/sound";
import { fetchQuestion, toClientErrorCode } from "./api";
import {
  gameReducer,
  initialGameState,
  needsQuestion,
  type GameSettings,
  type GameState,
} from "./engine";
import type { AnswerId } from "./schemas";
import { loadGame, saveGame } from "./storage";

type GameValue = {
  state: GameState;
  // False until the saved game (if any) has been read from the device.
  hydrated: boolean;
  hasActiveGame: boolean;
  startGame: (settings: GameSettings) => void;
  answer: (answerId: AnswerId) => void;
  next: () => void;
  // Returns false (and spends nothing) when there is no connection to load a replacement.
  skip: () => boolean;
  updateSettings: (settings: Pick<GameSettings, "topic" | "difficulty">) => void;
  retry: () => void;
  reset: () => void;
};

const GameContext = createContext<GameValue | null>(null);

// Identifies "the question this game is waiting for", so the same one is never requested twice.
function requestKey(game: GameState) {
  return `${game.gameId}:${game.completedCount}:${game.skipCount}:${game.seenFingerprints.length}`;
}

// Holds the game, saves it on the device after every change and restores it on load.
export function GameProvider({ children }: { children: ReactNode }) {
  const { locale, ageGroup } = usePreferences();
  const { play } = useSound();
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [hydrated, setHydrated] = useState(false);

  // Latest values for the async loader, which runs outside of render.
  const stateRef = useRef(state);
  const preferencesRef = useRef({ locale, ageGroup });
  const playRef = useRef(play);
  const inFlightRef = useRef<string | null>(null);
  useEffect(() => {
    stateRef.current = state;
    preferencesRef.current = { locale, ageGroup };
    playRef.current = play;
  });

  useEffect(() => {
    let cancelled = false;
    void loadGame().then((saved) => {
      if (cancelled) return;
      if (saved) dispatch({ type: "RESTORE", state: saved });
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hydrated) void saveGame(state);
  }, [hydrated, state]);

  // Each question uses the settings and preferences chosen at the moment it is requested.
  const loadQuestion = useCallback(async (game: GameState) => {
    const { gameId, settings, seenFingerprints } = game;
    const { locale: currentLocale, ageGroup: currentAgeGroup } = preferencesRef.current;
    if (!settings) return;
    const key = requestKey(game);
    if (inFlightRef.current === key) return;
    if (!currentAgeGroup) {
      dispatch({ type: "REQUEST_FAILED", gameId, code: "INVALID_INPUT" });
      return;
    }

    inFlightRef.current = key;
    dispatch({ type: "REQUEST_START", gameId });
    try {
      const question = await fetchQuestion({
        topic: settings.topic,
        difficulty: settings.difficulty,
        locale: currentLocale,
        ageGroup: currentAgeGroup,
        seenQuestionFingerprints: seenFingerprints,
      });
      dispatch({ type: "QUESTION_LOADED", gameId, question });
      if (stateRef.current.gameId === gameId) playRef.current("transition");
    } catch (error) {
      dispatch({ type: "REQUEST_FAILED", gameId, code: toClientErrorCode(error) });
    } finally {
      if (inFlightRef.current === key) inFlightRef.current = null;
    }
  }, []);

  // One place requests questions: game start, next, skip and a restored game all end up here.
  useEffect(() => {
    if (hydrated && needsQuestion(state)) void loadQuestion(state);
  }, [hydrated, state, loadQuestion]);

  const retry = useCallback(() => {
    const current = stateRef.current;
    if (current.status === "playing" && current.request.state === "error") void loadQuestion(current);
  }, [loadQuestion]);

  // When the connection comes back, continue by itself instead of waiting for "try again".
  useEffect(() => {
    function onOnline() {
      const { request } = stateRef.current;
      if (request.state === "error" && request.code === "NETWORK") retry();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [retry]);

  const startGame = useCallback((settings: GameSettings) => dispatch({ type: "START", settings }), []);
  const next = useCallback(() => dispatch({ type: "NEXT" }), []);
  const answer = useCallback((answerId: AnswerId) => dispatch({ type: "ANSWER", answerId }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const updateSettings = useCallback(
    (settings: Pick<GameSettings, "topic" | "difficulty">) =>
      dispatch({ type: "UPDATE_SETTINGS", settings }),
    [],
  );
  const skip = useCallback(() => {
    if (navigator.onLine === false) return false;
    dispatch({ type: "SKIP" });
    return true;
  }, []);

  const hasActiveGame = state.status === "playing";

  const value = useMemo(
    () => ({ state, hydrated, hasActiveGame, startGame, answer, next, skip, updateSettings, retry, reset }),
    [state, hydrated, hasActiveGame, startGame, answer, next, skip, updateSettings, retry, reset],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error("useGame must be used inside GameProvider");
  return value;
}
