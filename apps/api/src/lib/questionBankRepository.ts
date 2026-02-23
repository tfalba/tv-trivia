import { createHash } from "node:crypto";
import type { Question } from "@tv-trivia/shared";
import { getPrismaClient } from "./prisma";

export type StoredQuestionBank = {
  id: string;
  decade: string;
  shows: string[];
  questions: Question[];
  updatedAt: string;
  showSetHash: string;
  objectKey: string | null;
};

function normalizeShowSetForHash(shows: string[]): string[] {
  return Array.from(
    new Set(
      shows
        .map((show) => show.trim().toLowerCase())
        .filter((show) => show.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));
}

function normalizeShowsForStorage(shows: string[]): string[] {
  return Array.from(new Set(shows.map((show) => show.trim()).filter((show) => show.length > 0)));
}

function showSetHash(shows: string[]): string {
  const normalized = normalizeShowSetForHash(shows);
  return createHash("sha256").update(normalized.join("|"), "utf8").digest("hex");
}

function readShowSet(shows: unknown): string[] {
  if (!Array.isArray(shows)) {
    return [];
  }
  return shows
    .filter((show): show is string => typeof show === "string")
    .map((show) => show.trim())
    .filter((show) => show.length > 0);
}

export function areEquivalentShowSets(left: string[], right: string[]): boolean {
  const normalizedLeft = normalizeShowSetForHash(left);
  const normalizedRight = normalizeShowSetForHash(right);
  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }
  return normalizedLeft.every((show, index) => show === normalizedRight[index]);
}

export async function getLatestQuestionBank(decade: string): Promise<StoredQuestionBank | null> {
  const prisma = getPrismaClient();
  const bank = await prisma.questionBank.findFirst({
    where: { decade },
    orderBy: { createdAt: "desc" },
    include: {
      showSet: true,
      questions: true,
    },
  });

  if (!bank) {
    return null;
  }

  const questions: Question[] = bank.questions.map((question) => ({
    id: question.externalId,
    showId: question.showId,
    showTitle: question.showTitle,
    difficulty: question.difficulty as Question["difficulty"],
    prompt: question.prompt,
    answer: question.answer,
  }));

  return {
    id: bank.id,
    decade: bank.decade,
    shows: readShowSet(bank.showSet.shows),
    questions,
    updatedAt: bank.createdAt.toISOString(),
    showSetHash: bank.showSetHash,
    objectKey: bank.objectKey,
  };
}

export async function saveQuestionBank(input: {
  decade: string;
  shows: string[];
  questions: Question[];
  generatedByUser?: string;
}): Promise<StoredQuestionBank> {
  const prisma = getPrismaClient();
  const shows = normalizeShowsForStorage(input.shows);
  const hash = showSetHash(shows);

  const result = await prisma.$transaction(async (tx) => {
    await tx.decadeShowSet.upsert({
      where: {
        decade_showSetHash: {
          decade: input.decade,
          showSetHash: hash,
        },
      },
      update: {
        shows,
      },
      create: {
        decade: input.decade,
        showSetHash: hash,
        shows,
      },
    });

    const bank = await tx.questionBank.create({
      data: {
        decade: input.decade,
        showSetHash: hash,
        questionCount: input.questions.length,
        generatedByUser: input.generatedByUser,
      },
    });

    await tx.question.createMany({
      data: input.questions.map((question) => ({
        questionBankId: bank.id,
        externalId: question.id,
        showId: question.showId,
        showTitle: question.showTitle ?? question.showId,
        difficulty: question.difficulty,
        prompt: question.prompt,
        answer: question.answer,
      })),
    });

    return bank;
  });

  return {
    id: result.id,
    decade: input.decade,
    shows,
    questions: input.questions,
    updatedAt: result.createdAt.toISOString(),
    showSetHash: hash,
    objectKey: result.objectKey,
  };
}

export async function setQuestionBankObjectKey(questionBankId: string, objectKey: string): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.questionBank.update({
    where: { id: questionBankId },
    data: { objectKey },
  });
}
