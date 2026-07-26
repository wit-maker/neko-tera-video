import { execFileSync } from "node:child_process";
import { hostname } from "node:os";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { RENDER_EXECUTABLE_RELATIVE, buildEvidence, classifyEnforcement, validateEvidence, type HostFirewallRule } from "./enforcement";

/**
 * M3-14 evidence recorder.
 *
 * Reads the host firewall state for one executable and writes what it finds.
 * The query is read-only by construction: only Get-* cmdlets are invoked, and a
 * test greps this file for any rule-mutating cmdlet so the prohibition is
 * mechanical rather than a promise. mi3san applies the rule; this records it.
 *
 * Usage: npm run m3:record-network-enforcement -- <absolute-exe-path> [out.json]
 */

const READ_SCRIPT = `
$ErrorActionPreference = 'Stop'
Get-NetFirewallRule |
  ForEach-Object {
    $app = $_ | Get-NetFirewallApplicationFilter
    $addr = $_ | Get-NetFirewallAddressFilter
    [pscustomobject]@{
      name          = $_.DisplayName
      enabled       = [bool]($_.Enabled -eq 'True')
      direction     = [string]$_.Direction
      action        = [string]$_.Action
      program       = $app.Program
      remoteAddress = @($addr.RemoteAddress)
    }
  } | ConvertTo-Json -Depth 4 -Compress
`.trim();

const target = process.argv[2] ?? resolve(RENDER_EXECUTABLE_RELATIVE);
const outPath = resolve(process.argv[3] ?? "out/m3/network-enforcement.json");
if (!existsSync(target)) {
  console.error(`target executable not found: ${target}`);
  console.error("usage: npm run m3:record-network-enforcement -- [absolute-path-to-executable] [out.json]");
  process.exit(2);
}

const readCommand = "powershell -NoProfile -NonInteractive -Command <Get-NetFirewallRule | Get-NetFirewallApplicationFilter/AddressFilter>";
let rules: HostFirewallRule[] = [];
let readError: string | null = null;
try {
  const raw = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", READ_SCRIPT], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const parsed: unknown = JSON.parse(raw);
  rules = (Array.isArray(parsed) ? parsed : [parsed]) as HostFirewallRule[];
} catch (error) {
  readError = error instanceof Error ? error.message : String(error);
}

const verdict = classifyEnforcement(rules, target);
if (readError) verdict.reasons.push(`host firewall state could not be read: ${readError}`);
const evidence = buildEvidence({ recordedAt: new Date().toISOString(), host: hostname(), readCommand, verdict });

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(`wrote ${outPath} (${rules.length} host rules read)`);

const errors = validateEvidence(evidence);
if (errors.length > 0) {
  console.error("M3-14 is NOT satisfied. Render cards M3-02/M3-05/M3-07/M3-09 stay closed.");
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("M3-14 enforcement evidence recorded. This records host state; it does not itself permit a render.");
