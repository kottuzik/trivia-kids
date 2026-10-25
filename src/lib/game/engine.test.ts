import { describe, expect, it } from "vitest";
import {
  canSkip,
  gameReducer,
  initialGameState,
  isLastQuestion,
  needsQuestion,
  skipsLeft,
  successRate,
  type GameState,
} from "./engine";
import type { Question, QuestionLimit } from "./schemas";

function makeQuestion(n: number): Question {
  return {
    id: `q${n}`,
    text: `Question ${n}?`,
    answers: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
      { id: "d", text: "D" },
    ],
    correctAnswerId: "b",
    explanation: "Because.",
    fingerprint: `question ${n}`,
    topic: "space",
    locale: "en",
    ageGroup: "10-12",
    difficulty: "easy",
  };
}

function start(limit: QuestionLimit = 5) {
  return gameReducer(initialGameState, {
    type: "START",
    settings: { topic: "space", difficulty: "easy", questionLimit: limit },
  });
}

function load(state: GameState, n: number) {
  return gameReducer(state, { type: "QUESTION_LOADED", gameId: state.gameId, question: makeQuestion(n) });
}

// Plays a full game, answering correctly on the given question numbers.
function play(limit: QuestionLimit, correctOn: Set<number>) {
  let state = start(limit);
  for (let n = 1; n <= limit; n++) {
    expect(needsQuestion(state)).toBe(true);
    state = load(state, n);
    state = gameReducer(state, { type: "ANSWER", answerId: correctOn.has(n) ? "b" : "a" });
    state = gameReducer(state, { type: "NEXT" });
  }
  return state;
}

