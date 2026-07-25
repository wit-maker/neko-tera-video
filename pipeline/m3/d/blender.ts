import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

/**
 * M3-06/M3-08: locating the Blender provisioned under M3-01.
 *
 * `out/` is gitignored, so the provision lives in exactly one working copy and
 * its receipt path does not resolve from every checkout. Rather than copy 1.3 GB
 * or re-acquire it -- the acquisition was approved once, downloadCount 1 -- the
 * executable is resolved at run time and the resolved absolute path is recorded
 * in provenance. Identity is the archive SHA-256 from the receipt, not a path.
 */

export const BLENDER_RECEIPT_PATH = "pipeline/m3/blender-tool-receipt.json";
export const BLENDER_ENV_VAR = "NEKO_BLENDER_EXECUTABLE";

export interface BlenderReceipt {
  source: { archiveFile: string; archiveSha256: string };
  portableDistribution: { root: string; executable: string; version: string; buildHash: string };
}

export interface ResolvedBlender {
  executable: string;
  archive: string | null;
  source: "env" | "receipt-path" | "sibling-worktree";
  declaredVersion: string;
  declaredArchiveSha256: string;
}

/** Candidate roots, most explicit first. */
export function candidateExecutables(receipt: BlenderReceipt, env: NodeJS.ProcessEnv = process.env): Array<{ path: string; source: ResolvedBlender["source"] }> {
  const candidates: Array<{ path: string; source: ResolvedBlender["source"] }> = [];
  const fromEnv = env[BLENDER_ENV_VAR];
  if (fromEnv) candidates.push({ path: resolve(fromEnv), source: "env" });
  candidates.push({ path: resolve(receipt.portableDistribution.executable), source: "receipt-path" });
  const siblingRoot = env.NEKO_BLENDER_SEARCH_ROOT;
  if (siblingRoot) candidates.push({ path: resolve(siblingRoot, receipt.portableDistribution.executable), source: "sibling-worktree" });
  return candidates;
}

export function readReceipt(path = BLENDER_RECEIPT_PATH): BlenderReceipt {
  return JSON.parse(readFileSync(resolve(path), "utf8")) as BlenderReceipt;
}

/**
 * Resolves the executable or explains why it could not.
 *
 * It never downloads. M3-01 approved a single acquisition; a missing provision
 * is an owner decision about placement, not something to silently re-fetch.
 */
export function resolveBlender(receipt: BlenderReceipt, env: NodeJS.ProcessEnv = process.env, exists: (path: string) => boolean = existsSync): ResolvedBlender {
  for (const candidate of candidateExecutables(receipt, env)) {
    if (exists(candidate.path)) {
      const archive = resolve(candidate.path, "..", "..", receipt.source.archiveFile.split("/").pop() ?? "");
      return {
        executable: candidate.path,
        archive: exists(archive) ? archive : null,
        source: candidate.source,
        declaredVersion: receipt.portableDistribution.version,
        declaredArchiveSha256: receipt.source.archiveSha256,
      };
    }
  }
  throw new Error(
    `Blender provisioned under M3-01 was not found. Set ${BLENDER_ENV_VAR} to its absolute path. ` +
      `This never re-downloads: M3-01 approved downloadCount 1, so a missing provision is an owner decision about placement.`,
  );
}

/** SHA-256 of the provisioned archive, for matching against the M3-01 receipt. */
export function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

export function verifyArchiveIdentity(resolved: ResolvedBlender): { verified: boolean; reason: string } {
  if (!resolved.archive) return { verified: false, reason: "archive not present beside the executable; identity not confirmed from this checkout" };
  const actual = hashFile(resolved.archive);
  return actual === resolved.declaredArchiveSha256
    ? { verified: true, reason: `archive SHA-256 matches the M3-01 receipt (${actual})` }
    : { verified: false, reason: `archive SHA-256 ${actual} does not match the M3-01 receipt ${resolved.declaredArchiveSha256}` };
}
