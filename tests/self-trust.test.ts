import { describe, expect, it } from "vitest";
import { evaluateSelfTrust } from "../packages/self-trust/src/index.js";

const expectedComponents = [
  "policy-engine",
  "audit-log",
  "guardian",
  "composed-risk",
  "sandbox"
];

describe("evaluateSelfTrust", () => {
  it("returns trusted when integrity is true and all components are present", () => {
    const result = evaluateSelfTrust({
      expectedComponents,
      actualComponents: expectedComponents,
      integrityOk: true
    });

    expect(result.trustLevel).toBe("trusted");
    expect(result.reason).toContain("all expected components are present");
  });

  it("returns degraded when an expected component is missing", () => {
    const result = evaluateSelfTrust({
      expectedComponents,
      actualComponents: ["policy-engine", "audit-log", "guardian", "sandbox"],
      integrityOk: true
    });

    expect(result.trustLevel).toBe("degraded");
    expect(result.reason).toContain("composed-risk");
  });

  it("returns compromised when integrity is false", () => {
    const result = evaluateSelfTrust({
      expectedComponents,
      actualComponents: expectedComponents,
      integrityOk: false
    });

    expect(result.trustLevel).toBe("compromised");
    expect(result.reason).toContain("integrity check failed");
  });
});

