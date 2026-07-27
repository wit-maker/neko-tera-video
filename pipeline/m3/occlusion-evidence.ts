/**
 * Cross-method occlusion evidence contract.
 *
 * AP-010, AP-012 and AP-013 were each found in one method and fixed in that
 * method. AP-005 forbids treating that as prevention: a lesson promoted only
 * where it was learned does not stop the next method from repeating it. This
 * module is the acceptance condition every Base must satisfy, so a new method
 * cannot present an occlusion claim without the evidence that would expose the
 * ways these three failed.
 *
 * It is also the shape M3-12's capability matrix compares. Methods establish
 * occlusion by different mechanisms -- a 2D mask, depth ordering, containment
 * in a volume -- and the matrix must show that difference rather than flatten
 * it, so the mechanism is recorded rather than normalised away.
 *
 * PROPOSED, PoC-scoped: this is a P1 working acceptance condition, not an ADR.
 */

export const OCCLUSION_EVIDENCE_STATUS = "PROPOSED" as const;

export const BASES = ["A", "B1", "B2", "C", "D", "E"] as const;
export type Base = (typeof BASES)[number];

/** How a method makes something hidden. Recorded, never normalised away. */
export const MECHANISMS = ["2d-aperture-mask", "layer-depth-order", "volume-containment", "authored-per-state", "authored-per-drawing"] as const;
export type OcclusionMechanism = (typeof MECHANISMS)[number];

export interface OcclusionEvidence {
  base: Base;
  mechanism: OcclusionMechanism;
  /**
   * AP-012. Where the numbers came from. A measurement derived from the values
   * the builder itself wrote can only confirm the builder's intent, so the
   * source must be something that does not depend on those values.
   */
  measurement: {
    source: string;
    /** False when the figures are read back from what the builder set. */
    independentOfAuthoredValues: boolean;
    /**
     * AP-012. At least one absolute figure checked against a separately
     * implemented reference, not only against directional properties.
     */
    crossCheckedAgainstIndependentReference: boolean;
    crossCheckDescription: string;
  };
  /**
   * AP-010. Occlusion has two sides and the hidden one is the one that gets
   * skipped. A method that only shows the interior appearing has not shown that
   * it ever disappears.
   */
  hiddenStateVerified: boolean;
  visibleStateVerified: boolean;
  /**
   * AP-013. Endpoints are not the control range. Both defects found in C lived
   * strictly inside it, at values no endpoint test would visit.
   */
  controlRangeSwept: boolean;
  controlRangeDescription: string;
  /** Claims this method does NOT support, so the matrix cannot overstate it. */
  notEstablished: string[];
}

/**
 * Returns every reason an occlusion claim may not enter the capability matrix.
 *
 * A method that cannot satisfy this is not rejected as a candidate -- it simply
 * may not present an unevidenced occlusion claim beside methods that can.
 */
export function validateOcclusionEvidence(evidence: OcclusionEvidence): string[] {
  const errors: string[] = [];
  const where = `${evidence.base}`;

  if (!(BASES as readonly string[]).includes(evidence.base)) errors.push(`${where}: unknown base`);
  if (!(MECHANISMS as readonly string[]).includes(evidence.mechanism)) errors.push(`${where}: unknown occlusion mechanism`);

  // AP-010: both sides, or the claim is untested where it matters most.
  if (!evidence.hiddenStateVerified) errors.push(`${where}: the hidden state is unverified; showing the interior appear does not show it ever disappears (AP-010)`);
  if (!evidence.visibleStateVerified) errors.push(`${where}: the visible state is unverified`);

  // AP-012: the numbers must not come from the values the builder wrote.
  if (!evidence.measurement.source) errors.push(`${where}: no measurement source recorded`);
  if (!evidence.measurement.independentOfAuthoredValues) {
    errors.push(`${where}: occlusion is measured from values the builder itself wrote, which can only confirm its own intent (AP-012)`);
  }
  if (!evidence.measurement.crossCheckedAgainstIndependentReference) {
    errors.push(`${where}: no absolute figure was checked against a separately implemented reference; directional properties cannot see a uniformly wrong number (AP-012)`);
  }
  if (!evidence.measurement.crossCheckDescription) errors.push(`${where}: the cross-check must say what it was checked against`);

  // AP-013: the interior of the range, not its endpoints.
  if (!evidence.controlRangeSwept) errors.push(`${where}: the control range was not swept; both C defects lived strictly inside it (AP-013)`);
  if (!evidence.controlRangeDescription) errors.push(`${where}: the sweep must say what range it covered`);

  if (!Array.isArray(evidence.notEstablished)) errors.push(`${where}: must list what its occlusion evidence does not establish`);

  return errors;
}

