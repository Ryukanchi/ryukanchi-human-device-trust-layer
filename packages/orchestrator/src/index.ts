import type {
  PermissionRequest,
  PolicyDecision
} from "../../core-types/src/index.js";
import type { GuardianResult } from "../../guardian/src/index.js";
import type { ComposedRiskResult } from "../../composed-risk/src/index.js";
import type { SandboxResult } from "../../sandbox/src/index.js";

export interface FinalDecision {
  mode: "allowed" | "sandboxed" | "denied" | "requiresApproval";
  reason: string;
}

export type PolicyEngine = (request: PermissionRequest) => PolicyDecision;

export interface SandboxExecutor {
  execute(request: PermissionRequest): SandboxResult;
}

export interface GuardianAnalyzer {
  analyze(): GuardianResult;
}

export interface ComposedRiskEvaluator {
  evaluate(): ComposedRiskResult;
}

export class Orchestrator {
  constructor(
    private readonly policyEngine: PolicyEngine,
    private readonly sandboxEngine: SandboxExecutor,
    private readonly guardian: GuardianAnalyzer,
    private readonly composedRisk: ComposedRiskEvaluator
  ) {}

  handle(request: PermissionRequest): FinalDecision {
    const policyDecision = this.policyEngine(request);
    const sandboxDecision = this.sandboxEngine.execute(request);
    const guardianResult = this.guardian.analyze();
    const composedRiskResult = this.composedRisk.evaluate();

    if (policyDecision.decision === "deny") {
      return {
        mode: "denied",
        reason: `Policy denied the request: ${policyDecision.reason}`
      };
    }

    if (composedRiskResult.riskLevel === "critical") {
      return {
        mode: "requiresApproval",
        reason: `Composed risk requires explicit approval: ${composedRiskResult.reason}`
      };
    }

    if (guardianResult.flagged) {
      return {
        mode: "sandboxed",
        reason: `Guardian flagged the request history, so execution is contained: ${guardianResult.reason}`
      };
    }

    if (sandboxDecision.mode === "sandboxed") {
      return {
        mode: "sandboxed",
        reason: `Sandbox containment selected: ${sandboxDecision.reason}`
      };
    }

    return {
      mode: "allowed",
      reason:
        "Policy allowed the request, Guardian did not flag history, composed risk is not critical, and sandbox did not require containment."
    };
  }
}

