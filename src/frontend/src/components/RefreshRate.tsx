import type { AutoSettings } from "@/backend";
import { Button } from "@/components/ui/button";
import {
  useActivateShizuku,
  useRefreshSettings,
  useResetRefreshSettings,
  useSaveRefreshSettings,
} from "@/hooks/useQueries";
import {
  Check,
  Copy,
  Gauge,
  Loader2,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/** Default refresh rate stored per user by the backend. */
export const REFRESH_DEFAULT = 120;

/** The three refresh rates the card offers. */
export const REFRESH_OPTIONS = [60, 90, 120] as const;

export type RefreshOption = (typeof REFRESH_OPTIONS)[number];

/** Shell script that forces a 120 Hz refresh rate on Android 10/11+. */
export const REFRESH_SCRIPT = buildRefreshScript(REFRESH_DEFAULT);

/** Builds the shell script for a chosen refresh rate. */
export function buildRefreshScript(fps: number): string {
  return `#!/system/bin/sh
FPS=${fps}
settings put system min_refresh_rate $FPS
settings put system peak_refresh_rate $FPS
settings put system refresh_rate_mode 1
service call SurfaceFlinger 1035 i32 0
MODE=$(cmd display get-displays | grep -o 'id=[0-9]*' | head -n1 | cut -d= -f2)
cmd display set-user-preferred-display-mode $MODE`;
}

/** Narrows a stored bigint to one of the offered options, defaulting to 120. */
function normalizeRate(rate: bigint | undefined): RefreshOption {
  const value = Number(rate ?? BigInt(REFRESH_DEFAULT));
  return (REFRESH_OPTIONS as readonly number[]).includes(value)
    ? (value as RefreshOption)
    : REFRESH_DEFAULT;
}

/**
 * Shizuku is an Android app that grants shell-level access without root. The
 * browser cannot query it directly, so availability is inferred from the
 * platform: on Android the activation flow is offered, elsewhere the card
 * explains how to install or start it and stays usable.
 */
function detectShizukuAvailable(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

type ActivationState = "idle" | "starting" | "active" | "error";

export function RefreshRate() {
  const settingsQuery = useRefreshSettings();
  const saveSettings = useSaveRefreshSettings();
  const resetSettings = useResetRefreshSettings();
  const activateShizuku = useActivateShizuku();

  const [selected, setSelected] = useState<RefreshOption>(REFRESH_DEFAULT);
  const [initialized, setInitialized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activation, setActivation] = useState<ActivationState>("idle");

  const shizukuAvailable = useMemo(detectShizukuAvailable, []);

  // One-time initialization from the caller's stored rate; never overwrites a
  // selection the user has already made.
  useEffect(() => {
    if (!initialized && settingsQuery.data) {
      setSelected(normalizeRate(settingsQuery.data.refreshRate));
      setInitialized(true);
    }
  }, [initialized, settingsQuery.data]);

  // Reflect the stored activation flag once the settings load.
  useEffect(() => {
    if (settingsQuery.data?.shizukuActive) {
      setActivation((current) => (current === "starting" ? current : "active"));
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 4000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const script = useMemo(() => buildRefreshScript(selected), [selected]);

  const handleCopy = async () => {
    try {
      await copyText(script);
      setCopied(true);
      toast.success("Script copiado", {
        description: "Pégalo en una terminal con permisos de shell o root.",
      });
    } catch {
      toast.error("No se pudo copiar el script", {
        description: "Selecciona el texto manualmente e inténtalo de nuevo.",
      });
    }
  };

  const handleSave = () => {
    if (!settingsQuery.data) return;
    setSaved(false);
    const next: AutoSettings = {
      ...settingsQuery.data,
      refreshRate: BigInt(selected),
    };
    saveSettings.mutate(next, {
      onSuccess: () => {
        setSaved(true);
        toast.success("Ajuste guardado", {
          description: `Frecuencia de ${selected} Hz guardada en tu cuenta.`,
        });
      },
      onError: () => {
        toast.error("No se pudo guardar el ajuste", {
          description: "Revisa tu conexión e inténtalo de nuevo.",
        });
      },
    });
  };

  const handleRestore = () => {
    setSaved(false);
    resetSettings.mutate(undefined, {
      onSuccess: () => {
        setSelected(REFRESH_DEFAULT);
        setSaved(true);
        toast.success("Ajuste restaurado", {
          description: `La frecuencia vuelve a ${REFRESH_DEFAULT} Hz.`,
        });
      },
      onError: () => {
        toast.error("No se pudo restaurar el ajuste");
      },
    });
  };

  const handleActivate = () => {
    if (!settingsQuery.data) return;
    setActivation("starting");
    activateShizuku.mutate(settingsQuery.data, {
      onSuccess: () => {
        setActivation("active");
        toast.success("Shizuku activado", {
          description: `Se aplicará ${selected} Hz sin root en tu dispositivo.`,
        });
      },
      onError: () => {
        setActivation("error");
        toast.error("No se pudo activar con Shizuku", {
          description:
            "Comprueba que Shizuku está en marcha e inténtalo de nuevo.",
        });
      },
    });
  };

  if (settingsQuery.isLoading) {
    return (
      <section
        aria-labelledby="refresh-heading"
        data-ocid="refresh.panel"
        className="rounded-3xl border border-border bg-card/60 p-6 shadow-elevated backdrop-blur md:p-8"
      >
        <h2
          id="refresh-heading"
          className="font-display text-lg font-bold tracking-tight text-foreground"
        >
          Módulo de frecuencia
        </h2>
        <div
          data-ocid="refresh.loading_state"
          className="mt-4 space-y-3"
          aria-busy="true"
        >
          {Array.from({ length: 4 }, (_, i) => `refresh-skeleton-${i}`).map(
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
        aria-labelledby="refresh-heading"
        data-ocid="refresh.panel"
        className="rounded-3xl border border-border bg-card/60 p-6 shadow-elevated backdrop-blur md:p-8"
      >
        <h2
          id="refresh-heading"
          className="font-display text-lg font-bold tracking-tight text-foreground"
        >
          Módulo de frecuencia
        </h2>
        <div
          data-ocid="refresh.error_state"
          role="alert"
          className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-4"
        >
          <p className="text-sm text-destructive">
            No se pudo cargar tu ajuste de frecuencia.
          </p>
          <Button
            type="button"
            variant="outline"
            data-ocid="refresh.retry_button"
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

  const isSaving = saveSettings.isPending || resetSettings.isPending;
  const isActivating = activateShizuku.isPending;
  const storedRate = normalizeRate(settingsQuery.data?.refreshRate);

  return (
    <section
      aria-labelledby="refresh-heading"
      data-ocid="refresh.panel"
      className="motion-safe:animate-fade-up rounded-3xl border border-border bg-card/60 p-6 shadow-elevated backdrop-blur md:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-gradient-plasma text-primary-foreground shadow-plasma">
          <Gauge className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2
            id="refresh-heading"
            className="font-display text-lg font-bold tracking-tight text-foreground"
          >
            Módulo de frecuencia
          </h2>
          <p className="text-sm text-muted-foreground">
            Elige 60, 90 o 120 Hz y aplícalo en tu dispositivo Android.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Script de shell
            </span>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs tabular-nums text-primary">
              {selected} Hz
            </span>
          </div>
          <pre
            data-ocid="refresh.code_block"
            className="max-h-80 overflow-auto rounded-2xl border border-border bg-background/70 p-4 font-mono text-xs leading-relaxed text-foreground"
          >
            <code>{script}</code>
          </pre>
        </div>

        <div className="flex flex-col gap-4">
          <fieldset
            data-ocid="refresh.options"
            className="rounded-2xl border border-border bg-background/40 p-4"
          >
            <legend className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Frecuencia objetivo
            </legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {REFRESH_OPTIONS.map((option) => {
                const isSelected = option === selected;
                return (
                  <button
                    key={option}
                    type="button"
                    data-ocid={`refresh.option.${option}`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelected(option);
                      setSaved(false);
                    }}
                    className={`flex min-h-14 flex-col items-center justify-center rounded-xl border font-display text-sm font-bold tabular-nums transition-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                      isSelected
                        ? "border-primary/60 bg-gradient-plasma text-primary-foreground shadow-plasma"
                        : "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {option}
                    <span className="font-mono text-[10px] font-normal uppercase tracking-widest opacity-80">
                      Hz
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Guardado en tu cuenta:{" "}
              <span className="font-mono tabular-nums text-foreground">
                {storedRate} Hz
              </span>
            </p>
          </fieldset>

          <div
            data-ocid="refresh.note"
            className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3"
          >
            <ShieldAlert
              className="mt-0.5 size-4 shrink-0 text-warning"
              aria-hidden="true"
            />
            <p className="text-sm text-warning">
              Este ajuste es para Android 10 u 11 y versiones posteriores, y
              requiere permisos de shell o root en el dispositivo.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              data-ocid="refresh.copy_button"
              onClick={() => void handleCopy()}
              className="rounded-full border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
            >
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? "Copiado" : "Copiar script"}
            </Button>
            <Button
              type="button"
              variant="outline"
              data-ocid="refresh.restore_button"
              onClick={handleRestore}
              disabled={isSaving}
              className="rounded-full border-border text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {resetSettings.isPending ? "Restaurando…" : "Restaurar"}
            </Button>
            <Button
              type="button"
              data-ocid="refresh.save_button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-12 flex-1 rounded-full bg-gradient-plasma font-display text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-plasma transition-smooth hover:brightness-110 disabled:opacity-60"
            >
              <Save className="size-4" aria-hidden="true" />
              {saveSettings.isPending ? "Guardando…" : "Guardar ajuste"}
            </Button>
          </div>

          <output
            data-ocid="refresh.success_state"
            aria-live="polite"
            className="block min-h-5 text-sm text-muted-foreground"
          >
            {copied
              ? "Script copiado al portapapeles."
              : saved
                ? `Ajuste de ${selected} Hz guardado en tu cuenta.`
                : "Copia el script o guarda el ajuste en tu cuenta."}
          </output>
        </div>
      </div>

      <div
        data-ocid="refresh.shizuku_section"
        className="mt-6 rounded-2xl border border-border bg-background/40 p-4 md:p-5"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow-cyan">
            <Smartphone className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold tracking-tight text-foreground">
              Activación con Shizuku
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Shizuku aplica los ajustes de rendimiento en tu dispositivo sin
              necesidad de root.
            </p>
          </div>
        </div>

        {shizukuAvailable ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                data-ocid="refresh.shizuku_button"
                onClick={handleActivate}
                disabled={isActivating || activation === "active"}
                className="h-12 rounded-full bg-gradient-primary font-display text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-glow-cyan transition-smooth hover:brightness-110 disabled:opacity-60"
              >
                {isActivating ? (
                  <Loader2
                    className="size-4 motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ShieldCheck className="size-4" aria-hidden="true" />
                )}
                {isActivating ? "Activando…" : "Activar con Shizuku"}
              </Button>
              <output
                data-ocid="refresh.shizuku_state"
                aria-live="polite"
                className="text-sm text-muted-foreground"
              >
                {activation === "starting"
                  ? "Iniciando la activación con Shizuku…"
                  : activation === "active"
                    ? `Shizuku activo. Se aplicará ${selected} Hz sin root.`
                    : activation === "error"
                      ? "No se pudo activar. Comprueba que Shizuku está en marcha."
                      : "Aún no has activado Shizuku en este dispositivo."}
              </output>
            </div>
            {activation === "error" && (
              <p
                data-ocid="refresh.shizuku_error"
                role="alert"
                className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                La activación falló. Abre Shizuku, asegúrate de que está en
                marcha y vuelve a intentarlo.
              </p>
            )}
          </div>
        ) : (
          <div
            data-ocid="refresh.shizuku_unavailable"
            className="mt-4 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3"
          >
            <ShieldAlert
              className="mt-0.5 size-4 shrink-0 text-warning"
              aria-hidden="true"
            />
            <div className="text-sm text-warning">
              <p className="font-semibold">
                Shizuku no está disponible en este dispositivo.
              </p>
              <p className="mt-1">
                Instala Shizuku desde su web oficial, ábrelo y arranca el
                servicio para activar los ajustes sin root. Mientras tanto,
                puedes seguir copiando el script y guardando tu frecuencia.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
