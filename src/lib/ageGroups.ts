export const AGE_GROUPS = ["6-9", "10-12", "13-16"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export function isAgeGroup(value: unknown): value is AgeGroup {
  return typeof value === "string" && (AGE_GROUPS as readonly string[]).includes(value);
}
