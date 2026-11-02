import { clampPowerLevel } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZE = 260;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function BoostGauge({
  powerLevel,
  className,
}: {
  powerLevel: bigint;
  className?: string;
}) {
  const percent = clampPowerLevel(powerLevel);
  const dashOffset = CIRCUMFERENCE * (1 - percent / 100);

  return (
    <div
      className={cn("relative mx-auto", className)}
      style={{ width: SIZE, height: SIZE }}
      data-ocid="boost.gauge"
      role="img"
      aria-label={`Nivel de potencia actual: ${percent} por ciento`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-6 rounded-full bg-primary/10 blur-2xl"
      />
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="relative -rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="gauge-plasma" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.78 0.16 195)" />
            <stop offset="55%" stopColor="oklch(0.72 0.2 265)" />
            <stop offset="100%" stopColor="oklch(0.68 0.24 330)" />
          </linearGradient>
        </defs>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="oklch(0.3 0.045 285)"
          strokeWidth={STROKE}
          opacity={0.5}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#gauge-plasma)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
          style={{ filter: "drop-shadow(0 0 10px oklch(0.72 0.2 265 / 0.7))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-5xl font-bold tabular-nums text-foreground md:text-6xl">
          {percent}
          <span className="text-2xl text-muted-foreground md:text-3xl">%</span>
        </span>
        <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Potencia
        </span>
      </div>
    </div>
  );
}
