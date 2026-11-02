import App from "@/App";
import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import type { AutoSettings, backendInterface } from "@/backend";
import {
  REFRESH_DEFAULT,
  REFRESH_OPTIONS,
  RefreshRate,
  buildRefreshScript,
} from "@/components/RefreshRate";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Characterization baseline for the frequency card behavior the accepted
 * request says must keep working while the Shizuku activation and the 60/90 FPS
 * options are completed: the exported option set and default, the pure script
 * builder, the clamping of an out-of-range stored rate, the default selection
 * when nothing is stored, and the per-user save seam for 60 FPS. The backend is
 * mocked here; the PocketIC lane exercises the real canister.
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

describe("frequency card baseline", () => {
  it("exports exactly the 60, 90 and 120 options with 120 as the default", () => {
    expect([...REFRESH_OPTIONS]).toEqual([60, 90, 120]);
    expect(REFRESH_DEFAULT).toBe(120);
  });

  it("builds a shell script that targets the requested rate", () => {
    for (const fps of [60, 90, 120]) {
      const script = buildRefreshScript(fps);
      expect(script).toContain(`FPS=${fps}`);
      expect(script).toContain("min_refresh_rate $FPS");
      expect(script).toContain("peak_refresh_rate $FPS");
      expect(script).toContain("refresh_rate_mode 1");
      expect(script).toContain("SurfaceFlinger");
      expect(script).toContain("set-user-preferred-display-mode");
    }
  });

  it("defaults the selection to 120 FPS when nothing is stored", async () => {
    renderWithActor(<App />, makeActor());

    await waitForRefreshCard();
    expect(screen.getByTestId("refresh.option.120")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("refresh.option.60")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("refresh.option.90")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("clamps an out-of-range stored rate to the 120 FPS default", async () => {
    const actor = makeActor({
      getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(async () => ({
        ...SCRIPT_DEFAULTS,
        refreshRate: 144n,
      })),
    });
    renderWithActor(<RefreshRate />, actor);

    await waitForRefreshCard();
    expect(screen.getByTestId("refresh.option.120")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // The stored-rate line reports the clamped value, not the raw 144.
    const panel = screen.getByTestId("refresh.panel");
    const storedLine = within(panel)
      .getByText("Guardado en tu cuenta:")
      .closest("p");
    expect(storedLine).not.toBeNull();
    expect(storedLine).toHaveTextContent("120 Hz");
  });

  it("saves the selected 60 FPS rate through the per-user seam", async () => {
    const user = userEvent.setup();
    const actor = makeActor();
    renderWithActor(<App />, actor);

    await waitForRefreshCard();
    await user.click(screen.getByTestId("refresh.option.60"));
    await user.click(screen.getByTestId("refresh.save_button"));

    await waitFor(() =>
      expect(actor.saveAutoSettings).toHaveBeenCalledWith({
        ...SCRIPT_DEFAULTS,
        refreshRate: 60n,
      }),
    );
    expect(
      await screen.findByTestId("refresh.success_state"),
    ).toHaveTextContent(/guardado/i);
  });

  it("shows the stored 60 FPS rate as selected on load", async () => {
    const actor = makeActor({
      getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(async () => ({
        ...SCRIPT_DEFAULTS,
        refreshRate: 60n,
      })),
    });
    renderWithActor(<RefreshRate />, actor);

    await waitForRefreshCard();
    expect(screen.getByTestId("refresh.option.60")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("refresh.option.120")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("refresh.code_block")).toHaveTextContent(
      "FPS=60",
    );
  });
});
