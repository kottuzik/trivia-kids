// A valid /api/reports request body shared by the report tests.
export const validReport = {
  issueType: "wrong_answer",
  question: {
    id: "4f8a3c1e-2b7d-4e9a-8c6f-1a2b3c4d5e6f",
    text: "Which planet is known as the Red Planet?",
    answers: [
      { id: "a", text: "Venus" },
      { id: "b", text: "Mars" },
      { id: "c", text: "Jupiter" },
      { id: "d", text: "Saturn" },
    ],
    correctAnswerId: "b",
    explanation: "Mars looks red because of iron oxide on its surface.",
    topic: "space",
    locale: "en",
    ageGroup: "10-12",
    difficulty: "easy",
  },
};
