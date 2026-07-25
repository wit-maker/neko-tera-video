import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BLENDER_ENV_VAR, candidateExecutables, resolveBlender, type BlenderReceipt } from "./blender";
import { REQUIRED_BONES, validateDManifest, type DManifest } from "./conformance";

const receipt = JSON.parse(readFileSync(resolve("pipeline/m3/d/build-receipt.json"), "utf8")) as { manifest: DManifest; archiveIdentity: { verified: boolean }; renderPerformed: boolean };
const manifest = () => structuredClone(receipt.manifest);

const toolReceipt: BlenderReceipt = {
  source: { archiveFile: "out/tools/b/blender.zip", archiveSha256: "AB".repeat(32) },
  portableDistribution: { root: "out/tools/b", executable: "out/tools/b/blender.exe", version: "4.5.0", buildHash: "x" },
};

describe("M3-06 locating the M3-01 Blender", () => {
  it("prefers an explicit path over the receipt path", () => {
    const candidates = candidateExecutables(toolReceipt, { [BLENDER_ENV_VAR]: "C:/elsewhere/blender.exe" } as NodeJS.ProcessEnv);
    expect(candidates[0].source).toBe("env");
    expect(candidates[1].source).toBe("receipt-path");
  });

  it("resolves to whichever candidate exists", () => {
    const wanted = resolve("C:/elsewhere/blender.exe");
    const resolved = resolveBlender(toolReceipt, { [BLENDER_ENV_VAR]: "C:/elsewhere/blender.exe" } as NodeJS.ProcessEnv, (path) => path === wanted);
    expect(resolved.executable).toBe(wanted);
    expect(resolved.source).toBe("env");
    expect(resolved.declaredArchiveSha256).toBe(toolReceipt.source.archiveSha256);
  });

  it("fails loudly rather than re-acquiring an approved-once download", () => {
    expect(() => resolveBlender(toolReceipt, {} as NodeJS.ProcessEnv, () => false))
      .toThrow(/never re-downloads: M3-01 approved downloadCount 1/);
  });
});

describe("M3-06 built asset", () => {
  it("was built from the archive the M3-01 receipt identifies, without rendering", () => {
    expect(receipt.archiveIdentity.verified).toBe(true);
    expect(receipt.renderPerformed).toBe(false);
    expect(validateDManifest(manifest())).toEqual([]);
  });

  it("carries every control the card requires", () => {
    const built = manifest();
    for (const bone of REQUIRED_BONES) expect(built.bones).toContain(bone);
    const keys = Object.values(built.shapeKeys).flat();
    expect(keys).toEqual(expect.arrayContaining(["muzzleRound", "cheekPuff", "tongueRaise"]));
  });

  it("occludes the interior by depth rather than by a 2D mask", () => {
    const built = manifest();
    expect(built.occlusion).toHaveLength(8);
    for (const pair of built.occlusion) {
      expect(pair.interiorBehindOccluder).toBe(true);
      expect(pair.depthGap).toBeGreaterThan(0);
    }
  });

  it("rejects an interior plate brought in front of an occluder", () => {
    const broken = manifest();
    broken.occlusion[0] = { ...broken.occlusion[0], interiorBehindOccluder: false, depthGap: -0.01 };
    const errors = validateDManifest(broken);
    expect(errors.join(" ")).toMatch(/is not behind .*occlusion would not be geometric/);
  });

  it("rejects a jaw hinge that drives nothing", () => {
    const broken = manifest();
    const plate = broken.plates.find((entry) => entry.name === "jaw-plate")!;
    plate.vertexGroups = plate.vertexGroups.filter((group) => group !== "jaw");
    expect(validateDManifest(broken)).toContain("jaw-plate must be bound to the jaw control");
  });

  it("rejects the skull-parented upper dentition following the jaw", () => {
    const broken = manifest();
    broken.plates.find((entry) => entry.name === "teeth-upper")!.vertexGroups.push("jaw");
    expect(validateDManifest(broken)).toContain("teeth-upper is skull-parented and must not follow the jaw");
  });

  it("rejects a volume plate, which would make it E rather than D", () => {
    const broken = manifest();
    broken.plates[0].isVolume = true;
    expect(validateDManifest(broken)).toContain(`plate ${broken.plates[0].name} is a volume; D is shallow layered geometry`);
  });

  it("rejects a render, an installed add-on, or a smuggled decision", () => {
    expect(validateDManifest({ ...manifest(), renderPerformed: true })).toContain("M3-06 authors an asset; it must not render");
    expect(validateDManifest({ ...manifest(), addonsInstalledByThisTask: ["something"] })).toContain("M3-06 must install no add-on");
    const ranked = manifest();
    ranked.evaluation = { qualityRanking: "D best", representationDecision: "not-made" };
    expect(validateDManifest(ranked)).toContain("authoring an asset must not carry a quality ranking or a representation decision");
  });

  it("is authored natively, with no borrowed raster", () => {
    const built = manifest();
    expect(built.externalAssetInputs).toEqual([]);
    expect(JSON.stringify(built)).not.toMatch(/\.png|assets\/cutout|patch-config/i);
  });
});
