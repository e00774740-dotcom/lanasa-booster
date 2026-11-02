import type { Boost } from "@/backend";
import { Button } from "@/components/ui/button";
import { formatBoostDate, formatBoostTime } from "@/lib/format";
import { Rocket, RotateCcw } from "lucide-react";

export function BoostHistory({
  boosts,
  isLoading,
  isResetting,
  onReset,
}: {
  boosts: Boost[];
  isLoading: boolean;
  isResetting: boolean;
  onReset: () => void;
}) {
  return (
    <section
      aria-labelledby="history-heading"
      data-ocid="history.section"
      className="rounded-2xl border border-border bg-card/70 p-5 shadow-subtle backdrop-blur"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id="history-heading"
          className="font-display text-lg font-bold tracking-tight text-foreground"
        >
          Historial de impulsos
        </h2>
        {boosts.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-ocid="history.reset_button"
            disabled={isResetting}
            onClick={onReset}
            className="rounded-full border-border text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {isResetting ? "Reiniciando…" : "Reiniciar"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <ul data-ocid="history.loading_state" className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => `history-skeleton-${i}`).map(
            (id) => (
              <li
                key={id}
                className="h-14 animate-pulse rounded-xl bg-muted/60"
              />
            ),
          )}
        </ul>
      ) : boosts.length === 0 ? (
        <div
          data-ocid="history.empty_state"
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Rocket className="size-6" aria-hidden="true" />
          </span>
          <p className="font-display text-base font-semibold text-foreground">
            Aún no hay impulsos
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Pulsa «Activar Boost» para encender los motores y registrar tu
            primer impulso.
          </p>
        </div>
      ) : (
        <ul data-ocid="history.list" className="space-y-2">
          {boosts.map((boost, index) => (
            <li
              key={boost.id.toString()}
              data-ocid={`history.item.${index + 1}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/40 px-4 py-3 transition-smooth hover:border-primary/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                  <Rocket className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold text-foreground">
                    Impulso #{boost.id.toString()}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatBoostDate(boost.timestamp)}
                  </p>
                </div>
              </div>
              <time
                dateTime={new Date(
                  Number(boost.timestamp / 1_000_000n),
                ).toISOString()}
                className="shrink-0 font-mono text-xs tabular-nums text-primary"
              >
                {formatBoostTime(boost.timestamp)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
