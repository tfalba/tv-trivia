type Difficulty = "easy" | "medium" | "hard";

type DifficultyBadgeProps = {
  difficulty: Difficulty;
};

const difficultyStyles: Record<Difficulty, string> = {
  easy: "border-trivia-green/60 text-trivia-green",
  medium: "border-trivia-gold/60 text-trivia-gold",
  hard: "border-trivia-blue/70 text-trivia-blue",
};

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  return (
    <span className={`chip ${difficultyStyles[difficulty]}`}>
      {difficulty[0].toUpperCase() + difficulty.slice(1)}
    </span>
  );
}
