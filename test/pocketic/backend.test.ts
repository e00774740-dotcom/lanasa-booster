import { PocketIc } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { createIdentity } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";
import { registerCaller } from "./test-utils";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

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

it("answers an empty-state read instead of trapping", async () => {
  const actor = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  await expect(actor.getBoostStats()).resolves.toEqual({
    totalBoosts: 0n,
    powerLevel: 0n,
  });
  await expect(actor.listBoosts()).resolves.toEqual([]);
});

it("round-trips a boost through the real canister", async () => {
  const alice = createIdentity("alice");
  const actor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    alice,
  );

  const stats = await actor.recordBoost();
  expect(stats).toEqual({ totalBoosts: 1n, powerLevel: 1n });

  const boosts = await actor.listBoosts();
  expect(boosts).toHaveLength(1);
  expect(boosts[0].id).toBe(0n);
  expect(boosts[0].timestamp).toBeGreaterThan(0n);

  await expect(actor.getBoostStats()).resolves.toEqual({
    totalBoosts: 1n,
    powerLevel: 1n,
  });
});

it("lists boosts newest first", async () => {
  const bob = createIdentity("bob");
  const actor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    bob,
  );

  await actor.recordBoost();
  await actor.recordBoost();
  await actor.recordBoost();

  const boosts = await actor.listBoosts();
  expect(boosts.map((b) => b.id)).toEqual([2n, 1n, 0n]);
});

it("resets the caller's counter and history", async () => {
  const carol = createIdentity("carol");
  const actor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    carol,
  );

  await actor.recordBoost();
  await actor.recordBoost();
  await expect(actor.resetBoosts()).resolves.toEqual({
    totalBoosts: 0n,
    powerLevel: 0n,
  });
  await expect(actor.listBoosts()).resolves.toEqual([]);
  await expect(actor.getBoostStats()).resolves.toEqual({
    totalBoosts: 0n,
    powerLevel: 0n,
  });
});

it("keeps each caller's boosts isolated", async () => {
  const dave = createIdentity("dave");
  const erin = createIdentity("erin");
  const daveActor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    dave,
  );
  const erinActor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    erin,
  );

  await daveActor.recordBoost();
  await daveActor.recordBoost();

  await expect(erinActor.listBoosts()).resolves.toEqual([]);
  await expect(erinActor.getBoostStats()).resolves.toEqual({
    totalBoosts: 0n,
    powerLevel: 0n,
  });
  await expect(daveActor.getBoostStats()).resolves.toEqual({
    totalBoosts: 2n,
    powerLevel: 2n,
  });
});

const SCRIPT_DEFAULTS = {
  buttonX: 940n,
  buttonY: 2080n,
  swipeDistance: 150n,
  gestureDuration: 80n,
  pauseBetween: 45n,
  shotsPerBurst: 5n,
  refreshRate: 120n,
};

it("returns the script defaults for a caller who never saved Auto settings", async () => {
  const frank = createIdentity("frank");
  const actor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    frank,
  );

  await expect(actor.getAutoSettings()).resolves.toEqual(SCRIPT_DEFAULTS);
});

it("round-trips Auto settings through the real canister", async () => {
  const grace = createIdentity("grace");
  const actor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    grace,
  );

  const saved = {
    buttonX: 100n,
    buttonY: 200n,
    swipeDistance: 300n,
    gestureDuration: 400n,
    pauseBetween: 500n,
    shotsPerBurst: 7n,
    refreshRate: 90n,
  };
  await expect(actor.saveAutoSettings(saved)).resolves.toEqual(saved);
  await expect(actor.getAutoSettings()).resolves.toEqual(saved);
});

it("round-trips the 120 FPS refreshRate field through the real canister", async () => {
  const nina = createIdentity("nina");
  const actor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    nina,
  );

  await expect(actor.getAutoSettings()).resolves.toMatchObject({
    refreshRate: 120n,
  });

  const saved = { ...SCRIPT_DEFAULTS, refreshRate: 144n };
  await expect(actor.saveAutoSettings(saved)).resolves.toEqual(saved);
  await expect(actor.getAutoSettings()).resolves.toMatchObject({
    refreshRate: 144n,
  });
});

it("restores Auto settings to the script defaults", async () => {
  const heidi = createIdentity("heidi");
  const actor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    heidi,
  );

  await actor.saveAutoSettings({
    buttonX: 1n,
    buttonY: 2n,
    swipeDistance: 3n,
    gestureDuration: 4n,
    pauseBetween: 5n,
    shotsPerBurst: 6n,
    refreshRate: 60n,
  });
  await expect(actor.resetAutoSettings()).resolves.toEqual(SCRIPT_DEFAULTS);
  await expect(actor.getAutoSettings()).resolves.toEqual(SCRIPT_DEFAULTS);
});

it("keeps each caller's Auto settings isolated", async () => {
  const ivan = createIdentity("ivan");
  const judy = createIdentity("judy");
  const ivanActor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    ivan,
  );
  const judyActor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    judy,
  );

  await ivanActor.saveAutoSettings({
    buttonX: 11n,
    buttonY: 22n,
    swipeDistance: 33n,
    gestureDuration: 44n,
    pauseBetween: 55n,
    shotsPerBurst: 66n,
    refreshRate: 144n,
  });

  await expect(judyActor.getAutoSettings()).resolves.toEqual(SCRIPT_DEFAULTS);
  await expect(ivanActor.getAutoSettings()).resolves.toEqual({
    buttonX: 11n,
    buttonY: 22n,
    swipeDistance: 33n,
    gestureDuration: 44n,
    pauseBetween: 55n,
    shotsPerBurst: 66n,
    refreshRate: 144n,
  });
});
