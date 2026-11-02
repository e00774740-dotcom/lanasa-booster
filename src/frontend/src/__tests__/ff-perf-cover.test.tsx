import App from "@/App";
import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import type { AutoSettings, FfPerfSettings, backendInterface } from "@/backend";
import { FFPerformanceCore } from "@/components/FFPerformanceCore";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cover for the accepted «FF Performance Core» requirements: the card appears on
 * the main screen beside Auto and Refresh with its description, a signed-in user
 * can edit and save the per-user settings, the saved values reload, restore
 * returns the module defaults, a second user never sees the first user's values,
 * and the card exposes loading and error states. The backend is mocked here; the
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

const AUTO_DEFAULTS: AutoSettings = {
  buttonX: 940n,
  buttonY: 2080n,
  swipeDistance: 150n,
  gestureDuration: 80n,
  pauseBetween: 45n,
  shotsPerBurst: 5n,
  refreshRate: 120n,
  shizukuActive: false,
};

const FF_DEFAULTS: FfPerfSettings = {
  targetFps: 120n,
  cpuGovernor: "performance",
  ioScheduler: "cfq",
  networkMode: "balanced",
  thermalProfile: "balanced",
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
  | "getFfPerfSettings"
  | "saveFfPerfSettings"
  | "resetFfPerfSettings"
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
      ...AUTO_DEFAULTS,
    })),
    saveAutoSettings: vi.fn<backendInterface["saveAutoSettings"]>(
      async (settings) => ({ ...settings }),
    ),
    resetAutoSettings: vi.fn<backendInterface["resetAutoSettings"]>(
      async () => ({ ...AUTO_DEFAULTS }),
    ),
    getFfPerfSettings: vi.fn<backendInterface["getFfPerfSettings"]>(
      async () => ({ ...FF_DEFAULTS }),
    ),
    saveFfPerfSettings: vi.fn<backendInterface["saveFfPerfSettings"]>(
      async (settings) => ({ ...settings }),
    ),
    resetFfPerfSettings: vi.fn<backendInterface["resetFfPerfSettings"]>(
      async () => ({ ...FF_DEFAULTS }),
    ),
    ...overrides,
  };
  return actor;
}

/** The card renders a loading section with the same ocid, so wait for the form. */
async function waitForFfPerfCard() {
  return screen.findByTestId("ffperf.save_button");
}

beforeEach(() => {
  setIdentityForTest({ identity: signedInIdentity() });
});

describe("FF Performance Core card on the main screen", () => {
  it("appears beside Auto and Refresh with its description", async () => {
    renderWithActor(<App />, makeActor());

    // The card renders a loading section with the same ocid, so wait for the form.
    await waitForFfPerfCard();
    expect(screen.getByTestId("ffperf.panel")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "FF Performance Core" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Desbloqueo de FPS, governors, I/O, red y thermal para gaming",
      ),
    ).toBeInTheDocument();

    // The existing Auto and Refresh cards stay mounted beside it.
    expect(await screen.findByTestId("auto.panel")).toBeInTheDocument();
    expect(await screen.findByTestId("refresh.panel")).toBeInTheDocument();
  });
});

