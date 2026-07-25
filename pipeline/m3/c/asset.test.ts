import { describe, expect, it } from "vitest";
import { C_ASSET_SPACE, C_ASSET_STATUS, C_NATIVE_ASSET, LAYER_IDS, NATIVE_ASSET_INPUTS, cageArea, layerById, type Layer, type Point } from "./asset";
import { validateCNativeAsset } from "./conformance";
import { REST_CONTROLS, VIEW_LIMITS, apertureArea, apertureOf, clipPolygon, controls, evaluate, intersectionArea, isConvex, triangulate, validateControls, visibleArea } from "./deform";

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

describe("M3-04 occlusion measurement is correct, not merely directional", () => {
  const segmentsCross = (p1: Point, p2: Point, p3: Point, p4: Point) => {
    const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (Math.abs(d) < 1e-12) return false;
    const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
    return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9;
  };
  const selfIntersects = (poly: readonly Point[]) => {
    const n = poly.length;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 2; j < n; j += 1) {
        if (i === 0 && j === n - 1) continue;
        if (segmentsCross(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n])) return true;
      }
    }
    return false;
  };
  const pointInPoly = (q: Point, poly: readonly Point[]) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i];
      const b = poly[j];
      if ((a.y > q.y) !== (b.y > q.y) && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  };
  /** Independent of the clipper: grid-sampled intersection area. */
  const sampledIntersection = (subject: readonly Point[], mask: readonly Point[], n = 600) => {
    const xs = [...subject, ...mask].map((q) => q.x);
    const ys = [...subject, ...mask].map((q) => q.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    let hits = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const q = { x: x0 + ((i + 0.5) / n) * (x1 - x0), y: y0 + ((j + 0.5) / n) * (y1 - y0) };
        if (pointInPoly(q, subject) && pointInPoly(q, mask)) hits += 1;
      }
    }
    return (hits / (n * n)) * (x1 - x0) * (y1 - y0);
  };
  const sweep = <T>(fn: (c: Parameters<typeof controls>[0]) => T): T[] => {
    const out: T[] = [];
    for (const jawOpen of [0, 0.2, 0.5, 0.8, 1])
      for (const lipCornerPull of [-1, -0.5, 0, 0.5, 1])
        for (const lipCornerAsymmetry of [-1, 0, 1]) out.push(fn({ jawOpen, lipCornerPull, lipCornerAsymmetry }));
    return out;
  };

  it("keeps the aperture a simple outline across the whole control range", () => {
    // Moving only the corners let them pass their neighbouring arc points and
    // the outline crossed itself below jawOpen 0.2 at pull -0.8 or tighter.
    const crossings = sweep((c) => selfIntersects(apertureOf(evaluate(controls(c))))).filter(Boolean);
    expect(crossings).toHaveLength(0);
  });

  it("agrees with an independently sampled intersection, not just in direction", () => {
    // The aperture is non-convex over most of the range, so clipping it whole
    // with Sutherland-Hodgman under-measured occlusion by up to 47%.
    const open = evaluate(controls({ jawOpen: 1, lipCornerPull: -1 }));
    const aperture = apertureOf(open);
    for (const id of ["oral-cavity", "teeth-upper", "teeth-lower"] as const) {
      const subject = open.find((layer) => layer.id === id)!.cage;
      const truth = sampledIntersection(subject, aperture);
      // Relative, because the reference is a grid estimate: refining it from
      // 600 to 2400 moves it toward the triangulated value, not away.
      expect(Math.abs(intersectionArea(subject, aperture) - truth) / truth).toBeLessThan(0.01);
    }
  });

  it("never reports more visible area than the aperture encloses", () => {
    for (const jawOpen of [0, 0.3, 0.6, 1]) {
      for (const lipCornerPull of [-1, 0, 1]) {
        const deformed = evaluate(controls({ jawOpen, lipCornerPull }));
        const aperture = cageArea(apertureOf(deformed));
        for (const id of ["oral-cavity", "tongue", "teeth-upper", "teeth-lower"] as const) {
          expect(visibleArea(deformed, id)).toBeLessThanOrEqual(aperture + 1e-6);
        }
      }
    }
  });

  it("triangulates a shape into an exact partition of it", () => {
    const aperture = apertureOf(evaluate(controls({ jawOpen: 1, lipCornerPull: 1 })));
    const parts = triangulate(aperture);
    expect(parts.length).toBe(aperture.length - 2);
    expect(parts.reduce((sum, triangle) => sum + cageArea(triangle), 0)).toBeCloseTo(cageArea(aperture), 6);
  });

  it("records that the aperture really is non-convex, so the reason for triangulating stays visible", () => {
    // If this ever finds no non-convex sample, the triangulation could be
    // dropped -- but nobody may assume that without re-running the sweep.
    const nonConvex = sweep((c) => isConvex(apertureOf(evaluate(controls(c))))).filter((convex) => !convex);
    expect(nonConvex.length).toBeGreaterThan(0);
    expect(isConvex([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }])).toBe(true);
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
