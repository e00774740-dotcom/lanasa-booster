import App from "@/App";
import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import type { AutoSettings, backendInterface } from "@/backend";
import { RefreshRate } from "@/components/RefreshRate";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Characterization baseline for the existing «120 FPS» card behavior the
 * accepted request says must keep working while the card gains 60/90/120
 * selection and a Shizuku activation section: the shell script it shows, the
 * copy confirmation, the loading skeleton, the error + retry path, the Android
 * permission note, and the per-user read seam. The new selection and Shizuku
 * behavior is intentionally not asserted here.
 */

/** A non-anonymous identity so the private console mounts. */
function signedInIdentity() {
  return {
    getPrincipal: () => ({
      isAnonymous: () => false,
      toText: () => "aaaaa-aa",
    }),
  } as unknown as Parameters<typeof setIdentityForTest>[0] extends {
    identity?: infer I;
  }
    ? I
    : never;
}

const SCRIPT_DEFAULTS: AutoSettings = {
  buttonX: 940n,
  buttonY: 2080n,
  swipeDistance: 150n,
  gestureDuration: 80n,
  pauseBetween: 45n,
  shotsPerBurst: 5n,
  refreshRate: 120n,
  shizukuActive: false,
};

type RefreshActor = Pick<
  backendInterface,
  | "getBoostStats"
  | "listBoosts"
  | "recordBoost"
  | "resetBoosts"
  | "getAutoSettings"
  | "saveAutoSettings"
  | "resetAutoSettings"
>;

function makeActor(overrides: Partial<RefreshActor> = {}) {
  const actor: RefreshActor = {
    getBoostStats: vi.fn<backendInterface["getBoostStats"]>(async () => ({
      totalBoosts: 0n,
      powerLevel: 0n,
    })),
    listBoosts: vi.fn<backendInterface["listBoosts"]>(async () => []),
    recordBoost: vi.fn<backendInterface["recordBoost"]>(async () => ({
      totalBoosts: 1n,
      powerLevel: 1n,
    })),
    resetBoosts: vi.fn<backendInterface["resetBoosts"]>(async () => ({
      totalBoosts: 0n,
      powerLevel: 0n,
    })),
    getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(async () => ({
      ...SCRIPT_DEFAULTS,
    })),
    saveAutoSettings: vi.fn<backendInterface["saveAutoSettings"]>(
      async (settings) => ({ ...settings }),
    ),
    resetAutoSettings: vi.fn<backendInterface["resetAutoSettings"]>(
      async () => ({ ...SCRIPT_DEFAULTS }),
    ),
    ...overrides,
  };
  return actor;
}

/** The card renders a loading section with the same ocid, so wait for the form. */
async function waitForRefreshCard() {
  return screen.findByTestId("refresh.copy_button");
}

beforeEach(() => {
  setIdentityForTest({ identity: signedInIdentity() });
});

describe("existing 120 FPS card baseline", () => {
  it("renders the card beside the Auto module on the default route", async () => {
    renderWithActor(<App />, makeActor());

    expect(await screen.findByTestId("refresh.panel")).toBeInTheDocument();
    expect(await screen.findByTestId("auto.panel")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /120 FPS/ }),
    ).toBeInTheDocument();
  });

  it("shows the full shell script with every required command", async () => {
    renderWithActor(<App />, makeActor());

    const code = await screen.findByTestId("refresh.code_block");
    const text = code.textContent ?? "";
    expect(text).toContain("min_refresh_rate");
    expect(text).toContain("peak_refresh_rate");
    expect(text).toContain("refresh_rate_mode");
    expect(text).toContain("SurfaceFlinger");
    expect(text).toContain("set-user-preferred-display-mode");
  });

  it("shows the Android 10/11+ and shell/root permission note", async () => {
    renderWithActor(<App />, makeActor());

    const note = await screen.findByTestId("refresh.note");
    expect(note).toHaveTextContent(/Android 10 u 11/i);
    expect(note).toHaveTextContent(/shell o root/i);
  });

  it("copies the script to the clipboard and confirms it", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn<(text: string) => Promise<void>>(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderWithActor(<App />, makeActor());

    await waitForRefreshCard();
    await user.click(screen.getByTestId("refresh.copy_button"));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = writeText.mock.calls[0][0];
    expect(copied).toContain("min_refresh_rate");
    expect(copied).toContain("SurfaceFlinger");
    expect(
      await screen.findByTestId("refresh.success_state"),
    ).toHaveTextContent(/copiado/i);
  });

  it("shows a loading skeleton while the saved setting is pending", async () => {
    let resolveSettings: (value: AutoSettings) => void = () => {};
    const actor = makeActor({
      getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(
        () =>
          new Promise<AutoSettings>((resolve) => {
            resolveSettings = resolve;
          }),
      ),
    });
    renderWithActor(<App />, actor);

    expect(
      await screen.findByTestId("refresh.loading_state"),
    ).toBeInTheDocument();

    resolveSettings({ ...SCRIPT_DEFAULTS });
    expect(
      await screen.findByTestId("refresh.copy_button"),
    ).toBeInTheDocument();
  });

  it("shows an error with a working retry when the setting fails to load", async () => {
    const user = userEvent.setup();
    // Render the card alone so only its own getAutoSettings query runs; every
    // call fails until the retry flips the flag.
    let failing = true;
    const actor = makeActor({
      getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(async () => {
        if (failing) throw new Error("boom");
        return { ...SCRIPT_DEFAULTS };
      }),
    });
    renderWithActor(<RefreshRate />, actor);

    const error = await screen.findByTestId("refresh.error_state");
    expect(error).toHaveTextContent(/no se pudo cargar/i);

    failing = false;
    await user.click(screen.getByTestId("refresh.retry_button"));

    expect(
      await screen.findByTestId("refresh.copy_button"),
    ).toBeInTheDocument();
  });

  it("reflects the caller's own stored rate through the per-user read seam", async () => {
    const actor = makeActor({
      getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(async () => ({
        ...SCRIPT_DEFAULTS,
        refreshRate: 90n,
      })),
    });
    renderWithActor(<App />, actor);

    await waitForRefreshCard();
    // The card reflects the caller's own stored rate, not a shared default.
    expect(
      within(screen.getByTestId("refresh.panel")).getByText("90 Hz"),
    ).toBeInTheDocument();
  });
});
