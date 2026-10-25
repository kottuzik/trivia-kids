import { describe, expect, it } from "vitest";
import { gameReducer, initialGameState, type GameState } from "./engine";
import type { Question } from "./schemas";
import { SCHEMA_VERSION, fromPersisted, toPersisted } from "./storage";

const question: Question = {
  id: "q1",
  text: "Which planet is red?",
  answers: [
    { id: "a", text: "Venus" },
    { id: "b", text: "Mars" },
    { id: "c", text: "Earth" },
    { id: "d", text: "Saturn" },
  ],
  correctAnswerId: "b",
  explanation: "Iron oxide makes Mars look red.",
  fingerprint: "which planet is red",
  topic: "space",
  locale: "en",
  ageGroup: "10-12",
  difficulty: "easy",
};

function playingState(): GameState {
  let state = gameReducer(initialGameState, {
    type: "START",
    settings: { topic: "space", difficulty: "easy", questionLimit: 5 },
  });
  state = gameReducer(state, { type: "QUESTION_LOADED", gameId: state.gameId, question });
  return gameReducer(state, { type: "ANSWER", answerId: "a" });
}

describe("saved game", () => {
  it("round-trips a game with an answered question", () => {
    const state = playingState();
    expect(fromPersisted(toPersisted(state))).toEqual(state);
  });

  it("asks again for a question that was loading when the app closed", () => {
    const state: GameState = { ...playingState(), currentQuestion: null, request: { state: "loading" } };
    expect(fromPersisted(toPersisted(state))?.request).toEqual({ state: "idle" });
  });

  it("keeps a failed request as an error to retry", () => {
    const state: GameState = { ...playingState(), request: { state: "error", code: "NETWORK" } };
    expect(fromPersisted(toPersisted(state))?.request).toEqual({ state: "error", code: "NETWORK" });
  });

  it.each([
    ["nothing saved", undefined],
    ["another version", { ...toPersisted(playingState()), schemaVersion: SCHEMA_VERSION + 1 }],
    ["a missing field", { ...toPersisted(playingState()), game: { status: "playing" } }],
    [
      "three answers",
      { ...toPersisted(playingState()), game: { ...playingState(), currentQuestion: { ...question, answers: question.answers.slice(0, 3) } } },
    ],
    [
      "an unknown correct answer",
      { ...toPersisted(playingState()), game: { ...playingState(), currentQuestion: { ...question, correctAnswerId: "e" } } },
    ],
    ["too many skips", { ...toPersisted(playingState()), game: { ...playingState(), skipCount: 4 } }],
  ])("ignores %s", (_, raw) => {
    expect(fromPersisted(raw)).toBeNull();
  });
});