/**
 * Every Base that has authored occlusion evidence so far.
 *
 * A/B1 are absent by mechanism rather than by omission: A composites a patch
 * over a finished image and B1 stores whole heads, so neither has a runtime
 * occlusion step to evidence. That is recorded in `BASES_WITHOUT_RUNTIME_OCCLUSION`
 * so the gap cannot be read as work not done.
 */
export const BASES_WITHOUT_RUNTIME_OCCLUSION: Partial<Record<Base, string>> = {
  A: "A composites a mouth patch over a finished image; whatever is hidden was hidden by the artist in the source PNG, so there is no runtime occlusion step to measure.",
  B1: "B1 stores complete heads; occlusion is whatever was drawn into each state and is not computed at runtime.",
  B2: "B2 is authored per key drawing; occlusion is drawn, not computed. Its aperture splitting into two holes at T3 is a drawing-topology limit, recorded under M3-11 rather than here.",
};

export const OCCLUSION_EVIDENCE: OcclusionEvidence[] = [
  {
    base: "C",
    mechanism: "2d-aperture-mask",
    measurement: {
      source: "polygon intersection of each interior layer against the deformed lip-line aperture",
      independentOfAuthoredValues: true,
      crossCheckedAgainstIndependentReference: true,
      crossCheckDescription:
        "Triangulated intersection compared against a grid-sampled intersection implemented separately. Refining the grid from 600 to 2400 moves the estimate toward the triangulated value, 1.507% to 0.086%, so the residual is the reference and not the algorithm.",
    },
    hiddenStateVerified: true,
    visibleStateVerified: true,
    controlRangeSwept: true,
    controlRangeDescription: "jawOpen, lipCornerPull, lipCornerAsymmetry, yaw and pitch sampled across their full approved ranges; aperture checked for convexity and self-intersection at every sample.",
    notEstablished: [
      "Whether adjacent layers stay connected under yaw; parallax is applied per layer and no frame exists (C-KF-004).",
      "Anything about appearance. The asset carries geometry only.",
    ],
  },
  {
    base: "D",
    mechanism: "layer-depth-order",
    measurement: {
      source: "evaluated world-space bounds of each plate, read from the mesh rather than from the object origins the build script set",
      independentOfAuthoredValues: true,
      crossCheckedAgainstIndependentReference: true,
      crossCheckDescription:
        "Depth separation measured from evaluated bounds and compared against the origin-derived figure. They agree because the plates are planar, which is itself the check: a plate that acquired depth extent would diverge.",
    },
    hiddenStateVerified: true,
    visibleStateVerified: true,
    controlRangeSwept: false,
    controlRangeDescription:
      "NOT SWEPT. Depth ordering is verified for the rest pose only; nothing establishes that it survives jaw rotation or yaw (D-KF-002).",
    notEstablished: [
      "That depth ordering holds once the jaw rotates or the view turns (D-KF-002).",
      "That adjacent plates do not separate at a wide jaw opening; binding is uniform weight 1.0 (D-KF-001).",
      "Anything about appearance; no material, texture, line or groom exists (D-KF-003).",
    ],
  },
  {
    base: "E",
    mechanism: "volume-containment",
    measurement: {
      source: "bmesh closed/boundary-edge and volume figures, plus containment of each interior volume within the skull's evaluated world bounds",
      independentOfAuthoredValues: true,
      crossCheckedAgainstIndependentReference: true,
      crossCheckDescription:
        "Volume and manifoldness come from bmesh calc_volume and the boundary edge count, computed by Blender independently of anything this project asserts.",
    },
    hiddenStateVerified: true,
    visibleStateVerified: true,
    controlRangeSwept: false,
    controlRangeDescription:
      "NOT SWEPT. Containment is verified for the rest pose only; no frame at yaw +/-15 exists and nothing establishes that the geometry holds across the authored view range (E-KF-004).",
    notEstablished: [
      "That containment holds once the jaw rotates or the view turns (E-KF-004).",
      "That the oral cavity is an opening through the skull surface; it is a closed ellipsoid placed inside the head (E-KF-002).",
      "That neighbouring volumes do not interpenetrate as the jaw rotates; binding is uniform weight 1.0 (E-KF-001).",
      "Anything about appearance (E-KF-003).",
    ],
  },
];

/** Reasons the registered evidence is not yet complete, per base. */
export function outstandingEvidence(): Record<string, string[]> {
  return Object.fromEntries(
    OCCLUSION_EVIDENCE.map((evidence) => [evidence.base, validateOcclusionEvidence(evidence)]).filter(([, errors]) => (errors as string[]).length > 0),
  );
}
