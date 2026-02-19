import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="space-y-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-trivia-gold">
        Error
      </p>
      <h2 className="font-display text-5xl text-trivia-paper">404</h2>
      <p className="text-white/80">That page does not exist.</p>
      <Link to="/" className="btn-primary">
        Go home
      </Link>
    </section>
  );
}
