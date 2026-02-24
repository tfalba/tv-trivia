import express from "express";
import cors from "cors";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Difficulty, Question, SeedQuestionBankRequest } from "@tv-trivia/shared";
import {
  optionalSupabaseAuth,
  requireSupabaseAuth,
  isSupabaseAuthEnabled,
  type AuthenticatedRequest,
} from "./lib/supabaseAuth";
import {
  areEquivalentShowSets,
  getLatestQuestionBank,
  saveQuestionBank,
  setQuestionBankObjectKey,
} from "./lib/questionBankRepository";
import { uploadQuestionBankSnapshot } from "./lib/objectStore";

const app = express();

app.use(cors());
app.use(express.json());
app.use(optionalSupabaseAuth);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const API_ENV_PATH = join(__dirname, "..", ".env");
const DECADE_PATTERN = /^\d{4}s$/;

loadEnvFile(API_ENV_PATH);

type GeneratedQuestion = {
  show: string;
  question: string;
  answer_type: "exact" | "fuzzy" | "contains" | "multi-part" | "numeric";
  accepted_answers: string[];
  difficulty: Difficulty;
  season: string;
  episode_number: string;
  episode_title: string;
  evidence_summary: string;
  internal_reasoning_check: string;
  factual_confidence: number;
  ambiguity_risk: "low" | "medium" | "high";
};

type DecadeShowsRequest = {
  decade?: string;
};

type QuestionBankStatusRequest = {
  decade?: string;
  shows?: string[];
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

app.get("/api/auth/me", (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!isSupabaseAuthEnabled()) {
    res.status(500).json({
      ok: false,
      error: "Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.",
    });
    return;
  }
  if (!authedReq.authUser) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }
  res.json({ ok: true, user: authedReq.authUser });
});

