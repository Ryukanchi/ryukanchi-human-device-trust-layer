import type {
  AuditEvent,
  PermissionRequest,
  PolicyDecision
} from "../../core-types/src/index.js";
import type { AuditLog } from "../../audit-log/src/index.js";
import { createAuditEvent } from "../../audit-log/src/index.js";

export interface SandboxResult {
  mode: "allowed" | "sandboxed" | "denied";
  reason: string;
  simulated: boolean;
}

export type PolicyEngine = (request: PermissionRequest) => PolicyDecision;

export class SandboxEngine {
  constructor(
    private readonly policyEngine: PolicyEngine,
    private readonly auditLog: AuditLog
  ) {}

  execute(request: PermissionRequest): SandboxResult {
    const decision = this.policyEngine(request);
    const mode = this.getMode(decision);
    const auditEvent = this.createExecutionEvent(request, decision, mode);

    this.auditLog.record(auditEvent);

    if (mode === "allowed") {
      return {
        mode,
        reason:
          "Low-risk simulated request was allowed by policy and recorded in the audit log.",
        simulated: true
      };
    }

    if (mode === "sandboxed") {
      return {
        mode,
        reason:
          "Policy allowed the request, but medium or high risk requires simulated sandbox containment instead of real execution.",
        simulated: true
      };
    }

    return {
      mode,
      reason: `Request denied by policy: ${decision.reason}`,
      simulated: true
    };
  }

  private getMode(decision: PolicyDecision): SandboxResult["mode"] {
    if (decision.decision === "deny") {
      return "denied";
    }

    if (decision.riskLevel === "low") {
      return "allowed";
    }

    return "sandboxed";
  }

  private createExecutionEvent(
    request: PermissionRequest,
    decision: PolicyDecision,
    mode: SandboxResult["mode"]
  ): AuditEvent {
    const event = createAuditEvent(
      request,
      decision,
      this.auditLog.getAll().length
    );

    return {
      ...event,
      sandboxed: mode === "sandboxed",
      humanReadableSummary:
        mode === "sandboxed"
          ? `${event.humanReadableSummary} Execution was contained in the SomaGuard simulation sandbox.`
          : event.humanReadableSummary
    };
  }
}

