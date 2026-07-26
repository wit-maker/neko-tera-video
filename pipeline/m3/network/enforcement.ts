/**
 * M3-14: classification of local outbound-block / loopback-only enforcement.
 *
 * `pipeline/m3/p1-track-a-run-definition.json` requires, before any P1 render,
 * explicit local enforcement evidence that the target executable is blocked
 * outbound and permitted loopback only. M0-02 found no such rule on this host.
 *
 * This module only classifies host state that has already been read. It never
 * creates, edits, or deletes a firewall rule: `firewall-rule-change` is in
 * `m300ExecutionProhibitions`, and changing a host security setting is the
 * owner's action, not an agent's. mi3san applies the rule; Forge records what
 * is there afterwards.
 */

export const M3_14_STATUS = "PROPOSED" as const;

/**
 * The binary a Remotion render actually launches on this host, and therefore
 * the one the rule must be scoped to. Resolved from the local checkout rather
 * than assumed; confirm it still exists before recording evidence.
 */
export const RENDER_EXECUTABLE_RELATIVE =
  "node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe";

export type Direction = "Inbound" | "Outbound";
export type Action = "Allow" | "Block";

/** A firewall rule as read back from the host, already joined to its filters. */
export interface HostFirewallRule {
  name: string;
  enabled: boolean;
  direction: Direction;
  action: Action;
  /** Absolute path of the program the rule is scoped to, or null for any program. */
  program: string | null;
  /** Remote addresses the rule covers, as reported by the host. */
  remoteAddress: string[];
}

export interface EnforcementVerdict {
  enforced: boolean;
  targetExecutable: string;
  /** Rules that establish the block. */
  blockingRules: string[];
  /** Enabled outbound Allow rules for the same program. Reported, never resolved. */
  competingAllowRules: string[];
  reasons: string[];
  /** Anything the classifier declines to decide on the owner's behalf. */
  requiresOwnerReview: string[];
}

const ANY_REMOTE = new Set(["any", "*", "0.0.0.0-255.255.255.255", "::/0", "0.0.0.0/0"]);
const LOOPBACK = new Set(["127.0.0.1", "::1", "127.0.0.0/8", "localsubnet"]);

const samePath = (a: string | null, b: string): boolean =>
  a !== null && a.replace(/\\/g, "/").toLowerCase() === b.replace(/\\/g, "/").toLowerCase();

const coversAnyRemote = (rule: HostFirewallRule): boolean =>
  rule.remoteAddress.length === 0 || rule.remoteAddress.some((address) => ANY_REMOTE.has(address.trim().toLowerCase()));

const isLoopbackOnly = (rule: HostFirewallRule): boolean =>
  rule.remoteAddress.length > 0 && rule.remoteAddress.every((address) => LOOPBACK.has(address.trim().toLowerCase()));

/**
 * Decides whether the read-back host state satisfies the run definition's
 * precondition for `targetExecutable`.
 *
 * Absence of evidence is reported as not enforced. It is never reported as
 * enforced-by-default, which is the failure AP-010 generalised: a check that
 * only looks for the permissive case cannot see the restrictive one missing.
 */
export function classifyEnforcement(rules: readonly HostFirewallRule[], targetExecutable: string): EnforcementVerdict {
  const scoped = rules.filter((rule) => samePath(rule.program, targetExecutable));
  const outbound = scoped.filter((rule) => rule.enabled && rule.direction === "Outbound");
  const blocking = outbound.filter((rule) => rule.action === "Block" && coversAnyRemote(rule));
  const competing = outbound.filter((rule) => rule.action === "Allow" && !isLoopbackOnly(rule));

  const reasons: string[] = [];
  const requiresOwnerReview: string[] = [];

  if (scoped.length === 0) reasons.push(`no firewall rule is scoped to ${targetExecutable}`);
  else if (blocking.length === 0) reasons.push(`no enabled outbound Block rule covering all remote addresses is scoped to ${targetExecutable}`);

  if (competing.length > 0) {
    // Windows evaluates Block before Allow, but this classifier does not decide
    // an owner's security posture from a precedence rule it did not verify here.
    requiresOwnerReview.push(
      `${competing.length} enabled outbound Allow rule(s) also target this executable (${competing.map((rule) => rule.name).join(", ")}). Confirm the intended precedence before rendering.`,
    );
  }

  return {
    enforced: blocking.length > 0 && reasons.length === 0,
    targetExecutable,
    blockingRules: blocking.map((rule) => rule.name),
    competingAllowRules: competing.map((rule) => rule.name),
    reasons,
    requiresOwnerReview,
  };
}

/** The evidence document written for the run definition's acceptedEvidence field. */
export interface EnforcementEvidence {
  schemaVersion: "m3-14-enforcement-evidence-v1";
  task: "M3-14";
  status: typeof M3_14_STATUS;
  recordedAt: string;
  host: string;
  readCommand: string;
  verdict: EnforcementVerdict;
  appliedBy: "mi3san";
  recordedBy: "Forge";
  ruleChangedByThisTask: false;
  renderPermittedByThisTask: false;
}

export function buildEvidence(input: {
  recordedAt: string;
  host: string;
  readCommand: string;
  verdict: EnforcementVerdict;
}): EnforcementEvidence {
  return {
    schemaVersion: "m3-14-enforcement-evidence-v1",
    task: "M3-14",
    status: M3_14_STATUS,
    recordedAt: input.recordedAt,
    host: input.host,
    readCommand: input.readCommand,
    verdict: input.verdict,
    appliedBy: "mi3san",
    recordedBy: "Forge",
    ruleChangedByThisTask: false,
    renderPermittedByThisTask: false,
  };
}

/** Returns every reason the evidence document may not be used to unblock a render. */
export function validateEvidence(evidence: EnforcementEvidence): string[] {
  const errors: string[] = [];
  if (evidence.schemaVersion !== "m3-14-enforcement-evidence-v1") errors.push("unrecognised evidence schema");
  if (evidence.ruleChangedByThisTask !== false) errors.push("M3-14 must never record an agent-applied firewall change");
  if (evidence.renderPermittedByThisTask !== false) errors.push("recording evidence does not itself permit a render");
  if (!evidence.recordedAt || !evidence.host || !evidence.readCommand) errors.push("evidence needs a timestamp, a host, and the read command used");
  if (!evidence.verdict.enforced) errors.push(`enforcement is not in place: ${evidence.verdict.reasons.join("; ") || "no reason recorded"}`);
  if (evidence.verdict.requiresOwnerReview.length > 0) errors.push(`owner review outstanding: ${evidence.verdict.requiresOwnerReview.join("; ")}`);
  return errors;
}
