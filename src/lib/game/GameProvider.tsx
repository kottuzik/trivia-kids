"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { usePreferences } from "@/lib/preferences";
import { fetchQuestion, toClientErrorCode } from "./api";
import {
  gameReducer,
  initialGameState,
  needsQuestion,
  type GameSettings,
  type GameState,
} from "./engine";
import type { AnswerId } from "./schemas";

type GameValue = {
  state: GameState;
  startGame: (settings: GameSettings) => void;
  answer: (answerId: AnswerId) => void;
  next: () => void;
  retry: () => void;
  reset: () => void;
};

const GameContext = createContext<GameValue | null>(null);

// Holds the game in memory so moving between screens keeps it (persistence comes in Milestone 3).
export function GameProvider({ children }: { children: ReactNode }) {
  const { locale, ageGroup } = usePreferences();
  const [state, dispatch] = useReducer(gameReducer, initialGameState);

  // Latest values for the async loader, which runs outside of render.
  const stateRef = useRef(state);
  const preferencesRef = useRef({ locale, ageGroup });
  useEffect(() => {
    stateRef.current = state;
    preferencesRef.current = { locale, ageGroup };
  });

  // Each question uses the language and age group chosen at the moment it is requested.
  const loadQuestion = useCallback(async (game: GameState) => {
    const { gameId, settings, seenFingerprints } = game;
    const { locale: currentLocale, ageGroup: currentAgeGroup } = preferencesRef.current;
    if (!settings) return;
    if (!currentAgeGroup) {
      dispatch({ type: "REQUEST_FAILED", gameId, code: "INVALID_INPUT" });
      return;
    }

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
    } catch (error) {
      dispatch({ type: "REQUEST_FAILED", gameId, code: toClientErrorCode(error) });
    }
  }, []);

  const startGame = useCallback(
    (settings: GameSettings) => {
      const started = gameReducer(stateRef.current, { type: "START", settings });
      dispatch({ type: "START", settings });
      void loadQuestion(started);
    },
    [loadQuestion],
  );

  const next = useCallback(() => {
    const moved = gameReducer(stateRef.current, { type: "NEXT" });
    dispatch({ type: "NEXT" });
    if (needsQuestion(moved)) void loadQuestion(moved);
  }, [loadQuestion]);

  const retry = useCallback(() => {
    const current = stateRef.current;
    if (current.status === "playing" && current.request.state === "error") void loadQuestion(current);
  }, [loadQuestion]);

  const answer = useCallback((answerId: AnswerId) => dispatch({ type: "ANSWER", answerId }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const value = useMemo(
    () => ({ state, startGame, answer, next, retry, reset }),
    [state, startGame, answer, next, retry, reset],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error("useGame must be used inside GameProvider");
  return value;
}
