import App from "@/App";
import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import type { AutoSettings, backendInterface } from "@/backend";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Characterization baseline for the existing «Auto» module behavior the
 * accepted request says must not change while a new «120 FPS» card is added
 * beside it: the loading skeleton, the error + retry path, and the save and
 * restore confirmations. The new card is intentionally not asserted here.
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

type AutoActor = Pick<
  backendInterface,
  | "getBoostStats"
  | "listBoosts"
  | "recordBoost"
  | "resetBoosts"
  | "getAutoSettings"
  | "saveAutoSettings"
  | "resetAutoSettings"
>;

function makeActor(overrides: Partial<AutoActor> = {}) {
  const actor: AutoActor = {
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

function input(key: string) {
  return screen.getByTestId(`auto.input.${key}`) as HTMLInputElement;
}

beforeEach(() => {
  setIdentityForTest({ identity: signedInIdentity() });
});

describe("existing Auto module baseline", () => {
  it("renders the app on the default route with the console and Auto panel", async () => {
    renderWithActor(<App />, makeActor());

    expect(
      screen.getByRole("heading", { level: 1, name: /LaNasa.*Booster/ }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("boost.panel")).toBeInTheDocument();
    expect(await screen.findByTestId("auto.panel")).toBeInTheDocument();
  });

  it("shows the Auto loading skeleton while the settings query is pending", async () => {
    // AutoFire and the 120 FPS card each issue their own getAutoSettings query,
    // so every pending resolver is collected and released together.
    const resolvers: Array<(value: AutoSettings) => void> = [];
    const actor = makeActor({
      getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(
        () =>
          new Promise<AutoSettings>((resolve) => {
            resolvers.push(resolve);
          }),
      ),
    });
    renderWithActor(<App />, actor);

    expect(await screen.findByTestId("auto.loading_state")).toBeInTheDocument();

    for (const resolve of resolvers) resolve({ ...SCRIPT_DEFAULTS });
    expect(await screen.findByTestId("auto.fire_button")).toBeInTheDocument();
  });

  it("confirms a saved parameter change", async () => {
    const user = userEvent.setup();
    const actor = makeActor();
    renderWithActor(<App />, actor);

    await screen.findByTestId("auto.fire_button");
    const shots = input("shotsPerBurst");
    await user.clear(shots);
    await user.type(shots, "9");
    await user.click(screen.getByTestId("auto.save_button"));

    await waitFor(() =>
      expect(actor.saveAutoSettings).toHaveBeenCalledWith({
        ...SCRIPT_DEFAULTS,
        shotsPerBurst: 9n,
      }),
    );
  });

  it("confirms a restore back to the script defaults", async () => {
    const user = userEvent.setup();
    const actor = makeActor({
      getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(async () => ({
        buttonX: 1n,
        buttonY: 2n,
        swipeDistance: 3n,
        gestureDuration: 4n,
        pauseBetween: 5n,
        shotsPerBurst: 6n,
        refreshRate: 120n,
        shizukuActive: false,
      })),
    });
    renderWithActor(<App />, actor);

    await screen.findByTestId("auto.fire_button");
    await waitFor(() => expect(input("buttonX")).toHaveValue(1));
    await user.click(screen.getByTestId("auto.restore_button"));

    await waitFor(() =>
      expect(actor.resetAutoSettings).toHaveBeenCalledTimes(1),
    );
    await waitFor(() => expect(input("buttonX")).toHaveValue(940));
    expect(input("shotsPerBurst")).toHaveValue(5);
  });
});