describe("gameReducer", () => {
  it("starts a game that needs its first question", () => {
    const state = start();
    expect(state.status).toBe("playing");
    expect(state.gameId).toBe(1);
    expect(needsQuestion(state)).toBe(true);
  });

  it("accepts only one answer per question", () => {
    let state = load(start(), 1);
    state = gameReducer(state, { type: "ANSWER", answerId: "a" });
    const again = gameReducer(state, { type: "ANSWER", answerId: "b" });
    expect(again).toBe(state);
    expect(state.completedCount).toBe(1);
    expect(state.correctCount).toBe(0);
    expect(state.answeredQuestions[0]).toMatchObject({ selectedAnswerId: "a", isCorrect: false });
  });

  it("does not move on before the question is answered", () => {
    const state = load(start(), 1);
    expect(gameReducer(state, { type: "NEXT" })).toBe(state);
  });

  it.each([5, 10, 15] as const)("shows the summary after %i answered questions", (limit) => {
    const correct = new Set([1, 2, 4]);
    const state = play(limit, correct);
    expect(state.status).toBe("summary");
    expect(state.completedCount).toBe(limit);
    expect(state.correctCount).toBe(3);
    expect(successRate(state)).toBe(Math.round((3 / limit) * 100));
    expect(state.answeredQuestions.filter((item) => !item.isCorrect)).toHaveLength(limit - 3);
    expect(state.seenFingerprints).toHaveLength(limit);
  });

  it("marks the last question so the button can say 'to summary'", () => {
    let state = start(5);
    for (let n = 1; n <= 4; n++) {
      state = gameReducer(load(state, n), { type: "ANSWER", answerId: "b" });
      expect(isLastQuestion(state)).toBe(false);
      state = gameReducer(state, { type: "NEXT" });
    }
    state = gameReducer(load(state, 5), { type: "ANSWER", answerId: "b" });
    expect(isLastQuestion(state)).toBe(true);
  });

  it("keeps score and progress when a question fails to load", () => {
    let state = gameReducer(load(start(), 1), { type: "ANSWER", answerId: "b" });
    state = gameReducer(state, { type: "NEXT" });
    state = gameReducer(state, { type: "REQUEST_START", gameId: state.gameId });
    state = gameReducer(state, { type: "REQUEST_FAILED", gameId: state.gameId, code: "AI_UNAVAILABLE" });
    expect(state.request).toEqual({ state: "error", code: "AI_UNAVAILABLE" });
    expect(state.completedCount).toBe(1);
    expect(state.correctCount).toBe(1);
    expect(state.seenFingerprints).toHaveLength(1);

    state = load(state, 2);
    expect(state.request).toEqual({ state: "idle" });
    expect(state.completedCount).toBe(1);
  });

  it("returns to setup when the first question's topic is unsuitable", () => {
    let state = start();
    state = gameReducer(state, { type: "REQUEST_FAILED", gameId: state.gameId, code: "UNSAFE_TOPIC" });
    expect(state.status).toBe("setup");
    expect(state.setupError).toBe("UNSAFE_TOPIC");
    expect(state.settings?.topic).toBe("space");
  });

  it("shows an error (not setup) for an unsuitable topic later in the game", () => {
    let state = gameReducer(load(start(), 1), { type: "ANSWER", answerId: "b" });
    state = gameReducer(state, { type: "NEXT" });
    state = gameReducer(state, { type: "REQUEST_FAILED", gameId: state.gameId, code: "UNSAFE_TOPIC" });
    expect(state.status).toBe("playing");
    expect(state.request).toEqual({ state: "error", code: "UNSAFE_TOPIC" });
  });

  it("ignores responses that belong to an earlier game", () => {
    const first = start();
    const reset = gameReducer(first, { type: "RESET" });
    const late = gameReducer(reset, { type: "QUESTION_LOADED", gameId: first.gameId, question: makeQuestion(1) });
    expect(late).toBe(reset);
    expect(reset.status).toBe("setup");
    expect(reset.settings?.topic).toBe("space");
  });

  it("allows three skips that replace the question without changing score or progress", () => {
    let state = gameReducer(load(start(), 1), { type: "ANSWER", answerId: "b" });
    state = gameReducer(state, { type: "NEXT" });
    for (let n = 2; n <= 4; n++) {
      state = load(state, n);
      expect(canSkip(state)).toBe(true);
      state = gameReducer(state, { type: "SKIP" });
      expect(state.currentQuestion).toBeNull();
      expect(needsQuestion(state)).toBe(true);
    }
    expect(state.skipCount).toBe(3);
    expect(skipsLeft(state)).toBe(0);
    expect(state.completedCount).toBe(1);
    expect(state.correctCount).toBe(1);
    expect(state.answeredQuestions).toHaveLength(1);
    // Skipped questions stay "seen" so they are not asked again.
    expect(state.seenFingerprints).toEqual(["question 1", "question 2", "question 3", "question 4"]);

    state = load(state, 5);
    expect(canSkip(state)).toBe(false);
    expect(gameReducer(state, { type: "SKIP" })).toBe(state);
  });

  it("does not allow skipping an answered question", () => {
    const state = gameReducer(load(start(), 1), { type: "ANSWER", answerId: "a" });
    expect(gameReducer(state, { type: "SKIP" })).toBe(state);
  });

  it("does not spend another skip when the replacement fails and is retried", () => {
    let state = gameReducer(load(start(), 1), { type: "SKIP" });
    state = gameReducer(state, { type: "REQUEST_START", gameId: state.gameId });
    state = gameReducer(state, { type: "REQUEST_FAILED", gameId: state.gameId, code: "NETWORK" });
    expect(state.skipCount).toBe(1);
    state = gameReducer(state, { type: "REQUEST_START", gameId: state.gameId });
    state = load(state, 2);
    expect(state.skipCount).toBe(1);
    expect(state.currentQuestion?.id).toBe("q2");
  });

  it("applies new settings to the next question only", () => {
    let state = load(start(10), 1);
    const question = state.currentQuestion;
    state = gameReducer(state, { type: "UPDATE_SETTINGS", settings: { topic: "dinosaurs", difficulty: "hard" } });
    expect(state.currentQuestion).toBe(question);
    expect(state.settings).toEqual({ topic: "dinosaurs", difficulty: "hard", questionLimit: 10 });

    state = gameReducer(state, { type: "ANSWER", answerId: "b" });
    state = gameReducer(state, { type: "UPDATE_SETTINGS", settings: { topic: "music", difficulty: "easy" } });
    expect(state.selectedAnswerId).toBe("b");
    expect(state.completedCount).toBe(1);
    expect(state.correctCount).toBe(1);
    expect(state.settings?.topic).toBe("music");
  });

  it("resets skips for a new game", () => {
    let state = gameReducer(load(start(), 1), { type: "SKIP" });
    expect(gameReducer(state, { type: "RESET" }).skipCount).toBe(0);
    state = gameReducer(state, { type: "START", settings: { topic: "x", difficulty: "easy", questionLimit: 5 } });
    expect(state.skipCount).toBe(0);
  });

  it("restores a saved state as is", () => {
    const saved = gameReducer(load(start(), 1), { type: "ANSWER", answerId: "a" });
    expect(gameReducer(initialGameState, { type: "RESTORE", state: saved })).toBe(saved);
  });
});
