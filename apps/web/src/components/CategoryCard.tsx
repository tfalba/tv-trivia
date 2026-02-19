type CategoryCardProps = {
  title: string;
  subtitle: string;
  label?: string;
};

export function CategoryCard({ title, subtitle, label = "Category" }: CategoryCardProps) {
  return (
    <article className="rounded-2xl border border-white/15 bg-black/25 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-trivia-gold">
        {label}
      </p>
      <h3 className="font-display text-2xl text-trivia-paper">{title}</h3>
      <p className="mt-2 text-sm text-white/75">{subtitle}</p>
    </article>
  );
}
