import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildEvidence, classifyEnforcement, validateEvidence, type HostFirewallRule } from "./enforcement";

const EXE = "C:\\dev\\github\\wit-maker\\neko-tera-video\\node_modules\\.cache\\chrome\\chrome.exe";

const rule = (overrides: Partial<HostFirewallRule> = {}): HostFirewallRule => ({
  name: "unnamed", enabled: true, direction: "Outbound", action: "Block", program: EXE, remoteAddress: ["Any"], ...overrides,
});

const evidenceFor = (rules: HostFirewallRule[]) =>
  buildEvidence({ recordedAt: "2026-07-25T00:00:00.000Z", host: "test-host", readCommand: "Get-NetFirewallRule", verdict: classifyEnforcement(rules, EXE) });

describe("M3-14 enforcement classification", () => {
  it("reports an empty host as not enforced, never as enforced by default", () => {
    // This is the state M0-02 found: no rule exists. A check that only looks for
    // a permissive rule would see nothing and wrongly conclude nothing is wrong.
    const verdict = classifyEnforcement([], EXE);
    expect(verdict.enforced).toBe(false);
    expect(verdict.reasons.join(" ")).toMatch(/no firewall rule is scoped to/);
  });

  it("accepts an enabled outbound block covering all remote addresses", () => {
    const verdict = classifyEnforcement([rule({ name: "p1-render-block" })], EXE);
    expect(verdict.enforced).toBe(true);
    expect(verdict.blockingRules).toEqual(["p1-render-block"]);
    expect(verdict.requiresOwnerReview).toEqual([]);
  });

  it("rejects a block that is disabled, inbound, or narrowly scoped", () => {
    expect(classifyEnforcement([rule({ enabled: false })], EXE).enforced).toBe(false);
    expect(classifyEnforcement([rule({ direction: "Inbound" })], EXE).enforced).toBe(false);
    expect(classifyEnforcement([rule({ remoteAddress: ["10.0.0.0/8"] })], EXE).enforced).toBe(false);
  });

  it("ignores rules scoped to a different program or to no program", () => {
    expect(classifyEnforcement([rule({ program: "C:\\other\\app.exe" })], EXE).enforced).toBe(false);
    expect(classifyEnforcement([rule({ program: null })], EXE).enforced).toBe(false);
  });

  it("matches the executable path regardless of separator and case", () => {
    expect(classifyEnforcement([rule({ program: EXE.replace(/\\/g, "/").toUpperCase() })], EXE).enforced).toBe(true);
  });

  it("surfaces a competing allow rule for the owner instead of resolving precedence", () => {
    const verdict = classifyEnforcement([rule({ name: "block" }), rule({ name: "allow-all", action: "Allow" })], EXE);
    expect(verdict.competingAllowRules).toEqual(["allow-all"]);
    expect(verdict.requiresOwnerReview.join(" ")).toMatch(/Confirm the intended precedence/);
    expect(validateEvidence(evidenceFor([rule({ name: "block" }), rule({ name: "allow-all", action: "Allow" })])))
      .toEqual(expect.arrayContaining([expect.stringMatching(/owner review outstanding/)]));
  });

  it("does not treat a loopback-scoped allow as competing", () => {
    const verdict = classifyEnforcement([rule({ name: "block" }), rule({ name: "loopback", action: "Allow", remoteAddress: ["127.0.0.1", "::1"] })], EXE);
    expect(verdict.competingAllowRules).toEqual([]);
    expect(verdict.enforced).toBe(true);
  });
});

describe("M3-14 evidence document", () => {
  it("blocks a render when enforcement is absent", () => {
    expect(validateEvidence(evidenceFor([]))).toEqual(expect.arrayContaining([expect.stringMatching(/enforcement is not in place/)]));
  });

  it("passes only when enforcement is present and nothing awaits the owner", () => {
    expect(validateEvidence(evidenceFor([rule({ name: "p1-render-block" })]))).toEqual([]);
  });

  it("records that the agent changed nothing and permitted nothing", () => {
    const evidence = evidenceFor([rule()]);
    expect(evidence.ruleChangedByThisTask).toBe(false);
    expect(evidence.renderPermittedByThisTask).toBe(false);
    expect(evidence.appliedBy).toBe("mi3san");
    expect(validateEvidence({ ...evidence, ruleChangedByThisTask: true as false }))
      .toContain("M3-14 must never record an agent-applied firewall change");
  });

  it("keeps the recorder read-only in source, not only in intent", () => {
    // The prohibition is mechanical: m300ExecutionProhibitions forbids
    // firewall-rule-change, so the recorder must contain no mutating cmdlet.
    const source = readFileSync(new URL("./record-enforcement.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/New-NetFirewallRule|Set-NetFirewallRule|Remove-NetFirewallRule|Enable-NetFirewallRule|Disable-NetFirewallRule|netsh/i);
    expect(source).toMatch(/Get-NetFirewallRule/);
  });
});
