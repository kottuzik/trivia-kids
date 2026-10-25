import type {
  AnswerId,
  ClientErrorCode,
  Difficulty,
  Question,
  QuestionLimit,
} from "./schemas";

export type GameSettings = {
  topic: string;
  difficulty: Difficulty;
  questionLimit: QuestionLimit;
};

export type AnsweredQuestion = {
  question: Question;
  selectedAnswerId: AnswerId;
  isCorrect: boolean;
};

export type RequestState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; code: ClientErrorCode };

export type GameState = {
  status: "setup" | "playing" | "summary";
  // Changes on every new game so late responses from an old game are ignored.
  gameId: number;
  // Settings of the current (or last) game; also the defaults for the next setup.
  settings: GameSettings | null;
  // Why the setup screen was shown again (e.g. the topic was not suitable).
  setupError: ClientErrorCode | null;
  currentQuestion: Question | null;
  selectedAnswerId: AnswerId | null;
  completedCount: number;
  correctCount: number;
  answeredQuestions: AnsweredQuestion[];
  seenFingerprints: string[];
  request: RequestState;
};

export type GameAction =
  | { type: "START"; settings: GameSettings }
  | { type: "REQUEST_START"; gameId: number }
  | { type: "QUESTION_LOADED"; gameId: number; question: Question }
  | { type: "REQUEST_FAILED"; gameId: number; code: ClientErrorCode }
  | { type: "ANSWER"; answerId: AnswerId }
  | { type: "NEXT" }
  | { type: "RESET" };

export const initialGameState: GameState = {
  status: "setup",
  gameId: 0,
  settings: null,
  setupError: null,
  currentQuestion: null,
  selectedAnswerId: null,
  completedCount: 0,
  correctCount: 0,
  answeredQuestions: [],
  seenFingerprints: [],
  request: { state: "idle" },
};

// Errors that mean the setup itself must change before any question can be created.
const SETUP_ERRORS: ReadonlySet<ClientErrorCode> = new Set(["UNSAFE_TOPIC", "INVALID_INPUT"]);

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START":
      return {
        ...initialGameState,
        status: "playing",
        gameId: state.gameId + 1,
        settings: action.settings,
      };

    case "REQUEST_START":
      if (action.gameId !== state.gameId || state.status !== "playing") return state;
      return { ...state, request: { state: "loading" } };

    case "QUESTION_LOADED":
      if (action.gameId !== state.gameId || state.status !== "playing") return state;
      return {
        ...state,
        currentQuestion: action.question,
        selectedAnswerId: null,
        seenFingerprints: [...state.seenFingerprints, action.question.fingerprint],
        request: { state: "idle" },
      };

    case "REQUEST_FAILED":
      if (action.gameId !== state.gameId || state.status !== "playing") return state;
      // A question that failed to load is never counted; score and progress stay as they are.
      if (SETUP_ERRORS.has(action.code) && state.seenFingerprints.length === 0) {
        return { ...state, status: "setup", setupError: action.code, request: { state: "idle" } };
      }
      return { ...state, request: { state: "error", code: action.code } };

    case "ANSWER": {
      const question = state.currentQuestion;
      // Only one answer per question.
      if (!question || state.selectedAnswerId !== null) return state;
      const isCorrect = action.answerId === question.correctAnswerId;
      return {
        ...state,
        selectedAnswerId: action.answerId,
        completedCount: state.completedCount + 1,
        correctCount: state.correctCount + (isCorrect ? 1 : 0),
        answeredQuestions: [
          ...state.answeredQuestions,
          { question, selectedAnswerId: action.answerId, isCorrect },
        ],
      };
    }

    case "NEXT":
      if (state.selectedAnswerId === null || !state.settings) return state;
      if (state.completedCount >= state.settings.questionLimit) {
        return { ...state, status: "summary", currentQuestion: null, selectedAnswerId: null };
      }
      return { ...state, currentQuestion: null, selectedAnswerId: null };

    case "RESET":
      return { ...initialGameState, gameId: state.gameId + 1, settings: state.settings };
  }
}

export function successRate(state: Pick<GameState, "correctCount" | "settings">) {
  if (!state.settings) return 0;
  return Math.round((state.correctCount / state.settings.questionLimit) * 100);
}

export function isLastQuestion(state: GameState) {
  return state.settings !== null && state.completedCount >= state.settings.questionLimit;
}

// Whether the game needs a new question to be requested now.
export function needsQuestion(state: GameState) {
  return state.status === "playing" && state.currentQuestion === null && state.request.state === "idle";
}
