import express from "express";
import cors from "cors";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Difficulty, Question, SeedQuestionBankRequest } from "@tv-trivia/shared";

const app = express();

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, "data");
const API_ENV_PATH = join(__dirname, "..", ".env");
const DECADE_PATTERN = /^\d{4}s$/;

loadEnvFile(API_ENV_PATH);

type GeneratedQuestion = {
  showTitle: string;
  difficulty: Difficulty;
  prompt: string;
  answer: string;
};

type DecadeShowsRequest = {
  decade?: string;
};

type QuestionBankStatusRequest = {
  decade?: string;
  shows?: string[];
};

type StoredQuestionBank = {
  decade: string;
  shows: string[];
  questions: Question[];
  updatedAt: string;
};

function loadEnvFile(path: string): void {
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }
      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing .env files to keep env vars optional in production.
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/questions", async (req, res) => {
  const decade = (req.query.decade as string | undefined)?.trim() ?? "";
  if (!DECADE_PATTERN.test(decade)) {
    res.status(400).json({ ok: false, error: "Query must include a decade like 1980s." });
    return;
  }

  try {
    const bank = await readQuestionBankFromDisk(decade);
    res.json({
      ok: true,
      decade,
      shows: bank?.shows ?? [],
      questions: bank?.questions ?? [],
    });
  } catch (error) {
    console.error("Failed to load question bank", error);
    res.status(500).json({ ok: false, error: "Failed to load question bank" });
  }
});

app.post("/api/questions/seed", async (req, res) => {
  const body = req.body as SeedQuestionBankRequest;
  const decade = (body?.decade ?? "").trim();
  const shows = Array.isArray(body?.shows) ? body.shows.filter(Boolean) : [];
  const questionsPerShow = body?.questionsPerShow ?? 18;
  const difficultyMix = body?.difficultyMix ?? { easy: 6, medium: 6, hard: 6 };
  const seed = body?.seed ?? Date.now();

  if (!DECADE_PATTERN.test(decade)) {
    res.status(400).json({ ok: false, error: "Request must include a decade like 1980s." });
    return;
  }

  if (shows.length === 0) {
    res.status(400).json({ ok: false, error: "Request must include at least one show." });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({
      ok: false,
      error: "OPENAI_API_KEY is missing in the API environment.",
    });
    return;
  }

  try {
    const generated = await generateQuestionBankWithOpenAI({
      shows,
      questionsPerShow,
      difficultyMix,
      seed,
    });
    const questions = toQuestionRecords(generated);
    await writeQuestionBankToDisk(decade, shows, questions);
    res.json({
      ok: true,
      decade,
      shows,
      seed,
      count: questions.length,
      questions,
    });
  } catch (error) {
    console.error("Failed to seed question bank", error);
    res.status(500).json({ ok: false, error: "Failed to seed question bank" });
  }
});

app.post("/api/decades/shows", async (req, res) => {
  const body = req.body as DecadeShowsRequest;
  const decade = (body?.decade ?? "").trim();

  if (!DECADE_PATTERN.test(decade)) {
    res.status(400).json({ ok: false, error: "Request must include a decade like 1980s." });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({
      ok: false,
      error: "OPENAI_API_KEY is missing in the API environment.",
    });
    return;
  }

  try {
    const shows = await generatePopularShowsForDecade(decade);
    res.json({ ok: true, decade, shows });
  } catch (error) {
    console.error("Failed to generate decade shows", error);
    res.status(500).json({ ok: false, error: "Failed to generate decade shows" });
  }
});

app.post("/api/questions/status", async (req, res) => {
  const body = req.body as QuestionBankStatusRequest;
  const decade = (body?.decade ?? "").trim();
  const selectedShows = Array.isArray(body?.shows) ? body.shows.filter(Boolean) : [];

  if (!DECADE_PATTERN.test(decade)) {
    res.status(400).json({ ok: false, error: "Request must include a decade like 1980s." });
    return;
  }

  try {
    const bank = await readQuestionBankFromDisk(decade);
    const hasBank = Boolean(bank && bank.questions.length > 0);
    const matchesSelectedShows =
      selectedShows.length === 0
        ? null
        : hasBank && areEquivalentShowSets(selectedShows, bank?.shows ?? []);

    res.json({
      ok: true,
      decade,
      hasBank,
      questionCount: bank?.questions.length ?? 0,
      storedShows: bank?.shows ?? [],
      matchesSelectedShows,
    });
  } catch (error) {
    console.error("Failed to check question bank status", error);
    res.status(500).json({ ok: false, error: "Failed to check question bank status" });
  }
});