app.get("/api/questions", async (req, res) => {
  const decade = (req.query.decade as string | undefined)?.trim() ?? "";
  if (!DECADE_PATTERN.test(decade)) {
    res.status(400).json({ ok: false, error: "Query must include a decade like 1980s." });
    return;
  }

  try {
    const bank = await getLatestQuestionBank(decade);
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

app.post("/api/questions/seed", requireSupabaseAuth, async (req, res) => {
  const body = req.body as SeedQuestionBankRequest;
  const decade = (body?.decade ?? "").trim();
  const shows = Array.isArray(body?.shows) ? body.shows.filter(Boolean) : [];
  const questionsPerShow = body?.questionsPerShow ?? 30;
  const difficultyMix = body?.difficultyMix ?? { easy: 10, medium: 10, hard: 10 };
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
    const authedReq = req as AuthenticatedRequest;
    const savedBank = await saveQuestionBank({
      decade,
      shows,
      questions,
      generatedByUser: authedReq.authUser?.id,
    });

    let objectKey: string | null = null;
    try {
      objectKey = await uploadQuestionBankSnapshot({
        decade,
        showSetHash: savedBank.showSetHash,
        questions,
        shows: savedBank.shows,
      });
      if (objectKey) {
        await setQuestionBankObjectKey(savedBank.id, objectKey);
      }
    } catch (snapshotError) {
      console.warn("Question bank DB save succeeded but object snapshot upload failed", snapshotError);
    }

    res.json({
      ok: true,
      decade,
      shows: savedBank.shows,
      seed,
      count: questions.length,
      objectKey,
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
    const bank = await getLatestQuestionBank(decade);
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

function toQuestionRecords(generated: GeneratedQuestion[]): Question[] {
  return generated.map((question, index) => ({
    id: `${sanitizeForId(question.show)}-${index + 1}`,
    showId: sanitizeForId(question.show),
    showTitle: question.show,
    difficulty: question.difficulty,
    prompt: question.question,
    answer: question.accepted_answers[0] ?? "",
    explanation: [
      `Answer type: ${question.answer_type}`,
      `Accepted answers: ${question.accepted_answers.join(" | ")}`,
      `S${question.season}E${question.episode_number} - ${question.episode_title}`,
      `Evidence: ${question.evidence_summary}`,
      `Confidence: ${question.factual_confidence}/10`,
      `Ambiguity risk: ${question.ambiguity_risk}`,
      `Reasoning check: ${question.internal_reasoning_check}`,
    ].join("\n"),
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
    "You are an expert TV canon researcher and trivia editor. Accuracy is more important than creativity. Return valid JSON only, no markdown.";

  const userPrompt = [
    `Generate a strict trivia object for each question requested across these shows: ${shows.join(", ")} (${seed}).`,
    `Generate exactly ${questionsPerShow} questions per show and keep difficulty per show to easy=${difficultyMix.easy}, medium=${difficultyMix.medium}, hard=${difficultyMix.hard}.`,
    `For each question object, use this exact requirement block:`,
    `Generate ONE open-answer trivia question about the TV show "{{SHOW_NAME}}" ({{DECADE}}).

REQUIREMENTS:

1. The question must:
   - Have a single clearly correct answer.
   - Be unambiguous.
   - Be verifiable from a specific episode.
   - Not rely on vague interpretation.
   - Not require subjective judgment.

2. The answer must:
   - Be a short open-answer response (not multiple choice).
   - Be specific enough for grading.
   - Not require listing more than 3 items.

3. Include canonical metadata:
   - Season number
   - Episode number
   - Episode title
   - 1–2 sentence evidence summary describing the exact scene

4. Provide grading support:
   - Provide an array of acceptable answer variants.
   - Indicate grading type (exact, fuzzy, contains, multi-part, numeric).

5. Provide:
   - Difficulty level (easy, medium, hard)
   - factual_confidence score (1–10)
   - ambiguity_risk (low, medium, high)

6. Perform internal verification:
   - Briefly explain why the answer is correct.
   - If uncertain about any detail, state "UNCERTAIN" and stop.`,
    `Return strict JSON in this shape (and include "show" for each object):`,
    `{
  "questions": [
    {
      "show": "",
      "question": "",
      "answer_type": "",
      "accepted_answers": [],
      "difficulty": "",
      "season": "",
      "episode_number": "",
      "episode_title": "",
      "evidence_summary": "",
      "internal_reasoning_check": "",
      "factual_confidence": 0,
      "ambiguity_risk": ""
    }
  ]
}`,
    "Do not include uncertain items. If any item is uncertain, omit it and continue.",
    `Difficulty per show must follow easy=${difficultyMix.easy}, medium=${difficultyMix.medium}, hard=${difficultyMix.hard}.`,
    `Use this seed for deterministic variety: ${seed}.`,
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
      typeof question.show === "string" &&
      typeof question.question === "string" &&
      (question.answer_type === "exact" ||
        question.answer_type === "fuzzy" ||
        question.answer_type === "contains" ||
        question.answer_type === "multi-part" ||
        question.answer_type === "numeric") &&
      Array.isArray(question.accepted_answers) &&
      question.accepted_answers.some((answer) => typeof answer === "string" && answer.trim()) &&
      (question.difficulty === "easy" ||
        question.difficulty === "medium" ||
        question.difficulty === "hard") &&
      typeof question.season === "string" &&
      typeof question.episode_number === "string" &&
      typeof question.episode_title === "string" &&
      typeof question.evidence_summary === "string" &&
      typeof question.internal_reasoning_check === "string" &&
      !question.internal_reasoning_check.toUpperCase().includes("UNCERTAIN") &&
      Number.isFinite(question.factual_confidence) &&
      question.factual_confidence >= 1 &&
      question.factual_confidence <= 10 &&
      (question.ambiguity_risk === "low" ||
        question.ambiguity_risk === "medium" ||
        question.ambiguity_risk === "high")
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
    'Return JSON: {"shows":["Show 1","Show 2",...]} with exactly 20 unique show titles and list fewer if 20 were not provided.',
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
