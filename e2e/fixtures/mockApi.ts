import { randomUUID } from "node:crypto";
import type { Page, Route } from "@playwright/test";
import { fingerprint } from "../../src/lib/game/fingerprint";
import { ANSWER_IDS, type ApiErrorCode, type Question, type QuestionRequest } from "../../src/lib/game/schemas";
import type { ReportRequest } from "../../src/lib/reports/schemas";

const STATUS: Record<ApiErrorCode, number> = {
  INVALID_INPUT: 400,
  UNSAFE_TOPIC: 422,
  RATE_LIMITED: 429,
  AI_INVALID_RESPONSE: 502,
  REPORT_SAVE_FAILED: 502,
  AI_UNAVAILABLE: 503,
};

const TOPICS = ["Space", "Dinosaurs", "Oceans", "Music"];

// Stands in for the three API routes. Questions are numbered, and the correct answer moves
// between positions so tests don't pass just by always picking the first one.
export class MockApi {
  readonly questionRequests: QuestionRequest[] = [];
  readonly reportRequests: ReportRequest[] = [];
  readonly questions: Question[] = [];
  private questionFailures: ApiErrorCode[] = [];
  private reportFailures: ApiErrorCode[] = [];
  private reportDelayMs = 0;

  failNextQuestions(...codes: ApiErrorCode[]) {
    this.questionFailures.push(...codes);
  }

  failNextReports(...codes: ApiErrorCode[]) {
    this.reportFailures.push(...codes);
  }

  delayReports(ms: number) {
    this.reportDelayMs = ms;
  }

  get lastQuestion() {
    return this.questions.at(-1)!;
  }

  correctText(question = this.lastQuestion) {
    return question.answers.find((answer) => answer.id === question.correctAnswerId)!.text;
  }

  wrongText(question = this.lastQuestion) {
    return question.answers.find((answer) => answer.id !== question.correctAnswerId)!.text;
  }

  async install(page: Page) {
    await page.route("**/api/questions/generate", (route) => this.onQuestion(route));
    await page.route("**/api/topics/suggest", (route) =>
      route.fulfill({ json: { topics: TOPICS } }),
    );
    await page.route("**/api/reports", (route) => this.onReport(route));
    return this;
  }

  private async onQuestion(route: Route) {
    const request = route.request().postDataJSON() as QuestionRequest;
    this.questionRequests.push(request);
    const failure = this.questionFailures.shift();
    if (failure) return error(route, failure);

    const n = this.questions.length + 1;
    const correctIndex = n % ANSWER_IDS.length;
    const text = `[${request.locale}] ${request.topic} question number ${n}?`;
    const question: Question = {
      id: randomUUID(),
      text,
      answers: ANSWER_IDS.map((id, index) => ({
        id,
        text: index === correctIndex ? `Right answer ${n}` : `Wrong answer ${n}-${id}`,
      })),
      correctAnswerId: ANSWER_IDS[correctIndex],
      explanation: `Explanation for question ${n}.`,
      fingerprint: fingerprint(text),
      topic: request.topic,
      locale: request.locale,
      ageGroup: request.ageGroup,
      difficulty: request.difficulty,
    };
    this.questions.push(question);
    return route.fulfill({ json: { question } });
  }

  private async onReport(route: Route) {
    this.reportRequests.push(route.request().postDataJSON() as ReportRequest);
    if (this.reportDelayMs) await new Promise((resolve) => setTimeout(resolve, this.reportDelayMs));
    const failure = this.reportFailures.shift();
    if (failure) return error(route, failure);
    return route.fulfill({ json: { ok: true } });
  }
}

function error(route: Route, code: ApiErrorCode) {
  return route.fulfill({ status: STATUS[code], json: { error: { code } } });
}
