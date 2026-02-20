import type { Question } from "@tv-trivia/shared";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5174";

type QuestionsResponse = {
  ok: boolean;
  decade?: string;
  shows?: string[];
  questions?: Question[];
  error?: string;
};

type DecadeShowsResponse = {
  ok: boolean;
  decade?: string;
  shows?: string[];
  error?: string;
};

type QuestionBankStatusResponse = {
  ok: boolean;
  decade?: string;
  hasBank?: boolean;
  questionCount?: number;
  storedShows?: string[];
  matchesSelectedShows?: boolean | null;
  error?: string;
};

export async function fetchQuestionBank(decade: string): Promise<Question[]> {
  const params = new URLSearchParams({ decade });
  const response = await fetch(`${API_BASE_URL}/api/questions?${params.toString()}`);
  const body = (await response.json()) as QuestionsResponse;
  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? "Failed to fetch question bank.");
  }
  return body.questions ?? [];
}

export async function seedQuestionBank(input: {
  decade: string;
  shows: readonly string[];
  questionsPerShow: number;
  seed: number;
}): Promise<Question[]> {
  const response = await fetch(`${API_BASE_URL}/api/questions/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decade: input.decade,
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

export async function fetchQuestionBankStatus(input: {
  decade: string;
  shows?: readonly string[];
}): Promise<{
  hasBank: boolean;
  questionCount: number;
  storedShows: string[];
  matchesSelectedShows: boolean | null;
}> {
  const response = await fetch(`${API_BASE_URL}/api/questions/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decade: input.decade,
      shows: input.shows ?? [],
    }),
  });
  const body = (await response.json()) as QuestionBankStatusResponse;
  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? "Failed to check question bank status.");
  }

  return {
    hasBank: body.hasBank ?? false,
    questionCount: body.questionCount ?? 0,
    storedShows: body.storedShows ?? [],
    matchesSelectedShows: body.matchesSelectedShows ?? null,
  };
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
