export type Difficulty = "easy" | "medium" | "hard";

export type Player = { id: string; name: string; score: number };

export type Question = {
  id: string;
  showId: string;
  showTitle?: string;
  difficulty: Difficulty;
  prompt: string;
  choices?: string[];
  answer: string;
  explanation?: string;
};

export type SeedQuestionBankRequest = {
  decade: string;
  shows: string[];
  questionsPerShow?: number;
  difficultyMix?: {
    easy: number;
    medium: number;
    hard: number;
  };
  seed?: number;
};