function getQuestionBankPathForDecade(decade: string): string {
  return join(DATA_DIR, `question-bank.${decade}.generated.json`);
}

function normalizeShows(shows: string[]): string[] {
  return Array.from(
    new Set(
      shows
        .map((show) => show.trim().toLowerCase())
        .filter((show) => show.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));
}

function areEquivalentShowSets(left: string[], right: string[]): boolean {
  const normalizedLeft = normalizeShows(left);
  const normalizedRight = normalizeShows(right);
  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }
  return normalizedLeft.every((show, index) => show === normalizedRight[index]);
}

async function readQuestionBankFromDisk(decade: string): Promise<StoredQuestionBank | null> {
  try {
    const raw = await readFile(getQuestionBankPathForDecade(decade), "utf8");
    const parsed = JSON.parse(raw) as StoredQuestionBank;
    if (
      !parsed ||
      !Array.isArray(parsed.shows) ||
      !Array.isArray(parsed.questions) ||
      typeof parsed.decade !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeQuestionBankToDisk(
  decade: string,
  shows: string[],
  questions: Question[]
): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const payload: StoredQuestionBank = {
    decade,
    shows: Array.from(new Set(shows.map((show) => show.trim()).filter(Boolean))),
    questions,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(
    getQuestionBankPathForDecade(decade),
    JSON.stringify(payload, null, 2),
    "utf8"
  );
}

function toQuestionRecords(generated: GeneratedQuestion[]): Question[] {
  return generated.map((question, index) => ({
    id: `${sanitizeForId(question.showTitle)}-${index + 1}`,
    showId: sanitizeForId(question.showTitle),
    showTitle: question.showTitle,
    difficulty: question.difficulty,
    prompt: question.prompt,
    answer: question.answer,
  }));
}

function sanitizeForId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function generateQuestionBankWithOpenAI(input: {
  shows: string[];
  questionsPerShow: number;
  difficultyMix: { easy: number; medium: number; hard: number };
  seed: number;
}): Promise<GeneratedQuestion[]> {
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const { shows, questionsPerShow, difficultyMix, seed } = input;

  const systemPrompt =
    "You generate TV trivia questions. Return valid JSON only, no markdown, no commentary.";
  const userPrompt = [
    `Create a question bank for these shows: ${shows.join(", ")}.`,
    `Generate exactly ${questionsPerShow} questions per show.`,
    `Difficulty per show must follow easy=${difficultyMix.easy}, medium=${difficultyMix.medium}, hard=${difficultyMix.hard}.`,
    "Each question must include showTitle, difficulty, prompt, and answer.",
    "Prompts should be concise and factual. Answers must be short and unambiguous.",
    `Use this seed for deterministic variety: ${seed}.`,
    'Return JSON in this shape: {"questions":[{"showTitle":"...","difficulty":"easy|medium|hard","prompt":"...","answer":"..."}]}',
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI call failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawText = payload.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new Error("OpenAI response did not include content.");
  }

  const parsed = JSON.parse(rawText) as { questions?: GeneratedQuestion[] };
  if (!Array.isArray(parsed.questions)) {
    throw new Error("OpenAI response did not include questions array.");
  }

  return parsed.questions.filter(
    (question) =>
      typeof question.showTitle === "string" &&
      (question.difficulty === "easy" ||
        question.difficulty === "medium" ||
        question.difficulty === "hard") &&
      typeof question.prompt === "string" &&
      typeof question.answer === "string"
  );
}

async function generatePopularShowsForDecade(decade: string): Promise<string[]> {
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const systemPrompt =
    "You are a TV historian assistant. Return JSON only, no markdown, no extra text.";
  const userPrompt = [
    `Generate the 20 most popular scripted TV shows first released in the ${decade}.`,
    "Prioritize US mainstream audience familiarity for trivia game play.",
    "Do not include duplicates, reality shows, or non-TV media.",
    'Return JSON: {"shows":["Show 1","Show 2",...]} with exactly 20 unique show titles.',
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI call failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawText = payload.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new Error("OpenAI response did not include content.");
  }

  const parsed = JSON.parse(rawText) as { shows?: string[] };
  if (!Array.isArray(parsed.shows)) {
    throw new Error("OpenAI response did not include shows array.");
  }

  const uniqueShows = Array.from(
    new Set(
      parsed.shows
        .map((show) => show.trim())
        .filter((show) => show.length > 0)
    )
  );

  if (uniqueShows.length < 20) {
    throw new Error("OpenAI returned fewer than 20 unique shows.");
  }

  return uniqueShows.slice(0, 20);
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 5174;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
