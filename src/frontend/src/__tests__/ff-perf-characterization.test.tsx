import App from "@/App";
import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import type { AutoSettings, Boost, backendInterface } from "@/backend";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Characterization baseline for the behavior the accepted «FF Performance Core»
 * request says must not change: the default route loads without a blank screen,
 * the existing Auto and Refresh cards stay mounted beside the boost console, and
 * the boost, Auto and Refresh flows keep working. The new FF Performance Core
 * card is intentionally not asserted here.
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

type ConsoleActor = Pick<
  backendInterface,
  | "getBoostStats"
  | "listBoosts"
  | "recordBoost"
  | "resetBoosts"
  | "getAutoSettings"
  | "saveAutoSettings"
  | "resetAutoSettings"
>;

function makeActor(overrides: Partial<ConsoleActor> = {}) {
  const actor: ConsoleActor = {
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

function boost(id: bigint, timestamp: bigint): Boost {
  return { id, timestamp };
}

const NS = 1_000_000n;

beforeEach(() => {
  setIdentityForTest({ identity: signedInIdentity() });
});

describe("default route baseline", () => {
  it("loads the console without a blank screen and keeps Auto and Refresh mounted", async () => {
    renderWithActor(<App />, makeActor());

    // The app shell and the boost console render on the default route.
    expect(
      screen.getByRole("heading", { level: 1, name: /LaNasa.*Booster/ }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("boost.panel")).toBeInTheDocument();

    // The existing Auto and Refresh cards stay mounted beside the console.
    expect(await screen.findByTestId("auto.panel")).toBeInTheDocument();
    expect(await screen.findByTestId("refresh.panel")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Módulo Auto/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Módulo de frecuencia/ }),
    ).toBeInTheDocument();
  });
});

describe("existing boost flow baseline", () => {
  it("records a boost and reflects it in the gauge and history", async () => {
    const user = userEvent.setup();
    const actor = makeActor({
      getBoostStats: vi
        .fn<backendInterface["getBoostStats"]>()
        .mockResolvedValueOnce({ totalBoosts: 0n, powerLevel: 0n })
        .mockResolvedValue({ totalBoosts: 1n, powerLevel: 1n }),
      listBoosts: vi
        .fn<backendInterface["listBoosts"]>()
        .mockResolvedValueOnce([])
        .mockResolvedValue([boost(0n, 1_700_000_000n * NS)]),
    });
    renderWithActor(<App />, actor);

    await screen.findByTestId("history.empty_state");
    await user.click(screen.getByTestId("boost.primary_button"));

    await waitFor(() => expect(actor.recordBoost).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByRole("img", {
        name: /Nivel de potencia actual: 1 por ciento/,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("history.item.1")).toBeInTheDocument();
  });
});

describe("existing Auto module baseline", () => {
  it("shows the six script defaults and persists an edited parameter", async () => {
    const user = userEvent.setup();
    const actor = makeActor();
    renderWithActor(<App />, actor);

    await screen.findByTestId("auto.fire_button");
    const shots = screen.getByTestId(
      "auto.input.shotsPerBurst",
    ) as HTMLInputElement;
    expect(shots).toHaveValue(5);

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
});

describe("existing Refresh module baseline", () => {
  it("offers 60/90/120 and saves the selected rate per user", async () => {
    const user = userEvent.setup();
    const actor = makeActor();
    renderWithActor(<App />, actor);

    await screen.findByTestId("refresh.copy_button");
    for (const fps of [60, 90, 120]) {
      expect(screen.getByTestId(`refresh.option.${fps}`)).toBeInTheDocument();
    }

    await user.click(screen.getByTestId("refresh.option.90"));
    await user.click(screen.getByTestId("refresh.save_button"));

    await waitFor(() =>
      expect(actor.saveAutoSettings).toHaveBeenCalledWith({
        ...SCRIPT_DEFAULTS,
        refreshRate: 90n,
      }),
    );
  });

  it("reflects the caller's own stored rate on load", async () => {
    const actor = makeActor({
      getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(async () => ({
        ...SCRIPT_DEFAULTS,
        refreshRate: 60n,
      })),
    });
    renderWithActor(<App />, actor);

    await screen.findByTestId("refresh.copy_button");
    // The stored-rate line, scoped so it never collides with the script badge.
    const storedLine = within(screen.getByTestId("refresh.panel"))
      .getByText("Guardado en tu cuenta:")
      .closest("p");
    expect(storedLine).not.toBeNull();
    expect(storedLine).toHaveTextContent("60 Hz");
    expect(screen.getByTestId("refresh.option.60")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
