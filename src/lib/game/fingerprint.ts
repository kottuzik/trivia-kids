import { FINGERPRINT_MAX_LENGTH } from "./schemas";

// A question's identity inside one game: lower-cased text without diacritics (incl. Hebrew
// niqqud), punctuation or extra spaces. It is still readable, so the same list is also sent
// to the model as "questions already asked".
export function fingerprint(text: string) {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, FINGERPRINT_MAX_LENGTH);
}
