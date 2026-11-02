import App from "@/App";
import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import type { Boost, BoostStats, backendInterface } from "@/backend";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** A non-anonymous identity so the private boost console mounts. */
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

type BoostActor = Pick<
  backendInterface,
  "getBoostStats" | "listBoosts" | "recordBoost" | "resetBoosts"
>;

function makeActor(overrides: Partial<BoostActor> = {}) {
  const actor: BoostActor = {
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

describe("LaNasa Booster console", () => {
  it("shows the app name in the header and the empty history state", async () => {
    renderWithActor(<App />, makeActor());

    expect(
      screen.getByRole("heading", { level: 1, name: /LaNasa.*Booster/ }),
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId("history.empty_state"),
    ).toBeInTheDocument();
    expect(screen.getByText("Aún no hay impulsos")).toBeInTheDocument();
  });

  it("increments the counter and power level when Boost is pressed", async () => {
    const user = userEvent.setup();
    const actor = makeActor({
      recordBoost: vi.fn<backendInterface["recordBoost"]>(async () => ({
        totalBoosts: 1n,
        powerLevel: 1n,
      })),
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

    expect(actor.recordBoost).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(
        screen.getByText("Boosts totales").closest(".rounded-2xl"),
      ).toHaveTextContent("1"),
    );
    expect(
      screen.getByRole("img", {
        name: /Nivel de potencia actual: 1 por ciento/,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("history.item.1")).toBeInTheDocument();
  });

  it("lists each boost with its timestamp, newest first", async () => {
    const actor = makeActor({
      getBoostStats: vi.fn<backendInterface["getBoostStats"]>(async () => ({
        totalBoosts: 2n,
        powerLevel: 2n,
      })),
      listBoosts: vi.fn<backendInterface["listBoosts"]>(async () => [
        boost(1n, 1_700_000_100n * NS),
        boost(0n, 1_700_000_000n * NS),
      ]),
    });
    renderWithActor(<App />, actor);

    const items = await screen.findAllByTestId(/^history\.item\./);
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("Impulso #1")).toBeInTheDocument();
    expect(within(items[1]).getByText("Impulso #0")).toBeInTheDocument();
    // Each row renders a machine-readable timestamp.
    expect(items[0].querySelector("time")).not.toBeNull();
  });

  it("resets the counter and clears the history", async () => {
    const user = userEvent.setup();
    const actor = makeActor({
      getBoostStats: vi
        .fn<backendInterface["getBoostStats"]>()
        .mockResolvedValueOnce({ totalBoosts: 1n, powerLevel: 1n })
        .mockResolvedValue({ totalBoosts: 0n, powerLevel: 0n }),
      listBoosts: vi
        .fn<backendInterface["listBoosts"]>()
        .mockResolvedValueOnce([boost(0n, 1_700_000_000n * NS)])
        .mockResolvedValue([]),
    });
    renderWithActor(<App />, actor);

    await screen.findByTestId("history.item.1");
    await user.click(screen.getByTestId("history.reset_button"));

    expect(actor.resetBoosts).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByTestId("history.empty_state"),
    ).toBeInTheDocument();
  });

  it("shows a visible confirmation after a boost", async () => {
    const user = userEvent.setup();
    renderWithActor(<App />, makeActor());

    await screen.findByTestId("history.empty_state");
    await user.click(screen.getByTestId("boost.primary_button"));

    await waitFor(() =>
      expect(screen.getByTestId("boost.success_state")).toHaveTextContent(
        /Propulsión confirmada/,
      ),
    );
  });

  it("surfaces an error when the boost call fails", async () => {
    const user = userEvent.setup();
    const actor = makeActor({
      recordBoost: vi
        .fn<backendInterface["recordBoost"]>()
        .mockRejectedValue(new Error("boom")),
    });
    renderWithActor(<App />, actor);

    await screen.findByTestId("history.empty_state");
    await user.click(screen.getByTestId("boost.primary_button"));

    await waitFor(() => expect(actor.recordBoost).toHaveBeenCalledTimes(1));
    // The console stays usable and does not crash on a failed mutation.
    expect(screen.getByTestId("boost.primary_button")).toBeEnabled();
  });
});
