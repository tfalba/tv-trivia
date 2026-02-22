import { DifficultyBadge } from "./DifficultyBadge";

type Difficulty = "easy" | "medium" | "hard";

type QuestionCardProps = {
  showTitle: string;
  difficulty: Difficulty;
  prompt: string;
  answer: string;
  isRevealed: boolean;
  onReveal: () => void;
  onSkip: () => void;
  onMarkCorrect: () => void;
  onMarkWrong: () => void;
};

export function QuestionCard({
  showTitle,
  difficulty,
  prompt,
  answer,
  isRevealed,
  onReveal,
  onSkip,
  onMarkCorrect,
  onMarkWrong,
}: QuestionCardProps) {
  return (
    <article className="rounded-2xl border border-white/15 bg-[var(--color-surface-2)] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-2xl text-trivia-paper">{showTitle}</h3>
        <DifficultyBadge difficulty={difficulty} />
      </div>

      <p className="mb-4 text-lg text-white/95">{prompt}</p>

      <div className="mb-5 rounded-xl border border-white/15 bg-white/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-trivia-gold">
          Answer
        </p>
        <p className="mt-2 text-white/90">
          {isRevealed ? answer : "Hidden until reveal"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-between w-full">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReveal}
            className="btn-secondary"
            disabled={isRevealed}
          >
            {isRevealed ? "Answer revealed" : "Reveal answer"}
          </button>
          <button type="button" onClick={onMarkCorrect} className="btn-primary">
            Mark correct
          </button>
          <button
            type="button"
            onClick={onMarkWrong}
            className="inline-flex items-center justify-center rounded-xl border border-red-400/70 bg-red-500/20 px-5 py-3 font-semibold text-white transition hover:bg-red-500/35"
          >
            Mark wrong
          </button>
        </div>
        {!isRevealed ? (
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center justify-center rounded-xl border border-red-400/70 bg-red-500/20 px-5 py-3 font-semibold text-white transition hover:bg-red-500/35"
          >
            Skip question
          </button>
        ) : null}
      </div>
    </article>
  );
}
