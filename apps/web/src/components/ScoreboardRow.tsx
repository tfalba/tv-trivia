type ScoreboardRowProps = {
  playerName: string;
  score: number;
  isCurrent?: boolean;
};

export function ScoreboardRow({ playerName, score, isCurrent = false }: ScoreboardRowProps) {
  return (
    <li
      className={[
        "flex items-center justify-between rounded-xl border px-4 py-3",
        isCurrent
          ? "border-trivia-gold/70 bg-trivia-gold/15"
          : "border-white/15 bg-bg/15",
      ].join(" ")}
    >
      <span className="font-semibold text-white">{playerName}</span>
      <span
        className={[
          "rounded-md px-3 py-1 text-sm font-bold",
          isCurrent ? "bg-trivia-gold text-trivia-ink" : "bg-white/10 text-white",
        ].join(" ")}
      >
        {score} pts
      </span>
    </li>
  );
}
