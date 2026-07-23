import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export const root = process.cwd();

export function pathFromRoot(relative: string): string {
  return resolve(root, relative);
}

export function sha256(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex").toUpperCase();
}

export function run(command: string, args: string[], label = command): string {
  // Windows cannot spawn a .cmd shim directly without cmd.exe; all callers here use fixed local commands.
  const isBatch = process.platform === "win32" && command.toLowerCase().endsWith(".cmd");
  const quoted = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const batchArgument = (value: string) => value.includes(" ") ? quoted(value) : value;
  const result = isBatch
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", `call ${command.includes(" ") ? quoted(command) : command} ${args.map(batchArgument).join(" ")}`], { cwd: root, encoding: "utf8" })
    : spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(`${label} failed (${result.status ?? "spawn"}): ${result.stderr || result.error?.message || result.stdout}`);
  }
  return result.stdout.trim();
}

export function runResult(command: string, args: string[]) {
  return spawnSync(command, args, { cwd: root, encoding: "utf8" });
}

export function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function requireFile(file: string): void {
  if (!existsSync(file)) throw new Error(`Required file is missing: ${file}`);
}

export function argValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}
