/** Motoko `Time.now()` values are nanosecond bigints. */
export function timestampToDate(timestamp: bigint): Date | null {
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function formatBoostDate(timestamp: bigint): string {
  const date = timestampToDate(timestamp);
  if (!date) return "Fecha desconocida";
  return dateFormatter.format(date);
}

export function formatBoostTime(timestamp: bigint): string {
  const date = timestampToDate(timestamp);
  if (!date) return "--:--:--";
  return timeFormatter.format(date);
}

/** Power level is a 0-100 percentage derived from the boost count. */
export function clampPowerLevel(powerLevel: bigint): number {
  const value = Number(powerLevel);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
