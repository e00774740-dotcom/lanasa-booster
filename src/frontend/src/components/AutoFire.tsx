import type { AutoSettings } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  useAutoSettings,
  useRecordBoost,
  useResetAutoSettings,
  useSaveAutoSettings,
} from "@/hooks/useQueries";
import { Crosshair, RotateCcw, Save, Target, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

/** Script defaults for the six burst parameters. */
export const AUTO_DEFAULTS = {
  buttonX: 940,
  buttonY: 2080,
  swipeDistance: 150,
  gestureDuration: 80,
  pauseBetween: 45,
  shotsPerBurst: 5,
  refreshRate: 120,
} as const;

type FieldKey = Exclude<keyof typeof AUTO_DEFAULTS, "refreshRate">;

type FieldSpec = {
  key: FieldKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  hint: string;
};

const FIELDS: FieldSpec[] = [
  {
    key: "buttonX",
    label: "Botón X",
    unit: "px",
    min: 0,
    max: 100000,
    step: 1,
    hint: "Coordenada horizontal del botón en pantalla.",
  },
  {
    key: "buttonY",
    label: "Botón Y",
    unit: "px",
    min: 0,
    max: 100000,
    step: 1,
    hint: "Coordenada vertical del botón en pantalla.",
  },
  {
    key: "swipeDistance",
    label: "Distancia del gesto",
    unit: "px",
    min: 1,
    max: 2000,
    step: 1,
    hint: "Recorrido del deslizamiento desde el botón.",
  },
  {
    key: "gestureDuration",
    label: "Duración del gesto",
    unit: "ms",
    min: 1,
    max: 5000,
    step: 1,
    hint: "Tiempo que tarda el deslizamiento.",
  },
  {
    key: "pauseBetween",
    label: "Pausa entre gestos",
    unit: "ms",
    min: 0,
    max: 5000,
    step: 1,
    hint: "Espera antes del siguiente gesto.",
  },
  {
    key: "shotsPerBurst",
    label: "Disparos por ráfaga",
    unit: "disparos",
    min: 1,
    max: 100,
    step: 1,
    hint: "Número de gestos que forman la ráfaga.",
  },
];

type Draft = Record<FieldKey, string>;

function toDraft(settings: AutoSettings): Draft {
  return {
    buttonX: settings.buttonX.toString(),
    buttonY: settings.buttonY.toString(),
    swipeDistance: settings.swipeDistance.toString(),
    gestureDuration: settings.gestureDuration.toString(),
    pauseBetween: settings.pauseBetween.toString(),
    shotsPerBurst: settings.shotsPerBurst.toString(),
  };
}

/** The refresh rate is owned by the 120 FPS module; Auto preserves it as-is. */
function refreshRateOf(settings: AutoSettings | null | undefined): bigint {
  return settings?.refreshRate ?? BigInt(AUTO_DEFAULTS.refreshRate);
}

/** Shizuku activation is owned by the 120 FPS module; Auto preserves it as-is. */
function shizukuActiveOf(settings: AutoSettings | null | undefined): boolean {
  return settings?.shizukuActive ?? false;
}

function defaultsDraft(): Draft {
  return {
    buttonX: String(AUTO_DEFAULTS.buttonX),
    buttonY: String(AUTO_DEFAULTS.buttonY),
    swipeDistance: String(AUTO_DEFAULTS.swipeDistance),
    gestureDuration: String(AUTO_DEFAULTS.gestureDuration),
    pauseBetween: String(AUTO_DEFAULTS.pauseBetween),
    shotsPerBurst: String(AUTO_DEFAULTS.shotsPerBurst),
  };
}

function validateField(spec: FieldSpec, raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return "Introduce un valor.";
  if (!/^\d+$/.test(trimmed)) return "Usa solo números enteros.";
  const value = Number(trimmed);
  if (value < spec.min || value > spec.max) {
    return `Debe estar entre ${spec.min} y ${spec.max} ${spec.unit}.`;
  }
  return null;
}

function toSettings(
  draft: Draft,
  refreshRate: bigint,
  shizukuActive: boolean,
): AutoSettings {
  return {
    buttonX: BigInt(draft.buttonX.trim()),
    buttonY: BigInt(draft.buttonY.trim()),
    swipeDistance: BigInt(draft.swipeDistance.trim()),
    gestureDuration: BigInt(draft.gestureDuration.trim()),
    pauseBetween: BigInt(draft.pauseBetween.trim()),
    shotsPerBurst: BigInt(draft.shotsPerBurst.trim()),
    refreshRate,
    shizukuActive,
  };
}

function GesturePreview({ draft }: { draft: Draft }) {
  const x = Number(draft.buttonX) || 0;
  const y = Number(draft.buttonY) || 0;
  const distance = Number(draft.swipeDistance) || 0;
  const duration = Number(draft.gestureDuration) || 0;

  // Map the button position into the preview box (0-100%).
  const left = Math.max(4, Math.min(96, (x / 2000) * 100));
  const top = Math.max(6, Math.min(94, (y / 3000) * 100));
  const arrowLength = Math.max(8, Math.min(46, (distance / 2000) * 46));

  return (
    <div
      data-ocid="auto.preview"
      className="relative h-44 w-full overflow-hidden rounded-2xl border border-border bg-background/60"
    >
      <div
        className="starfield absolute inset-0 opacity-60"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.3 0.045 285 / 0.5) 1px, transparent 1px), linear-gradient(90deg, oklch(0.3 0.045 285 / 0.5) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        style={{ left: `${left}%`, top: `${top}%` }}
      >
        <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-plasma text-primary-foreground shadow-plasma">
          <Target className="size-4" aria-hidden="true" />
        </span>
        <span className="mt-1 rounded-full border border-border bg-card/90 px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
          {x} · {y}
        </span>
      </div>
      <div
        className="absolute flex -translate-y-1/2 items-center gap-1"
        style={{ left: `${left}%`, top: `${top}%` }}
        aria-hidden="true"
      >
        <span
          className="h-0.5 rounded-full bg-gradient-primary"
          style={{ width: `${arrowLength}px` }}
        />
        <Crosshair className="size-3 text-primary" />
      </div>
      <p className="absolute bottom-2 left-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Desliza {distance} px · {duration} ms
      </p>
    </div>
  );
}

