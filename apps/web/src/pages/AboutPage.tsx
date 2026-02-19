import { CategoryCard } from "../components/CategoryCard";

export function AboutPage() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h2 className="font-display text-3xl text-trivia-paper sm:text-4xl">
          About
        </h2>
        <p className="max-w-2xl text-base text-white/85 sm:text-lg">
          This is a TV Trivia Game where you can test your knowledge about your
          favorite shows!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CategoryCard
          title="Wheel Spin"
          subtitle="Randomly choose one of the five selected shows."
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
    </section>
  );
}
