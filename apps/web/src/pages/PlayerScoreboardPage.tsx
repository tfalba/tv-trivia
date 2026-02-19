import { ScoreboardRow } from "../components/ScoreboardRow";

const players = [
  { playerName: "Player 1", score: 220, isCurrent: true },
  { playerName: "Player 2", score: 190, isCurrent: false },
  { playerName: "Player 3", score: 160, isCurrent: false },
];

export function PlayerScoreboardPage() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h2 className="font-display text-3xl text-trivia-paper sm:text-4xl">
          Player Scoreboard
        </h2>
        <p className="max-w-2xl text-base text-white/85 sm:text-lg">
          Track current standings, active player turns, and score totals.
        </p>
      </div>

      <div className="rounded-2xl border border-white/15 bg-black/25 p-5">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-trivia-gold">
          Live Scoreboard
        </p>
        <ul className="space-y-2">
          {players.map((player) => (
            <ScoreboardRow
              key={player.playerName}
              playerName={player.playerName}
              score={player.score}
              isCurrent={player.isCurrent}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
