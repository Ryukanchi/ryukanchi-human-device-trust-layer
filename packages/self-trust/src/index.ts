export type TrustLevel = "trusted" | "degraded" | "compromised";

export interface SelfTrustResult {
  trustLevel: TrustLevel;
  reason: string;
}

export interface EvaluateSelfTrustInput {
  expectedComponents: string[];
  actualComponents: string[];
  integrityOk?: boolean;
}

export function evaluateSelfTrust(
  input: EvaluateSelfTrustInput
): SelfTrustResult {
  if (input.integrityOk === false) {
    return {
      trustLevel: "compromised",
      reason: "System integrity check failed, so SomaGuard self-trust is compromised."
    };
  }

  const actual = new Set(input.actualComponents);
  const missingComponents = input.expectedComponents.filter(
    (component) => !actual.has(component)
  );

  if (missingComponents.length > 0) {
    return {
      trustLevel: "degraded",
      reason: `SomaGuard self-trust is degraded because expected components are missing: ${missingComponents.join(", ")}.`
    };
  }

  return {
    trustLevel: "trusted",
    reason:
      "SomaGuard self-trust is trusted because integrity is acceptable and all expected components are present."
  };
}

