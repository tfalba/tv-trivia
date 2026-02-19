import type { Question } from "@tv-trivia/shared";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5174";

type QuestionsResponse = {
  ok: boolean;
  questions?: Question[];
  error?: string;
};

type DecadeShowsResponse = {
  ok: boolean;
  decade?: string;
  shows?: string[];
  error?: string;
};

export async function fetchQuestionBank(): Promise<Question[]> {
  const response = await fetch(`${API_BASE_URL}/api/questions`);
  const body = (await response.json()) as QuestionsResponse;
  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? "Failed to fetch question bank.");
  }
  return body.questions ?? [];
}

export async function seedQuestionBank(input: {
  shows: readonly string[];
  questionsPerShow: number;
  seed: number;
}): Promise<Question[]> {
  const response = await fetch(`${API_BASE_URL}/api/questions/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      shows: input.shows,
      questionsPerShow: input.questionsPerShow,
      seed: input.seed,
    }),
  });
  const body = (await response.json()) as QuestionsResponse;
  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? "Failed to seed question bank.");
  }
  return body.questions ?? [];
}

export async function fetchPopularShowsForDecade(decade: string): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/decades/shows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decade }),
  });
  const body = (await response.json()) as DecadeShowsResponse;
  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? "Failed to fetch decade shows.");
  }
  return body.shows ?? [];
}
