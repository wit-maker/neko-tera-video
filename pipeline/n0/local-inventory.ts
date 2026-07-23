import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..", "..");
const OUTPUT_PATH = join(REPOSITORY_ROOT, "out", "n0", "local-inventory.json");
const MODEL_EXTENSIONS = new Set([".bin", ".ckpt", ".gguf", ".onnx", ".pt", ".pth", ".safetensors"]);
const DATASET_EXTENSIONS = new Set([".arrow", ".csv", ".jsonl", ".parquet", ".tar", ".zip"]);
const EXCLUDED_DIRECTORIES = new Set([".git", "node_modules", "out"]);

export type N0DecisionState =
  | "ready-for-approved-local-spike"
  | "blocked-awaiting-owner-external-approval"
  | "local-no-go";

export interface LocalCandidate {
  kind: "model-or-weight" | "dataset";
  path: string;
  sha256: string;
  licenseDeclaration: string | "not-present";
}

export interface LocalInventory {
  schemaVersion: "n0-local-inventory-v1";
  generatedAt: string;
  sourceCommit: string;
  gpu: { status: "available" | "not-present" | "unknown"; name: string | "unknown"; driver: string | "unknown"; vramMiB: number | "unknown" };
  tools: Record<"node" | "nvidia-smi" | "docker", { status: "available" | "not-present" | "unknown"; version: string | "unknown" }>;
  candidateEvidence: { modelOrWeights: "present" | "not-present"; datasets: "present" | "not-present" };
  candidates: LocalCandidate[];
  decision: { state: N0DecisionState; rationale: string[] };
}

function runReadOnlyTool(command: string, args: string[]): string | undefined {
  try {
    return execFileSync(command, args, { cwd: REPOSITORY_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true }).trim();
  } catch {
    return undefined;
  }
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function relativePosix(path: string): string {
  return relative(REPOSITORY_ROOT, path).split(sep).join("/");
}

function findLicenseDeclaration(path: string): string | "not-present" {
  let directory = dirname(path);
  while (directory.startsWith(REPOSITORY_ROOT)) {
    const found = readdirSync(directory, { withFileTypes: true })
      .find((entry) => entry.isFile() && /^(license|copying|ofl)(\.[a-z0-9_-]+)?$/i.test(entry.name));
    if (found) return relativePosix(join(directory, found.name));
    if (directory === REPOSITORY_ROOT) break;
    directory = dirname(directory);
  }
  return "not-present";
}

function collectCandidates(directory: string, candidates: LocalCandidate[] = []): LocalCandidate[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) collectCandidates(join(directory, entry.name), candidates);
      continue;
    }
    if (!entry.isFile()) continue;
    const path = join(directory, entry.name);
    const extension = extname(entry.name).toLowerCase();
    const kind = MODEL_EXTENSIONS.has(extension)
      ? "model-or-weight"
      : DATASET_EXTENSIONS.has(extension) && /(?:data|dataset|train|corpus)/i.test(relativePosix(path))
        ? "dataset"
        : undefined;
    if (kind) candidates.push({ kind, path: relativePosix(path), sha256: sha256(path), licenseDeclaration: findLicenseDeclaration(path) });
  }
  return candidates.sort((left, right) => left.path.localeCompare(right.path));
}

export function determineDecision(candidates: LocalCandidate[]): LocalInventory["decision"] {
  const models = candidates.filter((candidate) => candidate.kind === "model-or-weight");
  const licensedModels = models.filter((candidate) => candidate.licenseDeclaration !== "not-present");
  if (models.length === 0) return { state: "blocked-awaiting-owner-external-approval", rationale: ["No repository-local model or weight candidate was evidenced; no external acquisition was attempted."] };
  if (licensedModels.length === 0) return { state: "local-no-go", rationale: ["Repository-local model or weight candidates lack a nearby license declaration."] };
  return { state: "ready-for-approved-local-spike", rationale: ["Repository-local model or weight candidate(s) with a nearby license declaration were evidenced.", "This state does not approve a model run, representation ranking, external access, or dependency change."] };
}

export function createLocalInventory(generatedAt = new Date().toISOString()): LocalInventory {
  const sourceCommit = runReadOnlyTool("git", ["rev-parse", "HEAD"]) ?? "unknown";
  const gpuQuery = runReadOnlyTool("nvidia-smi", ["--query-gpu=name,driver_version,memory.total", "--format=csv,noheader,nounits"]);
  const gpuParts = gpuQuery?.split(/\r?\n/)[0]?.split(",").map((part) => part.trim());
  const gpu = gpuParts && gpuParts.length === 3
    ? { status: "available" as const, name: gpuParts[0], driver: gpuParts[1], vramMiB: Number(gpuParts[2]) }
    : { status: "not-present" as const, name: "unknown" as const, driver: "unknown" as const, vramMiB: "unknown" as const };
  const nodeVersion = process.version;
  const nvidiaVersion = runReadOnlyTool("nvidia-smi", ["--version"]);
  const dockerVersion = runReadOnlyTool("docker", ["--version"]);
  const candidates = collectCandidates(REPOSITORY_ROOT);
  return {
    schemaVersion: "n0-local-inventory-v1",
    generatedAt,
    sourceCommit,
    gpu,
    tools: {
      node: { status: "available", version: nodeVersion },
      "nvidia-smi": { status: nvidiaVersion ? "available" : "not-present", version: nvidiaVersion ?? "unknown" },
      docker: { status: dockerVersion ? "available" : "not-present", version: dockerVersion ?? "unknown" },
    },
    candidateEvidence: {
      modelOrWeights: candidates.some((candidate) => candidate.kind === "model-or-weight") ? "present" : "not-present",
      datasets: candidates.some((candidate) => candidate.kind === "dataset") ? "present" : "not-present",
    },
    candidates,
    decision: determineDecision(candidates),
  };
}

export function writeLocalInventory(): LocalInventory {
  const inventory = createLocalInventory();
  const outputDirectory = dirname(OUTPUT_PATH);
  if (!existsSync(outputDirectory)) {
    // out/ is ignored and this is the task's only intentional filesystem output.
    mkdirSync(outputDirectory, { recursive: true });
  }
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  return inventory;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const inventory = writeLocalInventory();
  console.log(`N0 local inventory: ${inventory.decision.state}`);
}
