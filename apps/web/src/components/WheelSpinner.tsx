type WheelSpinnerProps = {
  shows: readonly string[];
  rotation: number;
  isSpinning: boolean;
  selectedShow: string | null;
  onSpin: () => void;
};

const wheelColors = [
  "var(--color-primary)",
  "var(--color-accent)",
  "var(--color-violet)",
  "color-mix(in oklab, var(--color-primary) 70%, black 10%)",
  "color-mix(in oklab, var(--color-accent) 72%, black 12%)",
  "color-mix(in oklab, var(--color-violet) 74%, black 10%)",
];

export function WheelSpinner({
  shows,
  rotation,
  isSpinning,
  selectedShow,
  onSpin,
}: WheelSpinnerProps) {
  const segmentAngle = 360 / shows.length;
  const gradientStops = shows
    .map((_, index) => {
      const start = index * segmentAngle;
      const end = (index + 1) * segmentAngle;
      const color = wheelColors[index % wheelColors.length];
      return `${color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="rounded-2xl border border-white/15 bg-black/25 p-5">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-trivia-gold">
        Wheel Spinner
      </p>
      <div className="relative mx-auto mb-4 flex h-72 w-72 items-center justify-center">
        <div
          className="pointer-events-none absolute top-0 z-20 h-0 w-0 -translate-y-2 border-x-[14px] border-b-[0px] border-t-[22px] border-x-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
          style={{ borderTopColor: "var(--color-accent)" }}
        />

        <div
          className="relative h-72 w-72 rounded-full border-4"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning
              ? "transform 2600ms cubic-bezier(0.15, 0.8, 0.2, 1)"
              : "none",
            background: `conic-gradient(from -90deg, ${gradientStops})`,
            borderColor: "var(--color-border)",
            boxShadow: isSpinning
              ? "var(--shadow-panel), var(--shadow-glow), var(--shadow-focus)"
              : "var(--shadow-panel)",
          }}
        >
          {shows.map((show, index) => {
            const segmentCenterAngle = index * segmentAngle + segmentAngle / 2;
            const radius = 92;
            return (
              <span
                key={show}
                className="absolute left-1/2 top-1/2 w-24 -translate-x-1/2 -translate-y-1/2 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-[color:var(--color-text)]"
                style={{
                  transform: `translate(-50%, -50%) rotate(${segmentCenterAngle}deg) translateY(-${radius}px)`,
                  textShadow: "0 1px 3px rgba(0, 0, 0, 0.45)",
                }}
              >
                {show}
              </span>
            );
          })}
          <div
            className="absolute left-1/2 top-1/2 z-10 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-surface-2)",
              boxShadow: "var(--shadow-inset)",
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onSpin} className="btn-secondary" disabled={isSpinning}>
          {isSpinning ? "Spinning..." : "Spin wheel"}
        </button>
        {selectedShow ? (
          <p className="text-sm text-white/85">
            Selected show: <span className="font-semibold text-trivia-gold">{selectedShow}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
