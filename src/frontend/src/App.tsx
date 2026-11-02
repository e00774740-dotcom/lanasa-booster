import { AutoFire } from "@/components/AutoFire";
import { BoostGauge } from "@/components/BoostGauge";
import { BoostHistory } from "@/components/BoostHistory";
import { FFPerformanceCore } from "@/components/FFPerformanceCore";
import { AuthenticatedApp } from "@/components/InternetIdentity";
import { Layout } from "@/components/Layout";
import { RefreshRate } from "@/components/RefreshRate";
import { Button } from "@/components/ui/button";
import {
  useBoostList,
  useBoostStats,
  useRecordBoost,
  useResetBoosts,
} from "@/hooks/useQueries";
import { clampPowerLevel } from "@/lib/format";
import { Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Toaster, toast } from "sonner";

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "primary" | "accent";
}) {
  const dotClass = accent === "primary" ? "bg-primary" : "bg-accent";
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-subtle backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span
          className={`size-2 rounded-full ${dotClass}`}
          aria-hidden="true"
        />
      </div>
      <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function BoostConsole() {
  const statsQuery = useBoostStats();
  const listQuery = useBoostList();
  const recordBoost = useRecordBoost();
  const resetBoosts = useResetBoosts();
  const [ignition, setIgnition] = useState(0);

  const totalBoosts = statsQuery.data?.totalBoosts ?? 0n;
  const powerLevel = statsQuery.data?.powerLevel ?? 0n;
  const boosts = listQuery.data ?? [];
  const percent = clampPowerLevel(powerLevel);

  const handleBoost = () => {
    setIgnition((n) => n + 1);
    recordBoost.mutate(undefined, {
      onSuccess: (updated) => {
        toast.success("¡Impulso activado!", {
          description: `Potencia actual: ${clampPowerLevel(updated.powerLevel)}%`,
        });
      },
      onError: () => {
        toast.error("No se pudo activar el impulso", {
          description: "Inténtalo de nuevo en unos segundos.",
        });
      },
    });
  };

  const handleReset = () => {
    resetBoosts.mutate(undefined, {
      onSuccess: () => {
        toast.success("Contador reiniciado", {
          description: "El historial de impulsos se ha vaciado.",
        });
      },
      onError: () => {
        toast.error("No se pudo reiniciar el contador");
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="boost-heading"
        data-ocid="boost.panel"
        className="animate-fade-up rounded-3xl border border-border bg-card/60 p-6 shadow-elevated backdrop-blur md:p-8"
      >
        <h2 id="boost-heading" className="sr-only">
          Panel de boost
        </h2>

        <div className="relative">
          <BoostGauge powerLevel={powerLevel} />
          <AnimatePresence>
            {ignition > 0 && (
              <motion.div
                key={ignition}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0.9, scale: 0.6 }}
                animate={{ opacity: 0, scale: 1.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              >
                <span className="size-40 rounded-full border-2 border-primary/70" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Button
            type="button"
            data-ocid="boost.primary_button"
            onClick={handleBoost}
            disabled={recordBoost.isPending}
            className="h-14 w-full max-w-md rounded-full bg-gradient-plasma font-display text-base font-bold uppercase tracking-wider text-primary-foreground shadow-plasma transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-70"
          >
            <Zap className="size-5" aria-hidden="true" />
            {recordBoost.isPending ? "Ignición…" : "Activar Boost"}
          </Button>
          <p
            data-ocid="boost.success_state"
            className="min-h-5 text-sm text-muted-foreground"
            aria-live="polite"
          >
            {recordBoost.isSuccess
              ? "Propulsión confirmada. ¡Motores a plena potencia!"
              : "Pulsa para encender los motores."}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <StatCard
            label="Boosts totales"
            value={totalBoosts.toString()}
            accent="primary"
          />
          <StatCard
            label="Nivel de potencia"
            value={`${percent}%`}
            accent="accent"
          />
        </div>
      </section>

      <AutoFire />

      <RefreshRate />

      <FFPerformanceCore />

      <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <BoostHistory
          boosts={boosts}
          isLoading={listQuery.isLoading}
          isResetting={resetBoosts.isPending}
          onReset={handleReset}
        />
      </div>

      {listQuery.isError && (
        <p
          role="alert"
          data-ocid="history.error_state"
          className="text-sm text-destructive"
        >
          No se pudo cargar el historial. Recarga la página para reintentar.
        </p>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <AuthenticatedApp
        title="Inicia sesión en LaNasa🥷🏻 Booster"
        description="Accede con Internet Identity para guardar tus impulsos y tu nivel de potencia."
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center text-foreground"
        buttonClassName="rounded-full bg-gradient-plasma px-6 py-3 font-display font-bold uppercase tracking-wider text-primary-foreground shadow-plasma focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      >
        <BoostConsole />
      </AuthenticatedApp>
      <Toaster theme="dark" position="top-center" richColors />
    </Layout>
  );
}
