import { describe, expect, it } from "vitest";
import { C_ASSET_SPACE, C_ASSET_STATUS, C_NATIVE_ASSET, LAYER_IDS, NATIVE_ASSET_INPUTS, cageArea, layerById, type Layer } from "./asset";
import { validateCNativeAsset } from "./conformance";
import { REST_CONTROLS, VIEW_LIMITS, apertureArea, apertureOf, clipPolygon, controls, evaluate, validateControls, visibleArea } from "./deform";

const mutate = (change: (asset: Layer[]) => void): Layer[] => {
  const copy = structuredClone(C_NATIVE_ASSET) as Layer[];
  change(copy);
  return copy;
};

const centroidX = (cage: readonly { x: number }[]) => cage.reduce((sum, q) => sum + q.x, 0) / cage.length;

describe("M3-04 Base C native asset", () => {
  it("is a native asset with no shared PNG, topology, or bones", () => {
    expect(C_ASSET_STATUS).toBe("PROPOSED");
    expect(NATIVE_ASSET_INPUTS).toEqual([]);
    const serialised = JSON.stringify(C_NATIVE_ASSET);
    expect(serialised).not.toMatch(/\.png|staticFile|assets\/cutout|patch-config/i);
    // C carries a control cage per layer; it has no skeleton and no viseme table.
    expect(C_NATIVE_ASSET.every((layer) => layer.cage.length >= 3)).toBe(true);
    expect(serialised).not.toMatch(/bone|armature|viseme/i);
  });

  it("declares a total, unique, back-to-front draw order over every layer", () => {
    const orders = C_NATIVE_ASSET.map((layer) => layer.drawOrder);
    expect(new Set(orders).size).toBe(orders.length);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(new Set(C_NATIVE_ASSET.map((layer) => layer.id))).toEqual(new Set(LAYER_IDS));
    // The oral interior must sit behind the structures that occlude it.
    const order = (id: (typeof LAYER_IDS)[number]) => layerById(C_NATIVE_ASSET, id)!.drawOrder;
    for (const interior of ["oral-cavity", "tongue", "teeth-lower", "teeth-upper"] as const) {
      expect(order(interior)).toBeLessThan(order("jaw"));
      expect(order(interior)).toBeLessThan(order("muzzle-pads"));
      expect(order(interior)).toBeLessThan(order("lip-line"));
    }
  });

  it("keeps every rest-pose cage inside the declared asset space", () => {
    for (const layer of C_NATIVE_ASSET) {
      for (const q of layer.cage) {
        expect(q.x).toBeGreaterThanOrEqual(0);
        expect(q.y).toBeGreaterThanOrEqual(0);
        expect(q.x).toBeLessThanOrEqual(C_ASSET_SPACE.width);
        expect(q.y).toBeLessThanOrEqual(C_ASSET_SPACE.height);
      }
    }
  });
});

