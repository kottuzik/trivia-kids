import { openDB, type IDBPDatabase } from "idb";
import { z } from "zod";
import { LOCALES } from "@/i18n/locales";
import { AGE_GROUPS } from "@/lib/ageGroups";
import { MAX_SKIPS, type GameState } from "./engine";
import { ANSWER_IDS, API_ERROR_CODES, DIFFICULTIES, QUESTION_LIMITS } from "./schemas";

// The active game is kept on this device only (IndexedDB), as one record.
const DB_NAME = "trivia-kids";
const DB_VERSION = 1;
const STORE = "game";
const KEY = "active";
export const SCHEMA_VERSION = 1;

const answerIdSchema = z.enum(ANSWER_IDS);

const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  answers: z
    .array(z.object({ id: answerIdSchema, text: z.string() }))
    .length(4)
    .refine((answers) => new Set(answers.map((item) => item.id)).size === 4),
  correctAnswerId: answerIdSchema,
  explanation: z.string(),
  fingerprint: z.string(),
  topic: z.string(),
  locale: z.enum(LOCALES),
  ageGroup: z.enum(AGE_GROUPS),
  difficulty: z.enum(DIFFICULTIES),
});

const errorCodeSchema = z.enum([...API_ERROR_CODES, "NETWORK"]);

const gameStateSchema = z.object({
  status: z.enum(["setup", "playing", "summary"]),
  gameId: z.number().int().nonnegative(),
  settings: z
    .object({
      topic: z.string(),
      difficulty: z.enum(DIFFICULTIES),
      questionLimit: z.union(QUESTION_LIMITS.map((limit) => z.literal(limit))),
    })
    .nullable(),
  setupError: errorCodeSchema.nullable(),
  currentQuestion: questionSchema.nullable(),
  selectedAnswerId: answerIdSchema.nullable(),
  completedCount: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  skipCount: z.number().int().min(0).max(MAX_SKIPS),
  answeredQuestions: z.array(
    z.object({ question: questionSchema, selectedAnswerId: answerIdSchema, isCorrect: z.boolean() }),
  ),
  seenFingerprints: z.array(z.string()),
  request: z.discriminatedUnion("state", [
    z.object({ state: z.literal("idle") }),
    z.object({ state: z.literal("loading") }),
    z.object({ state: z.literal("error"), code: errorCodeSchema }),
  ]),
});

const recordSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  savedAt: z.number(),
  game: gameStateSchema,
});

export type SavedRecord = z.infer<typeof recordSchema>;

export function toPersisted(state: GameState): SavedRecord {
  return { schemaVersion: SCHEMA_VERSION, savedAt: Date.now(), game: state };
}

// Returns null for anything that is not a valid saved game (old version, damaged data).
export function fromPersisted(raw: unknown): GameState | null {
  const parsed = recordSchema.safeParse(raw);
  if (!parsed.success) return null;
  const game = parsed.data.game as GameState;
  // The app was closed while a question was loading: ask for it again.
  return game.request.state === "loading" ? { ...game, request: { state: "idle" } } : game;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(STORE);
    },
  });
  return dbPromise;
}

// Storage problems (private mode, blocked storage) never break the game: it simply
// keeps running in memory.
export async function loadGame(): Promise<GameState | null> {
  try {
    const db = await getDb();
    return fromPersisted(await db.get(STORE, KEY));
  } catch {
    return null;
  }
}

export async function saveGame(state: GameState): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE, toPersisted(state), KEY);
  } catch {
    // Ignored on purpose (see loadGame).
  }
}
