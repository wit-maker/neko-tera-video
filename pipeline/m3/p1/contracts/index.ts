/**
 * p1-i3: complete registry and cross-base invariant checker for the four
 * core P1 render methods (A/C/D/E).
 *
 * This file is COMPLETE as of p1-i3. Render packets (p1-a/p1-c2/p1-d/p1-e)
 * edit exactly one of `a.ts`/`c.ts`/`d.ts`/`e.ts` and never this file --
 * that is what removes the parallel-execution merge conflict this packet
 * exists to prevent.
 *
 * Generalises `pipeline/p0/contracts.ts`'s single-method `BASELINE` constant:
 * P0 had exactly one method (A), so `validate.ts` could hardcode `"60/1"` and
 * `evaluate.ts` could read `BASELINE.stills`/`BASELINE.crop` directly. With
 * four methods that share most fields but diverge on a few mechanism-specific
 * ones, the shape itself has to carry the split (see `types.ts`'s
 * `P1MethodContract`) instead of leaving it to callers to remember which
 * fields are safe to assume equal.
 */
import { A_CONTRACT } from "./a";
import { C_CONTRACT } from "./c";
import { D_CONTRACT } from "./d";
import { E_CONTRACT } from "./e";
import runDefinitionJson from "../../p1-track-a-run-definition.json";
import { BASES, CROSS_BASE_INVARIANT_FIELDS, PRESENTATION_ORDER, type Base, type P1MethodContract } from "./types";

export * from "./types";

export const REGISTRY: Record<Base, P1MethodContract> = {
  A: A_CONTRACT,
  C: C_CONTRACT,
  D: D_CONTRACT,
  E: E_CONTRACT,
};

// ---------------------------------------------------------------------------
// Budget: read from the Track A run definition, never restated in a leaf.
// `pipeline/m3/p1-track-a-run-definition.json`'s numbers are owner-approved
// (M3-03); copying them into a contract leaf would only let them drift.
// ---------------------------------------------------------------------------

interface RunDefinitionBudget {
  operatorHours: number;
  nativeAssetRevisionsMax: number;
  finalRenderAttemptsMax: number;
}
interface RunDefinitionCandidate {
  base: string;
  role: string;
  budget: RunDefinitionBudget;
}
interface RunDefinitionFile {
  candidates: RunDefinitionCandidate[];
}

const RUN_DEFINITION = runDefinitionJson as unknown as RunDefinitionFile;

/** Reads (never restates) the Track A production ceiling for `base`'s core candidate. */
export function readTrackABudget(base: Base): RunDefinitionBudget {
  const candidate = RUN_DEFINITION.candidates.find((c) => c.base === base && c.role === "core");
  if (!candidate) {
    throw new Error(`p1-track-a-run-definition.json has no "core" candidate for base ${base}`);
  }
  return candidate.budget;
}

// ---------------------------------------------------------------------------
// Method-specific hole completeness (runtime backstop for the compile-time
// `T | undefined` guard in types.ts -- see that file's module doc comment).
// ---------------------------------------------------------------------------

/**
 * Throws if `contract` still has an unfilled method-specific hole
 * (`renderer`, `camera.projection`, or `debugPass`). A render packet should
 * call this once it believes its leaf is complete; it is not called by this
 * packet's own tests or CLI, because at p1-i3 every leaf is legitimately
 * still a hole (filling leaves is out of this packet's scope).
 */
