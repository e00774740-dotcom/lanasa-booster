import type { FfPerfSettings } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useFfPerfSettings,
  useResetFfPerfSettings,
  useSaveFfPerfSettings,
} from "@/hooks/useQueries";
import { Cpu, RotateCcw, Save, Thermometer, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/** Module calibration defaults, mirrored from the backend ff_perf v1.0 module. */
export const FF_PERF_DEFAULTS = {
  targetFps: 120,
  cpuGovernor: "performance",
  ioScheduler: "cfq",
  networkMode: "balanced",
  thermalProfile: "balanced",
} as const;

/** The FPS values the module offers. */
export const FF_PERF_FPS_OPTIONS = [60, 90, 120] as const;

type FpsOption = (typeof FF_PERF_FPS_OPTIONS)[number];

type ChoiceKey =
  | "cpuGovernor"
  | "ioScheduler"
  | "networkMode"
  | "thermalProfile";

type ChoiceSpec = {
  key: ChoiceKey;
  label: string;
  hint: string;
  options: readonly { value: string; label: string }[];
};

const CHOICES: ChoiceSpec[] = [
  {
    key: "cpuGovernor",
    label: "Governor de CPU",
    hint: "Cómo escala la frecuencia del procesador.",
    options: [
      { value: "performance", label: "Performance" },
      { value: "schedutil", label: "Schedutil" },
      { value: "powersave", label: "Powersave" },
    ],
  },
  {
    key: "ioScheduler",
    label: "Planificador de E/S",
    hint: "Orden de las lecturas y escrituras en disco.",
    options: [
      { value: "cfq", label: "CFQ" },
      { value: "deadline", label: "Deadline" },
      { value: "noop", label: "Noop" },
    ],
  },
  {
    key: "networkMode",
    label: "Modo de red",
    hint: "Prioridad entre latencia y estabilidad.",
    options: [
      { value: "balanced", label: "Equilibrado" },
      { value: "low-latency", label: "Baja latencia" },
      { value: "powersave", label: "Ahorro" },
    ],
  },
  {
    key: "thermalProfile",
    label: "Perfil térmico",
    hint: "Límite de temperatura antes de bajar el rendimiento.",
    options: [
      { value: "balanced", label: "Equilibrado" },
      { value: "performance", label: "Rendimiento" },
      { value: "cool", label: "Frío" },
    ],
  },
];

type Draft = {
  targetFps: string;
  cpuGovernor: string;
  ioScheduler: string;
  networkMode: string;
  thermalProfile: string;
};

function toDraft(settings: FfPerfSettings): Draft {
  return {
    targetFps: settings.targetFps.toString(),
    cpuGovernor: settings.cpuGovernor,
    ioScheduler: settings.ioScheduler,
    networkMode: settings.networkMode,
    thermalProfile: settings.thermalProfile,
  };
}

function defaultsDraft(): Draft {
  return {
    targetFps: String(FF_PERF_DEFAULTS.targetFps),
    cpuGovernor: FF_PERF_DEFAULTS.cpuGovernor,
    ioScheduler: FF_PERF_DEFAULTS.ioScheduler,
    networkMode: FF_PERF_DEFAULTS.networkMode,
    thermalProfile: FF_PERF_DEFAULTS.thermalProfile,
  };
}

/** Narrows a stored FPS value to one of the offered options, defaulting to 120. */
function normalizeFps(value: bigint | undefined): FpsOption {
  const numeric = Number(value ?? BigInt(FF_PERF_DEFAULTS.targetFps));
  return (FF_PERF_FPS_OPTIONS as readonly number[]).includes(numeric)
    ? (numeric as FpsOption)
    : FF_PERF_DEFAULTS.targetFps;
}

function validateFps(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return "Introduce un valor.";
  if (!/^\d+$/.test(trimmed)) return "Usa solo números enteros.";
  const value = Number(trimmed);
  if (value < 30 || value > 240) return "Debe estar entre 30 y 240 FPS.";
  return null;
}

function toSettings(draft: Draft): FfPerfSettings {
  return {
    targetFps: BigInt(draft.targetFps.trim()),
    cpuGovernor: draft.cpuGovernor,
    ioScheduler: draft.ioScheduler,
    networkMode: draft.networkMode,
    thermalProfile: draft.thermalProfile,
  };
}

export function FFPerformanceCore() {
  const settingsQuery = useFfPerfSettings();
  const saveSettings = useSaveFfPerfSettings();
  const resetSettings = useResetFfPerfSettings();

  const [draft, setDraft] = useState<Draft>(defaultsDraft);
  const [initialized, setInitialized] = useState(false);
  const [saved, setSaved] = useState(false);

  // One-time initialization from the loaded settings; never overwrites edits.
  useEffect(() => {
    if (!initialized && settingsQuery.data) {
      setDraft(toDraft(settingsQuery.data));
      setInitialized(true);
    }
  }, [initialized, settingsQuery.data]);

  const fpsError = useMemo(() => validateFps(draft.targetFps), [draft]);
  const isSaving = saveSettings.isPending || resetSettings.isPending;

  const updateField = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    if (fpsError !== null || isSaving || !settingsQuery.data) return;
    setSaved(false);
    saveSettings.mutate(toSettings(draft), {
      onSuccess: () => {
        setSaved(true);
        toast.success("Ajustes guardados", {
          description: "La configuración FF Performance se ha guardado.",
        });
      },
      onError: () => {
        toast.error("No se pudieron guardar los ajustes", {
          description: "Revisa tu conexión e inténtalo de nuevo.",
        });
      },
    });
  };

  const handleRestore = () => {
    setSaved(false);
    resetSettings.mutate(undefined, {
      onSuccess: (settings) => {
        setDraft(toDraft(settings));
        setInitialized(true);
        setSaved(true);
        toast.success("Valores restaurados", {
          description: "La configuración vuelve a los valores por defecto.",
        });
      },
      onError: () => {
        toast.error("No se pudieron restaurar los valores");
      },
    });
  };

  if (settingsQuery.isLoading) {
    return (
      <section
        aria-labelledby="ffperf-heading"
        data-ocid="ffperf.panel"
        className="rounded-3xl border border-border bg-card/60 p-6 shadow-elevated backdrop-blur md:p-8"
      >
        <h2
          id="ffperf-heading"
          className="font-display text-lg font-bold tracking-tight text-foreground"
        >
          FF Performance Core
        </h2>
        <div
          data-ocid="ffperf.loading_state"
          className="mt-4 space-y-3"
          aria-busy="true"
        >
          {Array.from({ length: 4 }, (_, i) => `ffperf-skeleton-${i}`).map(
            (id) => (
              <div
                key={id}
                className="h-12 motion-safe:animate-pulse rounded-xl bg-muted/60"
              />
            ),
          )}
        </div>
      </section>
    );
  }

  if (settingsQuery.isError) {
    return (
      <section
        aria-labelledby="ffperf-heading"
        data-ocid="ffperf.panel"
        className="rounded-3xl border border-border bg-card/60 p-6 shadow-elevated backdrop-blur md:p-8"
      >
        <h2
          id="ffperf-heading"
          className="font-display text-lg font-bold tracking-tight text-foreground"
        >
          FF Performance Core
        </h2>
        <div
          data-ocid="ffperf.error_state"
          role="alert"
          className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-4"
        >
          <p className="text-sm text-destructive">
            No se pudieron cargar tus ajustes FF Performance.
          </p>
          <Button
            type="button"
            variant="outline"
            data-ocid="ffperf.retry_button"
            onClick={() => void settingsQuery.refetch()}
            className="rounded-full border-border"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      </section>
    );
  }

  const storedFps = normalizeFps(settingsQuery.data?.targetFps);

  return (
    <section
      aria-labelledby="ffperf-heading"
      data-ocid="ffperf.panel"
      className="motion-safe:animate-fade-up rounded-3xl border border-border bg-card/60 p-6 shadow-elevated backdrop-blur md:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-gradient-plasma text-primary-foreground shadow-plasma">
          <Cpu className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2
            id="ffperf-heading"
            className="font-display text-lg font-bold tracking-tight text-foreground"
          >
            FF Performance Core
          </h2>
          <p className="text-sm text-muted-foreground">
            Desbloqueo de FPS, governors, I/O, red y thermal para gaming
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="ffperf-targetFps"
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              FPS objetivo
              <span className="ml-1 font-mono normal-case text-muted-foreground/70">
                (fps)
              </span>
            </Label>
            <Input
              id="ffperf-targetFps"
              data-ocid="ffperf.input.targetFps"
              type="number"
              inputMode="numeric"
              min={30}
              max={240}
              step={1}
              value={draft.targetFps}
              aria-invalid={fpsError !== null}
              aria-describedby={fpsError ? "ffperf-targetFps-error" : undefined}
              onChange={(event) => updateField("targetFps", event.target.value)}
              className="rounded-xl border-input bg-background/60 font-mono tabular-nums"
            />
            {fpsError ? (
              <p
                id="ffperf-targetFps-error"
                data-ocid="ffperf.error.targetFps"
                role="alert"
                className="text-xs text-destructive"
              >
                {fpsError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Frecuencia de refresco que intentará forzar el módulo.
              </p>
            )}
          </div>

          <fieldset
            data-ocid="ffperf.fps_options"
            className="rounded-2xl border border-border bg-background/40 p-4"
          >
            <legend className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Atajos de FPS
            </legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {FF_PERF_FPS_OPTIONS.map((option) => {
                const isSelected = Number(draft.targetFps) === option;
                return (
                  <button
                    key={option}
                    type="button"
                    data-ocid={`ffperf.fps_option.${option}`}
                    aria-pressed={isSelected}
                    onClick={() => updateField("targetFps", String(option))}
                    className={`flex min-h-14 flex-col items-center justify-center rounded-xl border font-display text-sm font-bold tabular-nums transition-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                      isSelected
                        ? "border-primary/60 bg-gradient-plasma text-primary-foreground shadow-plasma"
                        : "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {option}
                    <span className="font-mono text-[10px] font-normal uppercase tracking-widest opacity-80">
                      FPS
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Guardado en tu cuenta:{" "}
              <span className="font-mono tabular-nums text-foreground">
                {storedFps} FPS
              </span>
            </p>
          </fieldset>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {CHOICES.map((spec) => {
            const selectId = `ffperf-${spec.key}`;
            return (
              <div key={spec.key} className="flex flex-col gap-1.5">
                <Label
                  htmlFor={selectId}
                  className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {spec.label}
                </Label>
                <select
                  id={selectId}
                  data-ocid={`ffperf.select.${spec.key}`}
                  value={draft[spec.key]}
                  onChange={(event) =>
                    updateField(spec.key, event.target.value)
                  }
                  className="h-10 rounded-xl border border-input bg-background/60 px-3 font-mono text-sm text-foreground transition-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {spec.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">{spec.hint}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div
        data-ocid="ffperf.note"
        className="mt-6 flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3"
      >
        <Thermometer
          className="mt-0.5 size-4 shrink-0 text-warning"
          aria-hidden="true"
        />
        <p className="text-sm text-warning">
          Estos ajustes se guardan en tu cuenta. La aplicación real en el
          dispositivo requiere Shizuku y se realiza fuera de esta interfaz.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          data-ocid="ffperf.restore_button"
          onClick={handleRestore}
          disabled={isSaving}
          className="rounded-full border-border text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {resetSettings.isPending ? "Restaurando…" : "Restaurar valores"}
        </Button>
        <Button
          type="button"
          data-ocid="ffperf.save_button"
          onClick={handleSave}
          disabled={fpsError !== null || isSaving}
          className="h-12 flex-1 rounded-full bg-gradient-plasma font-display text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-plasma transition-smooth hover:brightness-110 disabled:opacity-60"
        >
          <Save className="size-4" aria-hidden="true" />
          {saveSettings.isPending ? "Guardando…" : "Guardar ajustes"}
        </Button>
      </div>

      <output
        data-ocid="ffperf.success_state"
        aria-live="polite"
        className="mt-3 block min-h-5 text-sm text-muted-foreground"
      >
        {saved
          ? "Ajustes FF Performance guardados en tu cuenta."
          : "Configura el módulo y guarda los ajustes en tu cuenta."}
      </output>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Zap className="size-3.5 text-primary" aria-hidden="true" />
        <span className="font-mono uppercase tracking-widest">
          ff_perf · v1.0
        </span>
      </div>
    </section>
  );
}
