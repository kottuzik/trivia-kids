import { describe, expect, it } from "vitest";
import { fingerprint } from "./fingerprint";
import { isMostlyInLanguage, validateQuestion, type RawQuestion } from "./validateQuestion";

const base: RawQuestion = {
  topicSuitable: true,
  question: "What is the capital of France?",
  answers: ["London", "Berlin", "Paris", "Madrid"],
  correctIndex: 2,
  correctAnswerText: "Paris",
  explanation: "Paris has been the capital of France for centuries.",
};

const check = (raw: Partial<RawQuestion>, seenFingerprints: string[] = []) =>
  validateQuestion({ ...base, ...raw }, { locale: "en", seenFingerprints });

describe("validateQuestion", () => {
  it("accepts a valid question", () => {
    expect(check({})).toBeNull();
  });

  it("requires exactly four answers", () => {
    expect(check({ answers: ["Paris", "Rome", "Oslo"] })).toBe("answer_count");
  });

  it("rejects duplicate answers, even with different case or punctuation", () => {
    expect(check({ answers: ["Paris", "paris!", "Rome", "Oslo"], correctIndex: 0 })).toBe("duplicate_answers");
  });

  it("rejects empty fields", () => {
    expect(check({ explanation: "  " })).toBe("empty_field");
    expect(check({ answers: ["Paris", "", "Rome", "Oslo"], correctIndex: 0 })).toBe("empty_field");
  });

  it("rejects a correct index that does not match the stated correct answer", () => {
    expect(check({ correctIndex: 1 })).toBe("correct_mismatch");
    expect(check({ correctIndex: 4 })).toBe("correct_mismatch");
  });

  it("rejects a question already asked in this game", () => {
    expect(check({}, [fingerprint("What is the capital of France")])).toBe("already_seen");
  });

  it("rejects text in the wrong language", () => {
    expect(
      validateQuestion(base, { locale: "he", seenFingerprints: [] }),
    ).toBe("wrong_language");
  });
});

describe("fingerprint", () => {
  it("treats punctuation, case and Hebrew niqqud as the same question", () => {
    expect(fingerprint("מָה בִּירַת צָרְפַת?")).toBe(fingerprint("מה בירת צרפת"));
    expect(fingerprint("What is  the capital of FRANCE?!")).toBe("what is the capital of france");
  });
});

describe("isMostlyInLanguage", () => {
  it("allows a few Latin words inside Hebrew or Russian text", () => {
    expect(isMostlyInLanguage("מה זה DNA ולמה הוא חשוב?", "he")).toBe(true);
    expect(isMostlyInLanguage("Что изучает NASA?", "ru")).toBe(true);
    expect(isMostlyInLanguage("What does NASA study?", "ru")).toBe(false);
  });
});
