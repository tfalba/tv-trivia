import { Link } from "react-router-dom";
import { CategoryCard } from "../components/CategoryCard";
import { DifficultyBadge } from "../components/DifficultyBadge";

const decades = ["1980s", "1990s", "2000s"];

export function HomePage() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h2 className="font-display text-3xl text-trivia-paper sm:text-4xl">
          Spin. Guess. Score.
        </h2>
        <p className="max-w-2xl text-base text-white/85 sm:text-lg">
          Build a game with 2 to 8 players, spin for a show, and answer random
          easy/medium/hard questions from your selected decades.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {decades.map((decade) => (
          <CategoryCard key={decade} title={decade} subtitle="Pick 5 popular TV shows." />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <DifficultyBadge difficulty="easy" />
        <DifficultyBadge difficulty="medium" />
        <DifficultyBadge difficulty="hard" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/game" className="btn-primary">
          Start game board
        </Link>
        <Link to="/game" className="btn-secondary">
          Preview wheel mode
        </Link>
      </div>
    </section>
  );
}
