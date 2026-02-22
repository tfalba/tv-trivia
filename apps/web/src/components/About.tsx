import { CategoryCard } from "./CategoryCard";

export function About() {
  return (
    <aside className="space-y-8">
      <div className="space-y-3">
        <h2 className="font-display text-3xl text-trivia-paper sm:text-4xl">
          Spin. Guess. Score.
        </h2>
        <p className="max-w-2xl text-base text-white/85 sm:text-lg">
          This is a TV Trivia Game where you can test your knowledge about your
          favorite shows!
        </p>
         <p className="max-w-2xl text-base text-white/85 sm:text-lg">
          Build a game with 2 to 8 players, spin for a show, and answer random
          easy/medium/hard questions from your selected decades.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CategoryCard
          title="Select show"
          subtitle="Pick a show of your choice or use random button to shuffle."
          label="Flow"
        />
        <CategoryCard
          title="Question Pool"
          subtitle="Pull from 200 questions with balanced difficulty."
          label="Flow"
        />
        <CategoryCard
          title="Scoring"
          subtitle="Mark answers right/wrong and rotate to the next player."
          label="Flow"
        />
      </div>
    </aside>
  );
}
