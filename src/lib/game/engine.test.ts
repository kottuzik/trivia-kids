import { describe, expect, it } from "vitest";
import { gameReducer, initialGameState, isLastQuestion, needsQuestion, successRate, type GameState } from "./engine";
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
});
