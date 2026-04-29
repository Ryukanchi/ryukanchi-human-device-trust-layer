import { describe, expect, it } from "vitest";
import type {
  AppIdentity,
  Device,
  DeviceCapability,
  PermissionRequest
} from "../packages/core-types/src/index.js";
import { evaluatePermission } from "../packages/policy-engine/src/index.js";

const trustedApp: AppIdentity = {
  id: "app-trusted",
  name: "Trusted App",
  trustLevel: "trusted",
  trusted: true,
  declaredPurpose: "Trusted simulation test app.",
  simulationOnly: true
};

const untrustedApp: AppIdentity = {
  id: "app-untrusted",
  name: "Untrusted App",
  trustLevel: "untrusted",
  trusted: false,
  declaredPurpose: "Untrusted simulation test app.",
  simulationOnly: true
};

const normalDevice: Device = {
  id: "device-normal",
  name: "Normal Device Sim",
  type: "wearable_sim",
  safetyMode: "observe_only",
  capabilities: [],
  simulationOnly: true
};

const strictDevice: Device = {
  ...normalDevice,
  id: "device-strict",
  name: "Strict Device Sim",
  safetyMode: "strict"
};

const lowCapability: DeviceCapability = {
  id: "cap-low",
  name: "Read simulated status",
  accessType: "read_status",
  riskLevel: "low",
  description: "Reads synthetic status only.",
  simulationOnly: true
};

const mediumCapability: DeviceCapability = {
  id: "cap-medium",
  name: "Read simulated sensor",
  accessType: "read_sensor",
  riskLevel: "medium",
  description: "Reads synthetic sensor data only.",
  simulationOnly: true
};

const highCapability: DeviceCapability = {
  id: "cap-high",
  name: "Display high-risk simulated overlay",
  accessType: "display_overlay",
  riskLevel: "high",
  description: "Displays a high-risk simulated overlay.",
  simulationOnly: true
};

const criticalCapability: DeviceCapability = {
  id: "cap-critical",
  name: "Request simulated motor assist",
  accessType: "motor_assist",
  riskLevel: "critical",
  description: "Represents simulated motor assist with no hardware interaction.",
  simulationOnly: true
};

function makeRequest(input: {
  app: AppIdentity;
  device: Device;
  capability: DeviceCapability;
}): PermissionRequest {
  return {
    id: `request-${input.app.id}-${input.capability.id}`,
    appId: input.app.id,
    deviceId: input.device.id,
    capabilityId: input.capability.id,
    app: input.app,
    device: input.device,
    capability: input.capability,
    requestedAccessType: input.capability.accessType,
    purpose: "Policy engine simulation test.",
    createdAt: "2026-04-29T00:00:00.000Z",
    simulationOnly: true
  };
}

describe("evaluatePermission", () => {
  it("allows trusted app with low risk capability", () => {
    const decision = evaluatePermission(
      makeRequest({
        app: trustedApp,
        device: normalDevice,
        capability: lowCapability
      })
    );

    expect(decision.decision).toBe("allow");
    expect(decision.riskLevel).toBe("low");
    expect(decision.requiresApproval).toBe(false);
    expect(decision.audit).toBe(true);
    expect(decision.reason.length).toBeGreaterThan(0);
  });

  it("denies untrusted app with high risk capability", () => {
    const decision = evaluatePermission(
      makeRequest({
        app: untrustedApp,
        device: normalDevice,
        capability: highCapability
      })
    );

    expect(decision.decision).toBe("deny");
    expect(decision.reason).toContain("untrusted");
    expect(decision.reason).toContain("high");
    expect(decision.requiresApproval).toBe(false);
  });

  it("strict safety mode blocks non-low risk capabilities", () => {
    const decision = evaluatePermission(
      makeRequest({
        app: trustedApp,
        device: strictDevice,
        capability: mediumCapability
      })
    );

    expect(decision.decision).toBe("deny");
    expect(decision.reason).toContain("strict safety mode");
    expect(decision.requiresApproval).toBe(false);
  });

  it("critical capability is always flagged for explicit approval", () => {
    const decision = evaluatePermission(
      makeRequest({
        app: trustedApp,
        device: normalDevice,
        capability: criticalCapability
      })
    );

    expect(decision.decision).toBe("deny");
    expect(decision.riskLevel).toBe("critical");
    expect(decision.requiresApproval).toBe(true);
    expect(decision.audit).toBe(true);
    expect(decision.reason).toContain("explicit human approval");
  });

  it("denies by default when no allow rule matches", () => {
    const decision = evaluatePermission(
      makeRequest({
        app: trustedApp,
        device: normalDevice,
        capability: mediumCapability
      })
    );

    expect(decision.decision).toBe("deny");
    expect(decision.reason).toContain("denied by default");
    expect(decision.requiresApproval).toBe(false);
    expect(decision.humanReadableSummary).toContain(decision.reason);
  });
});
