import App from "@/App";
import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import type { AutoSettings, backendInterface } from "@/backend";
import { RefreshRate } from "@/components/RefreshRate";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cover for the accepted frequency card: the 60/90/120 selection, the shell
 * script that follows the selection, the save/restore confirmations, the
 * loading and error states, the per-user persistence seam, and the Shizuku
 * activation section (available and unavailable). The backend is mocked here;
 * the PocketIC lane exercises the real canister.
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

/** jsdom reports a desktop UA by default; Android selects the activation flow. */
function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: userAgent,
  });
}

const DESKTOP_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36";

beforeEach(() => {
  setIdentityForTest({ identity: signedInIdentity() });
  setUserAgent(DESKTOP_UA);
});

afterEach(() => {
  setUserAgent(DESKTOP_UA);
});

describe("frequency module", () => {
  it("renders the card beside the Auto module on the default route", async () => {
    renderWithActor(<App />, makeActor());

    expect(await screen.findByTestId("refresh.panel")).toBeInTheDocument();
    expect(await screen.findByTestId("auto.panel")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Módulo de frecuencia/ }),
    ).toBeInTheDocument();
  });

  it("offers the three selectable options 60, 90 and 120 FPS", async () => {
    renderWithActor(<App />, makeActor());

    await waitForRefreshCard();
    for (const fps of [60, 90, 120]) {
      expect(screen.getByTestId(`refresh.option.${fps}`)).toBeInTheDocument();
    }
  });

  it("highlights the selected option and updates the shell script", async () => {
    const user = userEvent.setup();
    renderWithActor(<App />, makeActor());

    await waitForRefreshCard();
    // 120 is the default selection.
    expect(screen.getByTestId("refresh.option.120")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByTestId("refresh.option.90"));

    expect(screen.getByTestId("refresh.option.90")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("refresh.option.120")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    const code = screen.getByTestId("refresh.code_block");
    expect(code).toHaveTextContent("FPS=90");
    expect(code).toHaveTextContent("min_refresh_rate $FPS");
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

  it("saves the selected 90 FPS rate and confirms success", async () => {
    const user = userEvent.setup();
    const actor = makeActor();
    renderWithActor(<App />, actor);

    await waitForRefreshCard();
    await user.click(screen.getByTestId("refresh.option.90"));
    await user.click(screen.getByTestId("refresh.save_button"));

    await waitFor(() =>
      expect(actor.saveAutoSettings).toHaveBeenCalledWith({
        ...SCRIPT_DEFAULTS,
        refreshRate: 90n,
      }),
    );
    expect(
      await screen.findByTestId("refresh.success_state"),
    ).toHaveTextContent(/guardado/i);
  });

  it("restores the saved setting to its default and confirms", async () => {
    const user = userEvent.setup();
    const actor = makeActor({
      getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(async () => ({
        ...SCRIPT_DEFAULTS,
        refreshRate: 60n,
      })),
    });
    renderWithActor(<App />, actor);

    await waitForRefreshCard();
    await user.click(screen.getByTestId("refresh.restore_button"));

    await waitFor(() =>
      expect(actor.resetAutoSettings).toHaveBeenCalledTimes(1),
    );
    // The card confirms the restore through a toast; the inline output keeps
    // showing the saved-state copy.
    expect(await screen.findByText("Ajuste restaurado")).toBeInTheDocument();
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
        refreshRate: 60n,
      })),
    });
    renderWithActor(<App />, actor);

    await waitForRefreshCard();
    // The card reflects the caller's own stored rate, not a shared default.
    expect(
      within(screen.getByTestId("refresh.panel")).getByText("60 Hz"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("refresh.option.60")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("Shizuku activation section", () => {
  it("explains that Shizuku applies settings without root", async () => {
    renderWithActor(<App />, makeActor());

    const section = await screen.findByTestId("refresh.shizuku_section");
    expect(section).toHaveTextContent(/Shizuku/i);
    expect(section).toHaveTextContent(/sin\s+necesidad de root/i);
  });

  it("shows a clear notice with instructions when Shizuku is unavailable", async () => {
    setUserAgent(DESKTOP_UA);
    renderWithActor(<App />, makeActor());

    const notice = await screen.findByTestId("refresh.shizuku_unavailable");
    expect(notice).toHaveTextContent(/no está disponible/i);
    expect(notice).toHaveTextContent(/Instala Shizuku/i);
    // The rest of the card stays usable.
    expect(screen.getByTestId("refresh.save_button")).toBeEnabled();
    expect(screen.getByTestId("refresh.option.90")).toBeEnabled();
  });

  it("activates with Shizuku and shows the active state", async () => {
    const user = userEvent.setup();
    setUserAgent(ANDROID_UA);
    const actor = makeActor();
    renderWithActor(<App />, actor);

    await waitForRefreshCard();
    await user.click(screen.getByTestId("refresh.shizuku_button"));

    await waitFor(() =>
      expect(actor.saveAutoSettings).toHaveBeenCalledWith({
        ...SCRIPT_DEFAULTS,
        shizukuActive: true,
      }),
    );
    expect(
      await screen.findByTestId("refresh.shizuku_state"),
    ).toHaveTextContent(/Shizuku activo/i);
  });

  it("shows a visible error state when activation fails", async () => {
    const user = userEvent.setup();
    setUserAgent(ANDROID_UA);
    const actor = makeActor({
      saveAutoSettings: vi
        .fn<backendInterface["saveAutoSettings"]>()
        .mockRejectedValue(new Error("boom")),
    });
    renderWithActor(<App />, actor);

    await waitForRefreshCard();
    await user.click(screen.getByTestId("refresh.shizuku_button"));

    expect(
      await screen.findByTestId("refresh.shizuku_error"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("refresh.shizuku_state")).toHaveTextContent(
      /No se pudo activar/i,
    );
  });

  it("reflects a stored activation flag on load", async () => {
    setUserAgent(ANDROID_UA);
    const actor = makeActor({
      getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(async () => ({
        ...SCRIPT_DEFAULTS,
        shizukuActive: true,
      })),
    });
    renderWithActor(<App />, actor);

    await waitForRefreshCard();
    expect(
      await screen.findByTestId("refresh.shizuku_state"),
    ).toHaveTextContent(/Shizuku activo/i);
  });
});
