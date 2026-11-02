import App from "@/App";
import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import type { AutoSettings, backendInterface } from "@/backend";
import { RefreshRate } from "@/components/RefreshRate";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cover for the accepted frequency card requirements: the Shizuku activation
 * section detects Android and reflects the active state after activating, the
 * 60/90/120 selector persists the chosen rate per user, and a stored rate is
 * restored and shown as selected on reload. The backend is mocked here; the
 * PocketIC lane exercises the real canister.
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

/** The stored-rate line, scoped so it never collides with the script badge. */
function storedRateLine() {
  const panel = screen.getByTestId("refresh.panel");
  const line = within(panel).getByText("Guardado en tu cuenta:").closest("p");
  if (!line) throw new Error("stored-rate line not found");
  return line;
}

beforeEach(() => {
  setIdentityForTest({ identity: signedInIdentity() });
  setUserAgent(DESKTOP_UA);
});

afterEach(() => {
  setUserAgent(DESKTOP_UA);
});

describe("frequency selector options", () => {
  it("shows exactly the 60, 90 and 120 FPS options", async () => {
    renderWithActor(<RefreshRate />, makeActor());

    await waitForRefreshCard();
    const options = within(screen.getByTestId("refresh.options")).getAllByRole(
      "button",
    );
    expect(options.map((button) => button.textContent?.trim())).toEqual([
      "60Hz",
      "90Hz",
      "120Hz",
    ]);
  });
});

describe("frequency persistence per user", () => {
  it("persists 60 FPS and shows it selected after reload", async () => {
    const user = userEvent.setup();
    const actor = makeActor();
    const first = renderWithActor(<RefreshRate />, actor);

    await waitForRefreshCard();
    await user.click(screen.getByTestId("refresh.option.60"));
    await user.click(screen.getByTestId("refresh.save_button"));

    await waitFor(() =>
      expect(actor.saveAutoSettings).toHaveBeenCalledWith({
        ...SCRIPT_DEFAULTS,
        refreshRate: 60n,
      }),
    );
    first.unmount();

    // Reload with the value the backend now stores for this caller.
    const reloaded = makeActor({
      getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(async () => ({
        ...SCRIPT_DEFAULTS,
        refreshRate: 60n,
      })),
    });
    renderWithActor(<RefreshRate />, reloaded);

    await waitForRefreshCard();
    expect(screen.getByTestId("refresh.option.60")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("refresh.option.90")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("refresh.option.120")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(storedRateLine()).toHaveTextContent("60 Hz");
  });

  it("persists 90 FPS and shows it selected after reload", async () => {
    const user = userEvent.setup();
    const actor = makeActor();
    const first = renderWithActor(<RefreshRate />, actor);

    await waitForRefreshCard();
    await user.click(screen.getByTestId("refresh.option.90"));
    await user.click(screen.getByTestId("refresh.save_button"));

    await waitFor(() =>
      expect(actor.saveAutoSettings).toHaveBeenCalledWith({
        ...SCRIPT_DEFAULTS,
        refreshRate: 90n,
      }),
    );
    first.unmount();

    const reloaded = makeActor({
      getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(async () => ({
        ...SCRIPT_DEFAULTS,
        refreshRate: 90n,
      })),
    });
    renderWithActor(<RefreshRate />, reloaded);

    await waitForRefreshCard();
    expect(screen.getByTestId("refresh.option.90")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("refresh.option.60")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("refresh.option.120")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(storedRateLine()).toHaveTextContent("90 Hz");
  });
});

describe("Shizuku activation section", () => {
  it("offers activation on Android and shows the active state after activating", async () => {
    const user = userEvent.setup();
    setUserAgent(ANDROID_UA);
    const actor = makeActor();
    renderWithActor(<RefreshRate />, actor);

    await waitForRefreshCard();
    expect(
      screen.queryByTestId("refresh.shizuku_unavailable"),
    ).not.toBeInTheDocument();

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

  it("explains Shizuku is unavailable off Android while the card stays usable", async () => {
    setUserAgent(DESKTOP_UA);
    renderWithActor(<RefreshRate />, makeActor());

    await waitForRefreshCard();
    const notice = await screen.findByTestId("refresh.shizuku_unavailable");
    expect(notice).toHaveTextContent(/no está disponible/i);
    expect(
      screen.queryByTestId("refresh.shizuku_button"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("refresh.save_button")).toBeEnabled();
  });

  it("restores the stored activation flag on reload", async () => {
    setUserAgent(ANDROID_UA);
    const actor = makeActor({
      getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(async () => ({
        ...SCRIPT_DEFAULTS,
        shizukuActive: true,
      })),
    });
    renderWithActor(<RefreshRate />, actor);

    await waitForRefreshCard();
    expect(
      await screen.findByTestId("refresh.shizuku_state"),
    ).toHaveTextContent(/Shizuku activo/i);
    // The activation button is disabled once the stored flag is active.
    expect(screen.getByTestId("refresh.shizuku_button")).toBeDisabled();
  });
});