describe("M3-04 continuous native controls", () => {
  it("holds the mouth closed at rest and opens it monotonically", () => {
    expect(apertureArea(REST_CONTROLS)).toBeLessThan(400);
    const samples = [0, 0.1, 0.25, 0.5, 0.75, 1].map((jawOpen) => apertureArea(controls({ jawOpen })));
    for (let i = 1; i < samples.length; i += 1) expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    expect(samples[samples.length - 1]).toBeGreaterThan(samples[0] * 10);
  });

  it("occludes the oral interior behind the aperture instead of redrawing it", () => {
    const closed = evaluate(REST_CONTROLS);
    // Closed: the interior exists in the asset but nothing of it survives the mask.
    expect(cageArea(closed.find((l) => l.id === "oral-cavity")!.cage)).toBeGreaterThan(0);
    expect(visibleArea(closed, "oral-cavity")).toBeLessThan(200);
    expect(visibleArea(closed, "teeth-upper")).toBe(0);
    expect(visibleArea(closed, "teeth-lower")).toBe(0);

    const open = evaluate(controls({ jawOpen: 1 }));
    expect(visibleArea(open, "oral-cavity")).toBeGreaterThan(visibleArea(closed, "oral-cavity"));
    expect(visibleArea(open, "teeth-upper")).toBeGreaterThan(0);
    expect(visibleArea(open, "teeth-lower")).toBeGreaterThan(0);
    // Occlusion is real: no masked layer can exceed the aperture that clips it.
    const aperture = cageArea(apertureOf(open));
    for (const id of ["oral-cavity", "tongue", "teeth-upper", "teeth-lower"] as const) {
      expect(visibleArea(open, id)).toBeLessThanOrEqual(aperture + 1e-6);
    }
  });

  it("is continuous across the whole opening range", () => {
    // C's claim against A is that no step exists between neighbouring values.
    let previous = apertureArea(controls({ jawOpen: 0 }));
    let largestStep = 0;
    for (let i = 1; i <= 200; i += 1) {
      const current = apertureArea(controls({ jawOpen: i / 200 }));
      largestStep = Math.max(largestStep, Math.abs(current - previous));
      previous = current;
    }
    const fullRange = apertureArea(controls({ jawOpen: 1 })) - apertureArea(controls({ jawOpen: 0 }));
    expect(largestStep).toBeLessThan(fullRange * 0.02);
  });

  it("spreads and rounds the lip corners with one continuous control", () => {
    const width = (pull: number) => {
      const cage = apertureOf(evaluate(controls({ lipCornerPull: pull })));
      return cage[6].x - cage[0].x;
    };
    expect(width(1)).toBeGreaterThan(width(0));
    expect(width(-1)).toBeLessThan(width(0));
  });

  it("moves the corners independently under asymmetry", () => {
    const rest = apertureOf(evaluate(REST_CONTROLS));
    const skewed = apertureOf(evaluate(controls({ lipCornerAsymmetry: 1 })));
    expect(skewed[0].x - rest[0].x).toBeCloseTo(skewed[6].x - rest[6].x, 6);
    expect(skewed[0].x).toBeLessThan(rest[0].x);
  });

  it("produces depth-ordered parallax under yaw within the adopted range", () => {
    const rest = evaluate(REST_CONTROLS);
    const turned = evaluate(controls({ yawDegrees: VIEW_LIMITS.yawDegrees }));
    const shift = (id: string) => centroidX(turned.find((l) => l.id === id)!.cage) - centroidX(rest.find((l) => l.id === id)!.cage);
    // Nearer layers travel further than the head plane; the far ear travels back.
    expect(shift("ear-near")).toBeGreaterThan(shift("muzzle-pads"));
    expect(shift("muzzle-pads")).toBeGreaterThan(shift("head-base"));
    expect(shift("ear-far")).toBeLessThan(0);
  });

  it("is deterministic for identical controls", () => {
    const a = JSON.stringify(evaluate(controls({ jawOpen: 0.42, yawDegrees: -7.5, muzzleRound: 0.3 })));
    const b = JSON.stringify(evaluate(controls({ jawOpen: 0.42, yawDegrees: -7.5, muzzleRound: 0.3 })));
    expect(a).toBe(b);
  });

  it("rejects controls outside the adopted comparison range instead of clamping", () => {
    expect(validateControls(controls({ yawDegrees: 16 }))).toContain("yawDegrees must be within the adopted +/-15 comparison range");
    expect(validateControls(controls({ pitchDegrees: -11 }))).toContain("pitchDegrees must be within the adopted +/-10 comparison range");
    expect(validateControls(controls({ jawOpen: 1.2 }))).toContain("jawOpen must be within [0, 1]");
    expect(() => evaluate(controls({ yawDegrees: 30 }))).toThrow(/invalid C native controls/);
    expect(validateControls(REST_CONTROLS)).toEqual([]);
  });

  it("returns an empty polygon for a degenerate mask instead of the whole subject", () => {
    // A flat clip passes every half-plane test, so an unguarded clipper would
    // report a shut mouth as fully revealing its interior.
    const flat = [{ x: 700, y: 642 }, { x: 775, y: 642 }, { x: 852, y: 642 }];
    const teeth = [{ x: 726, y: 630 }, { x: 824, y: 630 }, { x: 824, y: 644 }, { x: 726, y: 644 }];
    expect(clipPolygon(teeth, flat)).toEqual([]);
  });

  it("keeps the muzzle mesh and cheeks volume-preserving in the intended direction", () => {
    const rest = evaluate(REST_CONTROLS);
    const rounded = evaluate(controls({ muzzleRound: 1 }));
    const restPads = rest.find((l) => l.id === "muzzle-pads")!.cage;
    const roundPads = rounded.find((l) => l.id === "muzzle-pads")!.cage;
    const span = (cage: readonly { x: number; y: number }[], axis: "x" | "y") =>
      Math.max(...cage.map((q) => q[axis])) - Math.min(...cage.map((q) => q[axis]));
    expect(span(roundPads, "x")).toBeLessThan(span(restPads, "x"));
    expect(span(roundPads, "y")).toBeGreaterThan(span(restPads, "y"));
    expect(cageArea(evaluate(controls({ cheekPuff: 1 })).find((l) => l.id === "cheek-near")!.cage))
      .toBeGreaterThan(cageArea(rest.find((l) => l.id === "cheek-near")!.cage));
  });
});

describe("M3-04 conformance check", () => {
  it("accepts the authored asset", () => {
    expect(validateCNativeAsset()).toEqual([]);
  });

  it("rejects an oral interior that is no longer masked by the aperture", () => {
    const errors = validateCNativeAsset(mutate((asset) => {
      delete asset.find((layer) => layer.id === "oral-cavity")!.clipBy;
    }));
    expect(errors).toContain("oral-cavity must be masked by the lip-line aperture");
    expect(errors).toContain("oral-cavity must be occluded when the mouth is closed");
  });

  it("rejects an interior layer promoted in front of its occluders", () => {
    const errors = validateCNativeAsset(mutate((asset) => {
      const cavity = asset.find((layer) => layer.id === "oral-cavity")!;
      cavity.drawOrder = 99;
    }));
    expect(errors).toContain("oral-cavity must be painted behind jaw");
    expect(errors).toContain("oral-cavity must be painted behind lip-line");
  });

  it("rejects a borrowed completed PNG", () => {
    const errors = validateCNativeAsset(mutate((asset) => {
      asset.find((layer) => layer.id === "muzzle-pads")!.fill = "url(assets/cutout/mouth/sensei-a.png)";
    }));
    expect(errors).toContain("Base C must not reference a shared completed PNG, shared topology, or shared bones");
  });

  it("rejects a broken back-to-front listing", () => {
    const errors = validateCNativeAsset(mutate((asset) => {
      asset.find((layer) => layer.id === "nose")!.drawOrder = 1;
    }));
    expect(errors).toContain("layers must be listed back to front");
  });
});
