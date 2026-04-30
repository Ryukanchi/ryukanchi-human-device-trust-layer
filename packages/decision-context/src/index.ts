import type {
  PermissionRequest,
  PolicyDecision
} from "../../core-types/src/index.js";

export interface DecisionContext {
  request: PermissionRequest;
  policyDecision: PolicyDecision;
}

export type PolicyEngine = (request: PermissionRequest) => PolicyDecision;

export function createDecisionContext(
  request: PermissionRequest,
  policyEngine: PolicyEngine
): DecisionContext {
  const policyDecision = policyEngine(request);

  return {
    request,
    policyDecision
  };
}