describe("FF Performance Core per-user settings", () => {
  it("saves the edited settings for the signed-in user", async () => {
    const user = userEvent.setup();
    const actor = makeActor();
    renderWithActor(<FFPerformanceCore />, actor);

    await waitForFfPerfCard();

    const fps = screen.getByTestId(
      "ffperf.input.targetFps",
    ) as HTMLInputElement;
    await user.clear(fps);
    await user.type(fps, "90");
    await user.selectOptions(
      screen.getByTestId("ffperf.select.cpuGovernor"),
      "schedutil",
    );
    await user.selectOptions(
      screen.getByTestId("ffperf.select.ioScheduler"),
      "deadline",
    );
    await user.selectOptions(
      screen.getByTestId("ffperf.select.networkMode"),
      "low-latency",
    );
    await user.selectOptions(
      screen.getByTestId("ffperf.select.thermalProfile"),
      "cool",
    );
    await user.click(screen.getByTestId("ffperf.save_button"));

    await waitFor(() =>
      expect(actor.saveFfPerfSettings).toHaveBeenCalledWith({
        targetFps: 90n,
        cpuGovernor: "schedutil",
        ioScheduler: "deadline",
        networkMode: "low-latency",
        thermalProfile: "cool",
      }),
    );
    expect(await screen.findByTestId("ffperf.success_state")).toHaveTextContent(
      /guardados en tu cuenta/i,
    );
  });

  it("reloads the saved settings for the same user", async () => {
    const actor = makeActor({
      getFfPerfSettings: vi.fn<backendInterface["getFfPerfSettings"]>(
        async () => ({
          targetFps: 60n,
          cpuGovernor: "powersave",
          ioScheduler: "noop",
          networkMode: "powersave",
          thermalProfile: "cool",
        }),
      ),
    });
    renderWithActor(<FFPerformanceCore />, actor);

    await waitForFfPerfCard();

    expect(
      screen.getByTestId("ffperf.input.targetFps") as HTMLInputElement,
    ).toHaveValue(60);
    expect(screen.getByTestId("ffperf.select.cpuGovernor")).toHaveValue(
      "powersave",
    );
    expect(screen.getByTestId("ffperf.select.ioScheduler")).toHaveValue("noop");
    expect(screen.getByTestId("ffperf.select.networkMode")).toHaveValue(
      "powersave",
    );
    expect(screen.getByTestId("ffperf.select.thermalProfile")).toHaveValue(
      "cool",
    );
    expect(screen.getByTestId("ffperf.fps_option.60")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("restores the module defaults", async () => {
    const user = userEvent.setup();
    const actor = makeActor({
      getFfPerfSettings: vi.fn<backendInterface["getFfPerfSettings"]>(
        async () => ({
          targetFps: 60n,
          cpuGovernor: "powersave",
          ioScheduler: "noop",
          networkMode: "powersave",
          thermalProfile: "cool",
        }),
      ),
    });
    renderWithActor(<FFPerformanceCore />, actor);

    await waitForFfPerfCard();
    await user.click(screen.getByTestId("ffperf.restore_button"));

    await waitFor(() =>
      expect(actor.resetFfPerfSettings).toHaveBeenCalledTimes(1),
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("ffperf.input.targetFps") as HTMLInputElement,
      ).toHaveValue(120),
    );
    expect(screen.getByTestId("ffperf.select.cpuGovernor")).toHaveValue(
      "performance",
    );
    expect(screen.getByTestId("ffperf.select.ioScheduler")).toHaveValue("cfq");
    expect(screen.getByTestId("ffperf.select.networkMode")).toHaveValue(
      "balanced",
    );
    expect(screen.getByTestId("ffperf.select.thermalProfile")).toHaveValue(
      "balanced",
    );
  });

  it("keeps a second user's settings isolated from the first user's", async () => {
    const user = userEvent.setup();
    const first = makeActor();
    const firstRender = renderWithActor(<FFPerformanceCore />, first);

    await waitForFfPerfCard();
    const fps = screen.getByTestId(
      "ffperf.input.targetFps",
    ) as HTMLInputElement;
    await user.clear(fps);
    await user.type(fps, "90");
    await user.click(screen.getByTestId("ffperf.save_button"));
    await waitFor(() =>
      expect(first.saveFfPerfSettings).toHaveBeenCalledWith({
        ...FF_DEFAULTS,
        targetFps: 90n,
      }),
    );
    firstRender.unmount();

    // A different caller reads their own record, which is still the defaults.
    const second = makeActor();
    renderWithActor(<FFPerformanceCore />, second);

    await waitForFfPerfCard();
    expect(
      screen.getByTestId("ffperf.input.targetFps") as HTMLInputElement,
    ).toHaveValue(120);
    expect(screen.getByTestId("ffperf.fps_option.120")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(second.saveFfPerfSettings).not.toHaveBeenCalled();
  });
});

describe("FF Performance Core states", () => {
  it("shows a loading state while the settings are being fetched", () => {
    const actor = makeActor({
      getFfPerfSettings: vi.fn<backendInterface["getFfPerfSettings"]>(
        () => new Promise<FfPerfSettings>(() => {}),
      ),
    });
    renderWithActor(<FFPerformanceCore />, actor);

    expect(screen.getByTestId("ffperf.loading_state")).toBeInTheDocument();
    expect(screen.queryByTestId("ffperf.save_button")).not.toBeInTheDocument();
  });

  it("shows an error state with a retry action when the read fails", async () => {
    const actor = makeActor({
      getFfPerfSettings: vi
        .fn<backendInterface["getFfPerfSettings"]>()
        .mockRejectedValue(new Error("boom")),
    });
    renderWithActor(<FFPerformanceCore />, actor);

    const errorState = await screen.findByTestId("ffperf.error_state");
    expect(errorState).toHaveTextContent(/No se pudieron cargar/i);
    expect(
      within(errorState).getByTestId("ffperf.retry_button"),
    ).toBeInTheDocument();
  });
});
