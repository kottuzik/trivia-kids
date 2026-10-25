import { describe, expect, it, vi } from "vitest";
import type { RawQuestion } from "@/lib/game/validateQuestion";
import type { AIClient } from "./openai";
import { MAX_ATTEMPTS, generateQuestion } from "./questions";

const request = {
  topic: "space",
  locale: "en" as const,
  ageGroup: "10-12" as const,
  difficulty: "easy" as const,
  seenQuestionFingerprints: [],
};

const good: RawQuestion = {
  topicSuitable: true,
  question: "Which planet is known as the Red Planet?",
  answers: ["Venus", "Mars", "Jupiter", "Saturn"],
  correctIndex: 1,
  correctAnswerText: "Mars",
  explanation: "Mars looks red because of iron oxide (rust) on its surface.",
};

const clean = { type: "moderation_result", flagged: false };

// A fake OpenAI client returning the given outputs in order.
function fakeClient(outputs: (RawQuestion | null)[], { topicFlagged = false } = {}) {
  const parse = vi.fn();
  for (const output of outputs) {
    parse.mockResolvedValueOnce({
      output: [],
      output_parsed: output,
      status: output ? "completed" : "incomplete",
      moderation: { input: clean, output: clean },
    });
  }
  const create = vi.fn().mockResolvedValue({ results: [{ flagged: topicFlagged }] });
  const client = { responses: { parse }, moderations: { create } } as unknown as AIClient;
  return { client, parse, create };
}

describe("generateQuestion", () => {
  it("returns a shuffled question whose correct id points at the right answer", async () => {
    const { client } = fakeClient([good]);
    const question = await generateQuestion(request, client);
    expect(question.answers.map((answer) => answer.id)).toEqual(["a", "b", "c", "d"]);
    expect(question.answers.find((answer) => answer.id === question.correctAnswerId)?.text).toBe("Mars");
    expect(question.fingerprint).toBe("which planet is known as the red planet");
  });

  it("asks for a replacement when a question is invalid", async () => {
    const duplicate = { ...good, answers: ["Mars", "Mars", "Venus", "Earth"], correctIndex: 0 };
    const { client, parse } = fakeClient([duplicate, null, good]);
    await expect(generateQuestion(request, client)).resolves.toMatchObject({ text: good.question });
    expect(parse).toHaveBeenCalledTimes(3);
  });

  it("gives up after the attempt limit", async () => {
    const { client, parse } = fakeClient(Array(MAX_ATTEMPTS).fill(null));
    await expect(generateQuestion(request, client)).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
    expect(parse).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });

  it("stops before generation when moderation flags the topic", async () => {
    const { client, parse } = fakeClient([good], { topicFlagged: true });
    await expect(generateQuestion(request, client)).rejects.toMatchObject({ code: "UNSAFE_TOPIC" });
    expect(parse).not.toHaveBeenCalled();
  });

  it("reports an unsuitable topic when the model says so", async () => {
    const { client } = fakeClient([{ ...good, topicSuitable: false }]);
    await expect(generateQuestion(request, client)).rejects.toMatchObject({ code: "UNSAFE_TOPIC" });
  });

  it("rejects a question that repeats one already asked", async () => {
    const { client, parse } = fakeClient([good, good, good]);
    const seen = { ...request, seenQuestionFingerprints: ["which planet is known as the red planet"] };
    await expect(generateQuestion(seen, client)).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
    expect(parse).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });
});
