import { describe, expect, it } from "vitest";
import { B2_MECHANISM, EXPOSURE_END_FRAME_EXCLUSIVE, KEY_DRAWINGS, NATIVE_ASSET_INPUTS } from "./keys";
import { B2_CEILING_RECORD, validateB2Artifact } from "./conformance";
import { TRANSITIONS, apertureArea, classifyDrawings, classifyTransition, sampleAt } from "./morph";

describe("M3-11 B2 is the quality-ceiling control, not a compared mechanism", () => {
  it("declares itself outside the core comparison", () => {
    expect(B2_MECHANISM.role).toBe("quality-ceiling-control");
    expect(B2_MECHANISM.coreComparisonMember).toBe(false);
    expect(B2_MECHANISM.rankableAgainstCoreMechanisms).toBe(false);
    expect(B2_MECHANISM.mechanismClass).toBe("keyframed-vector-2d");
    expect(validateB2Artifact()).toEqual([]);
  });

  it("rejects being relabelled as a core mechanism", () => {
    const errors = validateB2Artifact({ ...B2_MECHANISM, coreComparisonMember: true, rankableAgainstCoreMechanisms: true });
    expect(errors).toContain("B2 must not be listed as a core comparison mechanism alongside A/C/D/E");
    expect(errors).toContain("B2 must not be presented as rankable against the core mechanisms");
  });

  it("rejects being relabelled as continuously controllable", () => {
    expect(validateB2Artifact({ ...B2_MECHANISM, mechanismClass: "continuous-parametric" }))
      .toContain("B2 is keyframed vector 2D and must not be labelled continuous-parametric");
  });

  it("is authored natively with no borrowed raster or rig", () => {
    expect(NATIVE_ASSET_INPUTS).toEqual([]);
    expect(JSON.stringify(KEY_DRAWINGS)).not.toMatch(/\.png|staticFile|assets\/cutout|bone|armature/i);
  });
});

describe("M3-11 vector morph and its limits", () => {
  it("inbetweens keys that share a point-for-point correspondence", () => {
    const transition = classifyTransition("K-closed", "K-part");
    expect(transition.kind).toBe("morph");
    // Frame 5 sits inside the K-closed block, half way to K-part.
    expect(sampleAt(5).production).toBe("inbetween");
    expect(apertureArea(sampleAt(5).drawing)).toBeGreaterThan(apertureArea(KEY_DRAWINGS["K-closed"]));
    expect(apertureArea(sampleAt(5).drawing)).toBeLessThan(apertureArea(KEY_DRAWINGS["K-part"]));
  });

  it("refuses to inbetween a pose whose aperture becomes two holes", () => {
    // T3 contact: the lips meet mid-span while both corners stay parted. One
    // closed path cannot carry two holes, so no correspondence exists.
    const transition = classifyTransition("K-open", "K-contact");
    expect(transition.kind).toBe("hold-cut");
    expect(transition.reason).toMatch(/path set changes/);
    expect(Object.keys(KEY_DRAWINGS["K-contact"]).filter((n) => n.startsWith("mouth-aperture"))).toHaveLength(2);
  });

  it("refuses to inbetween a pose that introduces a new path", () => {
    const transition = classifyTransition("K-open", "K-open-tongue");
    expect(transition.kind).toBe("hold-cut");
    expect(transition.reason).toMatch(/\+tongue/);
  });

  it("refuses to inbetween keys whose point counts disagree", () => {
    // Same path names, different point counts: the other way correspondence fails.
    const a = { "mouth-aperture": [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] };
    const b = { "mouth-aperture": [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] };
    const result = classifyDrawings(a, b);
    expect(result.kind).toBe("hold-cut");
    expect(result.reason).toMatch(/point count differs on mouth-aperture/);
  });

  it("never produces an inbetween across a transition it cannot inbetween", () => {
    for (let frame = 0; frame < EXPOSURE_END_FRAME_EXCLUSIVE; frame += 1) {
      const sample = sampleAt(frame);
      if (sample.production === "inbetween") {
        expect(classifyTransition(sample.entry.key, sampleAt(sample.entry.startFrame + sample.entry.holdFrames).entry.key).kind).toBe("morph");
      }
    }
  });

  it("is discrete in time by construction, unlike a continuously controlled rig", () => {
    // The exposure sheet holds and cuts. At least one frame boundary must be a
    // step, and that is a property of the workflow rather than a defect.
    const areas = Array.from({ length: EXPOSURE_END_FRAME_EXCLUSIVE }, (_, f) => apertureArea(sampleAt(f).drawing));
    const steps = areas.slice(1).map((area, i) => Math.abs(area - areas[i]));
    const range = Math.max(...areas) - Math.min(...areas);
    expect(Math.max(...steps)).toBeGreaterThan(range * 0.2);
  });

  it("rejects a frame outside the authored exposure range", () => {
    expect(() => sampleAt(EXPOSURE_END_FRAME_EXCLUSIVE)).toThrow(/outside the half-open B2 exposure range/);
    expect(() => sampleAt(-1)).toThrow();
  });
});

describe("M3-11 recorded production conditions and ceiling", () => {
  it("records every hold-cut with a reason for the capability matrix", () => {
    expect(B2_CEILING_RECORD.holdCutTransitions.length).toBeGreaterThan(0);
    for (const cut of B2_CEILING_RECORD.holdCutTransitions) expect(cut.reason).toBeTruthy();
    expect(TRANSITIONS.some((t) => t.kind === "morph")).toBe(true);
  });

  it("keeps what was not measured out of what was", () => {
    expect(B2_CEILING_RECORD.notMeasuredHere.join(" ")).toMatch(/mi3san/);
    expect(B2_CEILING_RECORD.observedCeiling.length).toBeGreaterThan(0);
  });
});
