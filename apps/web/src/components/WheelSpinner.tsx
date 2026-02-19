type WheelSpinnerProps = {
  shows: readonly string[];
  rotation: number;
  isSpinning: boolean;
  selectedShow: string | null;
  onSpin: () => void;
};

const wheelColors = ["#2b70e4", "#209d5c", "#ffd034", "#3b82f6", "#16a34a", "#facc15"];

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
        <div className="pointer-events-none absolute top-0 z-20 h-0 w-0 -translate-y-2 border-x-[14px] border-b-[0px] border-t-[22px] border-x-transparent border-t-trivia-gold drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]" />

        <div
          className={[
            "relative h-72 w-72 rounded-full border-4 border-white/60 shadow-card",
            isSpinning ? "ring-4 ring-trivia-gold/30" : "",
          ].join(" ")}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning
              ? "transform 2600ms cubic-bezier(0.15, 0.8, 0.2, 1)"
              : "none",
            background: `conic-gradient(from -90deg, ${gradientStops})`,
          }}
        >
          {shows.map((show, index) => {
            const segmentCenterAngle = index * segmentAngle + segmentAngle / 2;
            const radius = 102;
            const diagonalTilt = -32;
            return (
              <span
                key={show}
                className="absolute left-1/2 top-1/2 w-20 -translate-x-1/2 -translate-y-1/2 break-words text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-black"
                style={{
                  transform: `translate(-50%, -50%) rotate(${segmentCenterAngle}deg) translateY(-${radius}px) rotate(${-segmentCenterAngle + diagonalTilt}deg)`,
                }}
              >
                {show}
              </span>
            );
          })}
          <div className="absolute left-1/2 top-1/2 z-10 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70 bg-black/55" />
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
