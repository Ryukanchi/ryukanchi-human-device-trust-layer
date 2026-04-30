import { describe, expect, it } from "vitest";
import { AuditLog } from "../packages/audit-log/src/index.js";
import type {
  AppIdentity,
  Device,
  DeviceCapability,
  PermissionRequest,
  PolicyDecision
} from "../packages/core-types/src/index.js";
import {
  createDecisionContext,
  type PolicyEngine
} from "../packages/decision-context/src/index.js";
import { evaluatePermission } from "../packages/policy-engine/src/index.js";
import { SandboxEngine } from "../packages/sandbox/src/index.js";

const trustedApp: AppIdentity = {
  id: "app-trusted",
  name: "Trusted App",
  trustLevel: "trusted",
  trusted: true,
  declaredPurpose: "Trusted sandbox test app.",
  simulationOnly: true
};

const untrustedApp: AppIdentity = {
  id: "app-untrusted",
  name: "Untrusted App",
  trustLevel: "untrusted",
  trusted: false,
  declaredPurpose: "Untrusted sandbox test app.",
  simulationOnly: true
};

const device: Device = {
  id: "device-sandbox",
  name: "Sandbox Device Sim",
  type: "wearable_sim",
  safetyMode: "observe_only",
  capabilities: [],
  simulationOnly: true
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

function makeRequest(input: {
  id: string;
  app: AppIdentity;
  capability: DeviceCapability;
}): PermissionRequest {
  return {
    id: input.id,
    appId: input.app.id,
    deviceId: device.id,
    capabilityId: input.capability.id,
    app: input.app,
    device,
    capability: input.capability,
    requestedAccessType: input.capability.accessType,
    purpose: "Sandbox engine test.",
    createdAt: "2026-04-29T00:00:00.000Z",
    simulationOnly: true
  };
}

const allowMediumPolicy: PolicyEngine = (request): PolicyDecision => ({
  requestId: request.id,
  decision: "allow",
  riskLevel: request.capability.riskLevel,
  reason: "Injected test policy allows this simulated medium-risk request.",
  requiresApproval: false,
  audit: true,
  humanReadableSummary: "Injected test policy allowed the request.",
  simulationOnly: true
});

describe("SandboxEngine", () => {
  it("returns allowed for low-risk allowed requests", () => {
    const auditLog = new AuditLog();
    const engine = new SandboxEngine(auditLog);
    const request = makeRequest({
      id: "request-low",
      app: trustedApp,
      capability: lowCapability
    });
    const result = engine.execute(
      createDecisionContext(request, evaluatePermission)
    );

    expect(result.mode).toBe("allowed");
    expect(result.simulated).toBe(true);
    expect(auditLog.getAll()[0]?.sandboxed).toBe(false);
  });

  it("returns sandboxed for medium-risk allowed requests", () => {
    const auditLog = new AuditLog();
    const engine = new SandboxEngine(auditLog);
    const request = makeRequest({
      id: "request-medium",
      app: trustedApp,
      capability: mediumCapability
    });
    const result = engine.execute(
      createDecisionContext(request, allowMediumPolicy)
    );

    expect(result.mode).toBe("sandboxed");
    expect(result.reason).toContain("sandbox containment");
    expect(result.simulated).toBe(true);
  });

  it("returns denied for high-risk denied requests", () => {
    const auditLog = new AuditLog();
    const engine = new SandboxEngine(auditLog);
    const request = makeRequest({
      id: "request-high",
      app: untrustedApp,
      capability: highCapability
    });
    const result = engine.execute(
      createDecisionContext(request, evaluatePermission)
    );

    expect(result.mode).toBe("denied");
    expect(result.reason).toContain("Request denied by policy");
    expect(result.simulated).toBe(true);
  });

  it("logs sandbox execution with a sandbox flag", () => {
    const auditLog = new AuditLog();
    const engine = new SandboxEngine(auditLog);
    const request = makeRequest({
      id: "request-sandbox-log",
      app: trustedApp,
      capability: mediumCapability
    });

    engine.execute(
      createDecisionContext(request, allowMediumPolicy)
    );

    const events = auditLog.getAll();

    expect(events).toHaveLength(1);
    expect(events[0]?.sandboxed).toBe(true);
    expect(events[0]?.humanReadableSummary).toContain("simulation sandbox");
  });
});