export function AutoFire() {
  const settingsQuery = useAutoSettings();
  const saveSettings = useSaveAutoSettings();
  const resetSettings = useResetAutoSettings();
  const recordBoost = useRecordBoost();

  const [draft, setDraft] = useState<Draft>(defaultsDraft);
  const [initialized, setInitialized] = useState(false);
  const [shot, setShot] = useState(0);
  const [burstDone, setBurstDone] = useState(false);
  const [burstError, setBurstError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // One-time initialization from the loaded settings; never overwrites edits.
  useEffect(() => {
    if (!initialized && settingsQuery.data) {
      setDraft(toDraft(settingsQuery.data));
      setInitialized(true);
    }
  }, [initialized, settingsQuery.data]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const errors = useMemo(() => {
    const result = {} as Record<FieldKey, string | null>;
    for (const spec of FIELDS) {
      result[spec.key] = validateField(spec, draft[spec.key]);
    }
    return result;
  }, [draft]);

  const hasErrors = FIELDS.some((spec) => errors[spec.key] !== null);
  const isSaving = saveSettings.isPending || resetSettings.isPending;
  const isFiring = shot > 0;
  const shots = Number(draft.shotsPerBurst) || 0;

  const updateField = (key: FieldKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setBurstDone(false);
    setBurstError(null);
  };

  const handleRestore = () => {
    setBurstDone(false);
    setBurstError(null);
    resetSettings.mutate(undefined, {
      onSuccess: (settings) => {
        setDraft(toDraft(settings));
        setInitialized(true);
        toast.success("Valores restaurados", {
          description: "Los seis parámetros vuelven a los valores del script.",
        });
      },
      onError: () => {
        toast.error("No se pudieron restaurar los valores");
      },
    });
  };

  const handleSave = () => {
    if (hasErrors || isSaving || isFiring) return;
    setBurstDone(false);
    setBurstError(null);
    saveSettings.mutate(
      toSettings(
        draft,
        refreshRateOf(settingsQuery.data),
        shizukuActiveOf(settingsQuery.data),
      ),
      {
        onSuccess: () => {
          toast.success("Parámetros guardados", {
            description: "Los seis parámetros se han guardado en tu cuenta.",
          });
        },
        onError: () => {
          toast.error("No se pudieron guardar los parámetros", {
            description: "Revisa tu conexión e inténtalo de nuevo.",
          });
        },
      },
    );
  };

  const handleFire = () => {
    if (hasErrors || isFiring) return;
    setBurstDone(false);
    setBurstError(null);
    setShot(0);

    const settings = toSettings(
      draft,
      refreshRateOf(settingsQuery.data),
      shizukuActiveOf(settingsQuery.data),
    );
    const total = Number(settings.shotsPerBurst);
    const pause = Number(settings.pauseBetween);

    saveSettings.mutate(settings, {
      onError: () => {
        setBurstError(
          "No se pudieron guardar los parámetros. Revisa tu conexión.",
        );
      },
    });

    let current = 0;
    const step = () => {
      current += 1;
      setShot(current);
      if (current < total) {
        timerRef.current = window.setTimeout(step, Math.max(0, pause));
        return;
      }
      recordBoost.mutate(undefined, {
        onSuccess: (updated) => {
          setShot(0);
          setBurstDone(true);
          toast.success("¡Ráfaga completada!", {
            description: `${total} disparos registrados. Potencia actual: ${Number(
              updated.powerLevel,
            )}%.`,
          });
        },
        onError: () => {
          setShot(0);
          setBurstError(
            "La ráfaga terminó pero no se pudo registrar el boost. Inténtalo de nuevo.",
          );
        },
      });
    };
    timerRef.current = window.setTimeout(step, 0);
  };

  if (settingsQuery.isLoading) {
    return (
      <section
        aria-labelledby="auto-heading"
        data-ocid="auto.panel"
        className="rounded-3xl border border-border bg-card/60 p-6 shadow-elevated backdrop-blur md:p-8"
      >
        <h2
          id="auto-heading"
          className="font-display text-lg font-bold tracking-tight text-foreground"
        >
          Módulo Auto
        </h2>
        <div
          data-ocid="auto.loading_state"
          className="mt-4 space-y-3"
          aria-busy="true"
        >
          {Array.from({ length: 3 }, (_, i) => `auto-skeleton-${i}`).map(
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
        aria-labelledby="auto-heading"
        data-ocid="auto.panel"
        className="rounded-3xl border border-border bg-card/60 p-6 shadow-elevated backdrop-blur md:p-8"
      >
        <h2
          id="auto-heading"
          className="font-display text-lg font-bold tracking-tight text-foreground"
        >
          Módulo Auto
        </h2>
        <div
          data-ocid="auto.error_state"
          role="alert"
          className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-4"
        >
          <p className="text-sm text-destructive">
            No se pudieron cargar tus parámetros Auto.
          </p>
          <Button
            type="button"
            variant="outline"
            data-ocid="auto.retry_button"
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

  return (
    <section
      aria-labelledby="auto-heading"
      data-ocid="auto.panel"
      className="motion-safe:animate-fade-up rounded-3xl border border-border bg-card/60 p-6 shadow-elevated backdrop-blur md:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow-cyan">
          <Crosshair className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2
            id="auto-heading"
            className="font-display text-lg font-bold tracking-tight text-foreground"
          >
            Módulo Auto
          </h2>
          <p className="text-sm text-muted-foreground">
            Ajusta los seis parámetros de la ráfaga y lánzala.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((spec) => {
            const error = errors[spec.key];
            const inputId = `auto-${spec.key}`;
            const errorId = `${inputId}-error`;
            return (
              <div key={spec.key} className="flex flex-col gap-1.5">
                <Label
                  htmlFor={inputId}
                  className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {spec.label}
                  <span className="ml-1 font-mono normal-case text-muted-foreground/70">
                    ({spec.unit})
                  </span>
                </Label>
                <Input
                  id={inputId}
                  data-ocid={`auto.input.${spec.key}`}
                  type="number"
                  inputMode="numeric"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={draft[spec.key]}
                  aria-invalid={error !== null}
                  aria-describedby={error ? errorId : undefined}
                  onChange={(event) =>
                    updateField(spec.key, event.target.value)
                  }
                  className="rounded-xl border-input bg-background/60 font-mono tabular-nums"
                />
                {error ? (
                  <p
                    id={errorId}
                    data-ocid={`auto.error.${spec.key}`}
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {error}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">{spec.hint}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          <GesturePreview draft={draft} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              data-ocid="auto.restore_button"
              onClick={handleRestore}
              disabled={isSaving || isFiring}
              className="rounded-full border-border text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {resetSettings.isPending ? "Restaurando…" : "Restaurar valores"}
            </Button>
            <Button
              type="button"
              variant="outline"
              data-ocid="auto.save_button"
              onClick={handleSave}
              disabled={hasErrors || isSaving || isFiring}
              className="rounded-full border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Save className="size-4" aria-hidden="true" />
              {saveSettings.isPending ? "Guardando…" : "Guardar parámetros"}
            </Button>
            <Button
              type="button"
              data-ocid="auto.fire_button"
              onClick={handleFire}
              disabled={hasErrors || isFiring || isSaving}
              className="h-12 flex-1 rounded-full bg-gradient-plasma font-display text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-plasma transition-smooth hover:brightness-110 disabled:opacity-60"
            >
              <Zap className="size-4" aria-hidden="true" />
              {isFiring ? `Disparando ${shot}/${shots}` : "Disparar ráfaga"}
            </Button>
          </div>

          {isFiring && (
            <div data-ocid="auto.progress" className="flex flex-col gap-1.5">
              <Progress
                value={shots > 0 ? (shot / shots) * 100 : 0}
                className="h-2"
              />
              <p
                aria-live="polite"
                className="font-mono text-xs tabular-nums text-muted-foreground"
              >
                Disparo {shot} de {shots}
              </p>
            </div>
          )}

          {burstDone && !isFiring && (
            <output
              data-ocid="auto.success_state"
              aria-live="polite"
              className="block rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary"
            >
              Ráfaga completada. El boost se ha registrado en tu historial.
            </output>
          )}

          {burstError && (
            <p
              data-ocid="auto.error_state"
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {burstError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
