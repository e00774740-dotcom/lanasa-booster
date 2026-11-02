import { PocketIc } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { createIdentity } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";
import { registerCaller } from "./test-utils";

/**
 * Real-canister cover for the accepted «FF Performance Core» backend behavior:
 * the per-caller record returns the module defaults when absent, round-trips a
 * saved value, restores the defaults, and keeps each caller's record isolated.
 * The frontend suite mocks the actor; this lane calls the compiled wasm.
 */

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

const FF_DEFAULTS = {
  targetFps: 120n,
  cpuGovernor: "performance",
  ioScheduler: "cfq",
  networkMode: "balanced",
  thermalProfile: "balanced",
};

let pic: PocketIc | undefined;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  const installed = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BACKEND_WASM,
  });
  canisterId = installed.canisterId;
});

afterAll(async () => {
  await pic?.tearDown();
});

it("returns the module defaults for a caller who never saved FF Performance settings", async () => {
  const alice = createIdentity("ffperf-alice");
  const actor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    alice,
  );

  await expect(actor.getFfPerfSettings()).resolves.toEqual(FF_DEFAULTS);
});

it("round-trips FF Performance settings through the real canister", async () => {
  const bob = createIdentity("ffperf-bob");
  const actor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    bob,
  );

  const saved = {
    targetFps: 90n,
    cpuGovernor: "schedutil",
    ioScheduler: "deadline",
    networkMode: "low-latency",
    thermalProfile: "cool",
  };
  await expect(actor.saveFfPerfSettings(saved)).resolves.toEqual(saved);
  await expect(actor.getFfPerfSettings()).resolves.toEqual(saved);
});

it("restores FF Performance settings to the module defaults", async () => {
  const carol = createIdentity("ffperf-carol");
  const actor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    carol,
  );

  await actor.saveFfPerfSettings({
    targetFps: 60n,
    cpuGovernor: "powersave",
    ioScheduler: "noop",
    networkMode: "powersave",
    thermalProfile: "performance",
  });
  await expect(actor.resetFfPerfSettings()).resolves.toEqual(FF_DEFAULTS);
  await expect(actor.getFfPerfSettings()).resolves.toEqual(FF_DEFAULTS);
});

it("keeps each caller's FF Performance settings isolated", async () => {
  const dave = createIdentity("ffperf-dave");
  const erin = createIdentity("ffperf-erin");
  const daveActor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    dave,
  );
  const erinActor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    erin,
  );

  const daveSettings = {
    targetFps: 60n,
    cpuGovernor: "powersave",
    ioScheduler: "noop",
    networkMode: "powersave",
    thermalProfile: "cool",
  };
  await daveActor.saveFfPerfSettings(daveSettings);

  await expect(erinActor.getFfPerfSettings()).resolves.toEqual(FF_DEFAULTS);
  await expect(daveActor.getFfPerfSettings()).resolves.toEqual(daveSettings);
});