export function assertLeafFilled(contract: P1MethodContract): void {
  const missing: string[] = [];
  if (contract.renderer === undefined) missing.push("renderer");
  if (contract.camera.projection === undefined) missing.push("camera.projection");
  if (contract.debugPass === undefined) missing.push("debugPass");
  if (missing.length > 0) {
    throw new Error(`base ${contract.base} contract is missing method-specific field(s): ${missing.join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// Cross-base invariant checker.
//
// AP-014 (走査型の検査が、走査対象を確認しないまま通る): a scan that finds zero
// mismatches over zero leaves is a silent false pass -- the exact same
// "green because nothing ran" failure mode as the file-scanner AP-014
// describes, just over a registry instead of a directory. This function
// refuses to proceed to any comparison until it has confirmed it is holding
// exactly the four core leaves; an incomplete registry is reported as an
// error, never silently treated as "no mismatch found".
// ---------------------------------------------------------------------------

const FORBIDDEN_QUALITY_KEY = /rank|score|decision/i;
const BUDGET_SHAPED_KEY = /^(budget|operatorHours|nativeAssetRevisionsMax|finalRenderAttemptsMax)$/;

function scanKeys(value: unknown, pattern: RegExp, path = ""): string[] {
  if (value === null || typeof value !== "object") return [];
  const hits: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const at = path ? `${path}.${key}` : key;
    if (pattern.test(key)) hits.push(at);
    hits.push(...scanKeys(child, pattern, at));
  }
  return hits;
}

/**
 * Validates the cross-base invariants over a (possibly incomplete) registry.
 * Returns every violation; makes no quality, ranking, or representation
 * decision (that stays the run definition's `evaluation` block's job).
 */
export function validateCrossBaseInvariants(registry: Partial<Record<Base, P1MethodContract>>): string[] {
  const errors: string[] = [];
  const present = BASES.filter((base) => registry[base] !== undefined);

  // The AP-014 guard: assert the scan actually has all 4 leaves before
  // asserting anything about their agreement.
  if (present.length !== BASES.length) {
    errors.push(
      `cross-base invariant check requires all ${BASES.length} core leaves (${BASES.join("/")}); only found ${present.length} (${present.join(",") || "none"}). Refusing to report "no mismatch" over an incomplete registry.`,
    );
    return errors;
  }

  const leaves = BASES.map((base) => registry[base] as P1MethodContract);
  const [reference, ...rest] = leaves;

  for (const field of CROSS_BASE_INVARIANT_FIELDS) {
    const referenceJson = JSON.stringify(reference[field]);
    for (const other of rest) {
      if (JSON.stringify(other[field]) !== referenceJson) {
        errors.push(`"${field}" differs between base ${reference.base} and base ${other.base}; it must be byte-identical across all four core methods`);
      }
    }
  }

  // Bonus check beyond the packet's headline 6 fields: sequenceIds is also
  // declared shared for the core 4 methods in the packet's design table,
  // even though it is not part of CROSS_BASE_INVARIANT_FIELDS.
  {
    const referenceJson = JSON.stringify(reference.sequenceIds);
    for (const other of rest) {
      if (JSON.stringify(other.sequenceIds) !== referenceJson) {
        errors.push(`"sequenceIds" differs between base ${reference.base} and base ${other.base}`);
      }
    }
  }

  for (const leaf of leaves) {
    if (leaf.camera.authoredIn === "asset" && leaf.base !== "E") {
      errors.push(`base ${leaf.base} declares camera.authoredIn = "asset"; only E (M3-08) may author its own camera`);
    }
    if (leaf.base === "E" && leaf.camera.authoredIn !== "asset") {
      errors.push(`base E must declare camera.authoredIn = "asset" (M3-08 authored its own camera)`);
    }
  }

  const presentationCanonical = PRESENTATION_ORDER.join(",");
  for (const leaf of leaves) {
    // Defensive: a malformed leaf's `presentation` might not even be an
    // array at runtime (nothing stops a hand-built fixture from doing that).
    // Report it as a mismatch rather than throwing out of this checker.
    const actual = Array.isArray(leaf.presentation) ? leaf.presentation.join(",") : JSON.stringify(leaf.presentation);
    if (actual !== presentationCanonical) {
      errors.push(`base ${leaf.base} presentation must be exactly [${presentationCanonical}]; got [${actual}]`);
    }
  }

  for (const leaf of leaves) {
    for (const key of scanKeys(leaf, FORBIDDEN_QUALITY_KEY)) {
      errors.push(`base ${leaf.base} contract carries a forbidden quality field "${key}"; this contract makes no ranking, scoring, or representation decision`);
    }
    for (const key of scanKeys(leaf, BUDGET_SHAPED_KEY)) {
      errors.push(`base ${leaf.base} contract carries a budget-shaped field "${key}"; budget must be read via readTrackABudget(), never written into a leaf`);
    }
  }

  return errors;
}
