import App from "@/App";
import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import type { AutoSettings, Boost, backendInterface } from "@/backend";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cover for the accepted «Auto» module: the six script parameters, their
 * persistence, validation, restore, and the burst journey that records a boost.
 * The backend is mocked here; the PocketIC lane exercises the real canister.
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

function boost(id: bigint, timestamp: bigint): Boost {
  return { id, timestamp };
}

const NS = 1_000_000n;

function input(key: string) {
  return screen.getByTestId(`auto.input.${key}`) as HTMLInputElement;
}

/** The panel renders a loading section with the same ocid, so wait for the form. */
async function waitForAutoForm() {
  return screen.findByTestId("auto.fire_button");
}

beforeEach(() => {
  setIdentityForTest({ identity: signedInIdentity() });
});

describe("Auto module", () => {
  it("shows the six script defaults when the user has saved nothing", async () => {
    renderWithActor(<App />, makeActor());

    await waitForAutoForm();
    expect(input("buttonX")).toHaveValue(940);
    expect(input("buttonY")).toHaveValue(2080);
    expect(input("swipeDistance")).toHaveValue(150);
    expect(input("gestureDuration")).toHaveValue(80);
    expect(input("pauseBetween")).toHaveValue(45);
    expect(input("shotsPerBurst")).toHaveValue(5);
  });

  it("shows the saved values instead of the defaults on load", async () => {
    const saved: AutoSettings = {
      buttonX: 100n,
      buttonY: 200n,
      swipeDistance: 300n,
      gestureDuration: 400n,
      pauseBetween: 500n,
      shotsPerBurst: 7n,
      refreshRate: 120n,
      shizukuActive: false,
    };
    renderWithActor(
      <App />,
      makeActor({
        getAutoSettings: vi.fn<backendInterface["getAutoSettings"]>(
          async () => ({ ...saved }),
        ),
      }),
    );

    await waitForAutoForm();
    await waitFor(() => expect(input("buttonX")).toHaveValue(100));
    expect(input("buttonY")).toHaveValue(200);
    expect(input("swipeDistance")).toHaveValue(300);
    expect(input("gestureDuration")).toHaveValue(400);
    expect(input("pauseBetween")).toHaveValue(500);
    expect(input("shotsPerBurst")).toHaveValue(7);
  });

  it("persists an edited parameter through saveAutoSettings", async () => {
    const user = userEvent.setup();
    const actor = makeActor();
    renderWithActor(<App />, actor);

    await waitForAutoForm();
    const shots = input("shotsPerBurst");
    await user.clear(shots);
    await user.type(shots, "9");
    await user.click(screen.getByTestId("auto.save_button"));

    await waitFor(() =>
      expect(actor.saveAutoSettings).toHaveBeenCalledWith({
        buttonX: 940n,
        buttonY: 2080n,
        swipeDistance: 150n,
        gestureDuration: 80n,
        pauseBetween: 45n,
        shotsPerBurst: 9n,
        refreshRate: 120n,
        shizukuActive: false,
      }),
    );
  });

  it("marks an out-of-range value invalid and disables the fire button", async () => {
    const user = userEvent.setup();
    renderWithActor(<App />, makeActor());

    await waitForAutoForm();
    const shots = input("shotsPerBurst");
    await user.clear(shots);
    await user.type(shots, "0");

    expect(
      await screen.findByTestId("auto.error.shotsPerBurst"),
    ).toBeInTheDocument();
    expect(shots).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByTestId("auto.fire_button")).toBeDisabled();
    expect(screen.getByTestId("auto.save_button")).toBeDisabled();
  });

  it("restores the six script defaults and persists them", async () => {
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

    await waitForAutoForm();
    await waitFor(() => expect(input("buttonX")).toHaveValue(1));
    await user.click(screen.getByTestId("auto.restore_button"));

    await waitFor(() =>
      expect(actor.resetAutoSettings).toHaveBeenCalledTimes(1),
    );
    await waitFor(() => expect(input("buttonX")).toHaveValue(940));
    expect(input("buttonY")).toHaveValue(2080);
    expect(input("swipeDistance")).toHaveValue(150);
    expect(input("gestureDuration")).toHaveValue(80);
    expect(input("pauseBetween")).toHaveValue(45);
    expect(input("shotsPerBurst")).toHaveValue(5);
  });

  it("reflects position and distance edits in the preview", async () => {
    const user = userEvent.setup();
    renderWithActor(<App />, makeActor());

    await waitForAutoForm();
    const preview = screen.getByTestId("auto.preview");
    expect(within(preview).getByText("940 · 2080")).toBeInTheDocument();
    expect(within(preview).getByText(/Desliza 150 px/)).toBeInTheDocument();

    const x = input("buttonX");
    await user.clear(x);
    await user.type(x, "500");
    const distance = input("swipeDistance");
    await user.clear(distance);
    await user.type(distance, "800");

    expect(within(preview).getByText("500 · 2080")).toBeInTheDocument();
    expect(within(preview).getByText(/Desliza 800 px/)).toBeInTheDocument();
  });

  it("runs a burst, shows progress, and confirms completion", async () => {
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

    await waitForAutoForm();
    await user.click(screen.getByTestId("auto.fire_button"));

    // The burst saves the current parameters and records one boost.
    await waitFor(() =>
      expect(actor.saveAutoSettings).toHaveBeenCalledWith(SCRIPT_DEFAULTS),
    );
    await waitFor(() => expect(actor.recordBoost).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId("auto.success_state")).toHaveTextContent(
      /Ráfaga completada/,
    );
  });

  it("increments totals and adds a history entry after a completed burst", async () => {
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

    await waitForAutoForm();
    await user.click(screen.getByTestId("auto.fire_button"));

    await waitFor(() =>
      expect(
        screen.getByText("Boosts totales").closest(".rounded-2xl"),
      ).toHaveTextContent("1"),
    );
    expect(await screen.findByTestId("history.item.1")).toBeInTheDocument();
  });

  it("shows a visible error and stays usable when the burst fails", async () => {
    const user = userEvent.setup();
    const actor = makeActor({
      recordBoost: vi
        .fn<backendInterface["recordBoost"]>()
        .mockRejectedValue(new Error("boom")),
    });
    renderWithActor(<App />, actor);

    await waitForAutoForm();
    await user.click(screen.getByTestId("auto.fire_button"));

    await waitFor(() => expect(actor.recordBoost).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId("auto.error_state")).toHaveTextContent(
      /no se pudo registrar el boost/i,
    );
    expect(screen.getByTestId("auto.fire_button")).toBeEnabled();
  });

  it("keeps the existing gauge, boost and history working alongside Auto", async () => {
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

    await waitForAutoForm();
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
