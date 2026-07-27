import { describe, expect, it } from "vitest";
import { C_NATIVE_ASSET, layerById, type Point } from "../../c/asset";
import runDefinitionJson from "../../p1-track-a-run-definition.json";
import { A_CONTRACT } from "./a";
import {
  BASES,
  CROSS_BASE_INVARIANT_FIELDS,
  PRESENTATION_ORDER,
  REGISTRY,
  SHARED_CROP,
  SHARED_FRAMING,
  SHARED_RASTER,
  assertLeafFilled,
  readTrackABudget,
  validateCrossBaseInvariants,
  type Base,
  type P1MethodContract,
} from "./index";

function cloneRegistry(): Record<Base, P1MethodContract> {
  return structuredClone(REGISTRY);
}

const centroid = (points: readonly Point[]) => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
});

const landmark = (id: string) => {
  const found = SHARED_FRAMING.landmarks.find((l) => l.id === id);
  if (!found) throw new Error(`fixture is missing landmark ${id}`);
  return found;
};

// ---------------------------------------------------------------------------
// Registry shape
// ---------------------------------------------------------------------------

describe("p1-i3 registry: structural shape", () => {
  it("has exactly the 4 core bases, each self-identifying by its own key", () => {
    expect(Object.keys(REGISTRY).sort()).toEqual([...BASES].sort());
    for (const base of BASES) expect(REGISTRY[base].base).toBe(base);
  });

  it("leaves every method-specific hole unfilled at p1-i3 -- filling them is out of this packet's scope", () => {
    for (const base of BASES) {
      const contract = REGISTRY[base];
      expect(contract.renderer).toBeUndefined();
      expect(contract.camera.projection).toBeUndefined();
      expect(contract.debugPass).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Framing: prove the landmarks are grounded in an already-authored asset,
// not invented for this packet.
// ---------------------------------------------------------------------------

describe("p1-i3 framing landmarks: grounded in Base C's already-authored asset, not invented", () => {
  it("declares exactly the 5 landmarks decision (6) requires: both eyes, the nose, both mouth corners", () => {
    expect(SHARED_FRAMING.landmarks.map((l) => l.id).sort()).toEqual(
      ["eyeLeft", "eyeRight", "mouthCornerLeft", "mouthCornerRight", "noseTip"].sort(),
    );
  });

  it("mouth-corner landmarks are exactly C's tagged lip-corner cage points, not restated numbers", () => {
    const lipLine = layerById(C_NATIVE_ASSET, "lip-line");
    if (!lipLine?.tags) throw new Error("fixture is missing the lip-line layer or its tags");
    const leftIndex = lipLine.tags["lip-corner-left"];
    const rightIndex = lipLine.tags["lip-corner-right"];
    if (leftIndex === undefined || rightIndex === undefined) throw new Error("lip-line is missing a corner tag");

    const left = landmark("mouthCornerLeft");
    const right = landmark("mouthCornerRight");
    expect({ x: left.x, y: left.y }).toEqual(lipLine.cage[leftIndex]);
    expect({ x: right.x, y: right.y }).toEqual(lipLine.cage[rightIndex]);
  });

  it("eye/nose landmarks match the centroid of C's authored eye/nose cages", () => {
    const eyeFar = layerById(C_NATIVE_ASSET, "eye-far");
    const eyeNear = layerById(C_NATIVE_ASSET, "eye-near");
    const nose = layerById(C_NATIVE_ASSET, "nose");
    if (!eyeFar || !eyeNear || !nose) throw new Error("fixture is missing an eye or nose layer");

    const eyeLeft = centroid(eyeFar.cage);
    const eyeRight = centroid(eyeNear.cage);
    const noseTip = centroid(nose.cage);

    expect(landmark("eyeLeft").x).toBeCloseTo(eyeLeft.x, 6);
    expect(landmark("eyeLeft").y).toBeCloseTo(eyeLeft.y, 6);
    expect(landmark("eyeRight").x).toBeCloseTo(eyeRight.x, 6);
    expect(landmark("eyeRight").y).toBeCloseTo(eyeRight.y, 6);
    expect(landmark("noseTip").x).toBeCloseTo(noseTip.x, 6);
    expect(landmark("noseTip").y).toBeCloseTo(noseTip.y, 6);
  });

  it("has a positive, sane tolerance: tight enough to catch a real miss, loose enough for 4 different rasterisers", () => {
    expect(SHARED_FRAMING.tolerancePx).toBeGreaterThan(0);
    expect(SHARED_FRAMING.tolerancePx).toBeLessThan(20);
  });

  it("crop is centered on the midpoint of the two mouth-corner landmarks", () => {
    const left = landmark("mouthCornerLeft");
    const right = landmark("mouthCornerRight");
    expect(SHARED_CROP.x + SHARED_CROP.width / 2).toBe((left.x + right.x) / 2);
    expect(SHARED_CROP.y + SHARED_CROP.height / 2).toBe((left.y + right.y) / 2);
  });

  it("crop fully contains both mouth-corner landmarks", () => {
    for (const id of ["mouthCornerLeft", "mouthCornerRight"]) {
      const point = landmark(id);
      expect(point.x).toBeGreaterThanOrEqual(SHARED_CROP.x);
      expect(point.x).toBeLessThanOrEqual(SHARED_CROP.x + SHARED_CROP.width);
      expect(point.y).toBeGreaterThanOrEqual(SHARED_CROP.y);
      expect(point.y).toBeLessThanOrEqual(SHARED_CROP.y + SHARED_CROP.height);
    }
  });

  it("raster reuses Base C's already-authored native asset space instead of inventing a 7th coordinate system", () => {
    expect(SHARED_RASTER.width).toBe(1280);
    expect(SHARED_RASTER.height).toBe(1920);
  });
});

// ---------------------------------------------------------------------------
// Cross-base invariants: the real registry passes.
// ---------------------------------------------------------------------------

describe("p1-i3 cross-base invariants: the real registry passes with zero violations", () => {
  it("passes validateCrossBaseInvariants", () => {
    expect(validateCrossBaseInvariants(REGISTRY)).toEqual([]);
  });

  it("keeps raster/crop/stills/timebase/framing/presentation byte-identical across A/C/D/E", () => {
    expect(CROSS_BASE_INVARIANT_FIELDS).toEqual(["raster", "crop", "stills", "timebase", "framing", "presentation"]);
    for (const field of CROSS_BASE_INVARIANT_FIELDS) {
      const values = new Set(BASES.map((base) => JSON.stringify(REGISTRY[base][field])));
      expect(values.size).toBe(1);
    }
  });

  it("also keeps sequenceIds identical across the core 4 (declared shared in the design table, checked as a bonus)", () => {
    const values = new Set(BASES.map((base) => JSON.stringify(REGISTRY[base].sequenceIds)));
    expect(values.size).toBe(1);
  });

  it('gives only E camera.authoredIn = "asset"', () => {
    expect(REGISTRY.E.camera.authoredIn).toBe("asset");
    expect(REGISTRY.A.camera.authoredIn).toBe("comparison");
    expect(REGISTRY.C.camera.authoredIn).toBe("comparison");
    expect(REGISTRY.D.camera.authoredIn).toBe("comparison");
  });

  it("shares the same ADR-001 / GOV-013 yaw/pitch limits across every method's camera", () => {
    for (const base of BASES) {
      expect(REGISTRY[base].camera.yawLimitDegrees).toBe(15);
      expect(REGISTRY[base].camera.pitchLimitDegrees).toBe(10);
    }
  });

  it("presentation matches P0b's exact required order on every leaf", () => {
    for (const base of BASES) expect(REGISTRY[base].presentation).toEqual(PRESENTATION_ORDER);
  });

  it("no leaf carries a rank/score/decision field anywhere in its structure", () => {
    for (const base of BASES) expect(JSON.stringify(REGISTRY[base])).not.toMatch(/rank|score|decision/i);
  });

  it("no leaf restates a budget number; readTrackABudget reads the run definition instead", () => {
    for (const base of BASES) {
      expect(JSON.stringify(REGISTRY[base])).not.toMatch(/operatorHours|nativeAssetRevisionsMax|finalRenderAttemptsMax|"budget"/i);
    }
    // Compare against an INDEPENDENT read of the same file, not a copy of the
    // numbers, so this test would still catch a hardcoded/copied value even
    // if it happened to match today's run definition.
    const independent = (runDefinitionJson as { candidates: Array<{ base: string; role: string; budget: unknown }> }).candidates;
    for (const base of BASES) {
      const candidate = independent.find((c) => c.base === base && c.role === "core");
      expect(candidate).toBeDefined();
      expect(readTrackABudget(base)).toEqual(candidate!.budget);
    }
  });

  it("readTrackABudget throws for a base with no core candidate in the run definition", () => {
    expect(() => readTrackABudget("B1" as Base)).toThrow(/no "core" candidate/);
  });
});

// ---------------------------------------------------------------------------
// AP-014 guard: the checker must not pass vacuously over an incomplete scan.
// ---------------------------------------------------------------------------

describe("p1-i3 cross-base invariant checker: AP-014 guard against a vacuous pass", () => {
  it("actually holds all 4 core leaves (not fewer) before any comparison runs", () => {
    expect(Object.keys(REGISTRY)).toHaveLength(4);
    expect(BASES).toHaveLength(4);
  });

  it("refuses to report a pass over a completely empty registry", () => {
    const errors = validateCrossBaseInvariants({});
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(" ")).toMatch(/only found 0/);
  });

  it("refuses to report a pass over a registry missing exactly one of the four leaves", () => {
    const partial = cloneRegistry() as Partial<Record<Base, P1MethodContract>>;
    delete partial.D;
    const errors = validateCrossBaseInvariants(partial);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(" ")).toMatch(/only found 3/);
  });
});

// ---------------------------------------------------------------------------
// Negative fixtures required by the packet: every one of these MUST fail.
// ---------------------------------------------------------------------------

describe("p1-i3 negative fixtures: every one of these MUST fail validateCrossBaseInvariants", () => {
  it("a crop off by one pixel on a single leaf", () => {
    const broken = cloneRegistry();
    broken.C.crop = { ...broken.C.crop, x: broken.C.crop.x + 1 };
    const errors = validateCrossBaseInvariants(broken);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('"crop"'))).toBe(true);
  });

  it('D setting camera.authoredIn: "asset"', () => {
    const broken = cloneRegistry();
    broken.D.camera = { ...broken.D.camera, authoredIn: "asset" };
    const errors = validateCrossBaseInvariants(broken);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("base D declares camera.authoredIn"))).toBe(true);
  });

  it("presentation order permuted on a leaf", () => {
    const broken = cloneRegistry();
    broken.E.presentation = ["slow", "normal", "crop", "debug", "still"] as unknown as typeof broken.E.presentation;
    const errors = validateCrossBaseInvariants(broken);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("presentation"))).toBe(true);
  });

  it("a budget number written directly into a leaf", () => {
    const broken = cloneRegistry();
    (broken.A as unknown as Record<string, unknown>).operatorHours = 8;
    const errors = validateCrossBaseInvariants(broken);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("budget-shaped field"))).toBe(true);
  });

  it("a leaf gaining a qualityRank-like field", () => {
    const broken = cloneRegistry();
    (broken.C as unknown as Record<string, unknown>).qualityRank = 1;
    const errors = validateCrossBaseInvariants(broken);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("forbidden quality field"))).toBe(true);
  });

  it("(sweep) mutating any one of the 6 shared fields on any one leaf is caught", () => {
    for (const base of BASES) {
      for (const field of CROSS_BASE_INVARIANT_FIELDS) {
        const broken = cloneRegistry();
        const original = broken[base][field];
        // Arrays (stills, presentation) must stay arrays -- object-spreading
        // an array yields an index-keyed object, which would then crash the
        // checker's own `.join()` call on `presentation` instead of
        // reporting a clean mismatch. Append a sentinel element instead.
        const mutated = Array.isArray(original)
          ? [...original, "__mutated_by_test__"]
          : { ...(original as object), __mutated_by_test__: true };
        (broken[base] as unknown as Record<string, unknown>)[field] = mutated;
        const errors = validateCrossBaseInvariants(broken);
        expect(errors.some((e) => e.includes(`"${field}"`))).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Typed holes: compile-time + runtime enforcement.
// ---------------------------------------------------------------------------

describe("p1-i3 typed holes: reading a method-specific field without narrowing fails to compile", () => {
  it("renderer / camera.projection / debugPass are `T | undefined`, so bare property access is a type error", () => {
    // This function is intentionally never called: it exists only so `tsc`
    // typechecks the property accesses below (function bodies are checked
    // whether or not they run). Actually calling it would throw at runtime,
    // because the fixture's holes are genuinely `undefined` -- which is
    // exactly the point: a render packet cannot reach past a hole silently.
    function unsafeIfCalled() {
      // @ts-expect-error renderer is `RendererSpec | undefined` under strictNullChecks; `.name` is not a property of `undefined`.
      const rendererName: string = A_CONTRACT.renderer.name;
      // @ts-expect-error camera.projection is `string | undefined`; a hole cannot be assigned where a filled `string` is required.
      const projection: string = A_CONTRACT.camera.projection;
      // @ts-expect-error debugPass is `DebugPassSpec | undefined`; `.mechanism` is not a property of `undefined`.
      const mechanism: string = A_CONTRACT.debugPass.mechanism;
      return [rendererName, projection, mechanism];
    }

    expect(typeof unsafeIfCalled).toBe("function");
  });

  it("a leaf's object literal cannot silently gain an extra field (TypeScript excess-property check)", () => {
    // @ts-expect-error P1MethodContract has no `qualityRank` field; a fresh object literal (even one built with a spread) triggers the excess-property check.
    const withExtra: P1MethodContract = { ...A_CONTRACT, qualityRank: 1 };
    expect(withExtra).toBeDefined();
  });
});

describe("assertLeafFilled: runtime backstop for the compile-time hole guard", () => {
  it("throws while any hole remains unfilled, naming every missing field", () => {
    expect(() => assertLeafFilled(A_CONTRACT)).toThrow(/renderer, camera\.projection, debugPass/);
  });

  it("throws naming only the holes that remain once some are filled", () => {
    const partiallyFilled: P1MethodContract = {
      ...A_CONTRACT,
      camera: { ...A_CONTRACT.camera, projection: "screen-space-2d" },
    };
    expect(() => assertLeafFilled(partiallyFilled)).toThrow(/^base A contract is missing method-specific field\(s\): renderer, debugPass$/);
  });

  it("passes once every hole is filled", () => {
    const filled: P1MethodContract = {
      ...A_CONTRACT,
      camera: { ...A_CONTRACT.camera, projection: "screen-space-2d" },
      renderer: { name: "test", version: "0", executablePath: "/dev/null", antiAliasing: "none", samples: 1, seed: 0 },
      debugPass: { mechanism: "test", contents: [] },
    };
    expect(() => assertLeafFilled(filled)).not.toThrow();
  });
});
