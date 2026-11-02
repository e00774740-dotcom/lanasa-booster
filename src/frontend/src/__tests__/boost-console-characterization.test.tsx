import App from "@/App";
import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import type { Boost, backendInterface } from "@/backend";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Characterization baseline for the existing console behavior the accepted
 * request says must not change: gauge, "Activar Boost", history and reset.
 * The new "Auto" module is intentionally not asserted here.
 */

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

describe("existing console baseline", () => {
  it("renders the power gauge with the clamped power level", async () => {
    const actor = makeActor({
      getBoostStats: vi.fn<backendInterface["getBoostStats"]>(async () => ({
        totalBoosts: 3n,
        powerLevel: 3n,
      })),
    });
    renderWithActor(<App />, actor);

    expect(
      await screen.findByRole("img", {
        name: /Nivel de potencia actual: 3 por ciento/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("boost.gauge")).toBeInTheDocument();
  });

  it("shows the loading state while the history query is pending", async () => {
    let resolveList: (value: Boost[]) => void = () => {};
    const actor = makeActor({
      listBoosts: vi.fn<backendInterface["listBoosts"]>(
        () =>
          new Promise<Boost[]>((resolve) => {
            resolveList = resolve;
          }),
      ),
    });
    renderWithActor(<App />, actor);

    expect(
      await screen.findByTestId("history.loading_state"),
    ).toBeInTheDocument();

    resolveList([]);
    expect(
      await screen.findByTestId("history.empty_state"),
    ).toBeInTheDocument();
  });

  it("does not show the reset button when there is no history", async () => {
    renderWithActor(<App />, makeActor());

    await screen.findByTestId("history.empty_state");
    expect(screen.queryByTestId("history.reset_button")).toBeNull();
  });

  it("reloads the caller's own stats and history after a boost", async () => {
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
    // The mutation invalidates both queries, so the console refetches them.
    await waitFor(() => expect(actor.getBoostStats).toHaveBeenCalledTimes(2));
    expect(actor.listBoosts).toHaveBeenCalledTimes(2);
    expect(await screen.findByTestId("history.item.1")).toBeInTheDocument();
  });
});
