import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { REQUIRED_HIERARCHY, REQUIRED_VOLUMES, VIEW_LIMITS, validateEManifest, type EManifest } from "./conformance";

const receipt = JSON.parse(readFileSync(resolve("pipeline/m3/e/build-receipt.json"), "utf8")) as {
  manifest: EManifest;
  archiveIdentity: { verified: boolean };
  renderPerformed: boolean;
};
const manifest = () => structuredClone(receipt.manifest);

describe("M3-08 built asset", () => {
  it("was built from the archive the M3-01 receipt identifies, without rendering", () => {
    expect(receipt.archiveIdentity.verified).toBe(true);
    expect(receipt.renderPerformed).toBe(false);
    expect(validateEManifest(manifest())).toEqual([]);
  });

  it("is made of closed volumes, which is what separates E from D", () => {
    const built = manifest();
    expect(built.volumes).toHaveLength(REQUIRED_VOLUMES.length);
    for (const volume of built.volumes) {
      expect(volume.closed).toBe(true);
      expect(volume.boundaryEdges).toBe(0);
      expect(volume.volume).toBeGreaterThan(0);
    }
  });

  it("rejects an open mesh, which would make it a plate stack", () => {
    const broken = manifest();
    broken.volumes[0] = { ...broken.volumes[0], closed: false, boundaryEdges: 12 };
    expect(validateEManifest(broken)).toContain(`${broken.volumes[0].name} is not a closed volume; E is full 3D, not a plate stack`);
  });

  it("carries a real bone hierarchy in which the jaw inherits from the skull", () => {
    const built = manifest();
    for (const [bone, parent] of Object.entries(REQUIRED_HIERARCHY)) {
      expect(built.boneHierarchy[bone]).toBe(parent);
    }
    expect(built.boneHierarchy.jaw).toBe("skull");
    expect(built.boneHierarchy["lip-corner-L"]).toBe("jaw");
  });

  it("rejects a jaw detached from the skull", () => {
    const broken = manifest();
    broken.boneHierarchy.jaw = null;
    expect(validateEManifest(broken)).toContain("jaw must be parented to skull, not nothing");
  });

  it("keeps the skull/jaw dentition split the other bases use", () => {
    const built = manifest();
    const volume = (name: string) => built.volumes.find((entry) => entry.name === name)!;
    expect(volume("teeth-lower").vertexGroups).toContain("jaw");
    expect(volume("teeth-upper").vertexGroups).not.toContain("jaw");
    expect(volume("teeth-upper").vertexGroups).toContain("skull");

    const broken = manifest();
    broken.volumes.find((entry) => entry.name === "teeth-upper")!.vertexGroups.push("jaw");
    expect(validateEManifest(broken)).toContain("teeth-upper is skull-parented and must not follow the jaw");
  });

  it("carries the corrective shapes a plate stack cannot express", () => {
    const correctives = Object.values(manifest().correctiveShapes).flat();
    expect(correctives).toContain("jawOpen_corrective");
    expect(correctives).toContain("lipRound_corrective");
    expect(validateEManifest({ ...manifest(), correctiveShapes: {} }))
      .toEqual(expect.arrayContaining(["E is missing the jaw-open corrective shape", "E is missing the lip-round corrective shape"]));
  });

  it("expresses camera and view behaviour in the asset at the adopted range", () => {
    const view = manifest().view;
    expect(view.authoredInAsset).toBe(true);
    expect(view.yawLimitDegrees).toBe(VIEW_LIMITS.yawDegrees);
    expect(view.pitchLimitDegrees).toBe(VIEW_LIMITS.pitchDegrees);
    expect(view.limitConstraints).toHaveLength(2);
    expect(view.camera).toBeTruthy();
    expect(view.pivot).toBeTruthy();
  });

  it("rejects a view range that drifts off the adopted comparison boundaries", () => {
    const broken = manifest();
    broken.view = { ...broken.view, yawLimitDegrees: 30 };
    expect(validateEManifest(broken)).toContain("the authored yaw limit must be the adopted +/-15 comparison range");
  });

  it("rejects view behaviour pushed out to a render-time argument", () => {
    const broken = manifest();
    broken.view = { ...broken.view, authoredInAsset: false };
    expect(validateEManifest(broken)).toContain("E must express camera/view behaviour in the asset, not as a render-time argument");
  });

  it("rejects a render, an installed add-on, or a smuggled decision", () => {
    expect(validateEManifest({ ...manifest(), renderPerformed: true })).toContain("M3-08 authors an asset; it must not render");
    expect(validateEManifest({ ...manifest(), addonsInstalledByThisTask: ["something"] })).toContain("M3-08 must install no add-on");
    const ranked = manifest();
    ranked.evaluation = { qualityRanking: "E best", representationDecision: "not-made" };
    expect(validateEManifest(ranked)).toContain("authoring an asset must not carry a quality ranking or a representation decision");
  });

  it("is authored natively, with no borrowed raster", () => {
    const built = manifest();
    expect(built.externalAssetInputs).toEqual([]);
    expect(JSON.stringify(built)).not.toMatch(/\.png|assets\/cutout|patch-config/i);
  });
});
