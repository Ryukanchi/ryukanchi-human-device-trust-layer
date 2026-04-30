import { describe, expect, it } from "vitest";
import type {
  AppIdentity,
  Device,
  DeviceCapability,
  PermissionRequest,
  PolicyDecision
} from "../packages/core-types/src/index.js";
import {
  AuditLog,
  createAuditEvent,
  logDecision,
  verifyAuditChain
} from "../packages/audit-log/src/index.js";

const app: AppIdentity = {
  id: "app-rehabassist",
  name: "RehabAssist",
  trustLevel: "trusted",
  trusted: true,
  declaredPurpose: "Trusted simulation app.",
  simulationOnly: true
};

const device: Device = {
  id: "device-pulseband-sim",
  name: "PulseBand Sim",
  type: "wearable_sim",
  safetyMode: "observe_only",
  capabilities: [],
  simulationOnly: true
};

const capability: DeviceCapability = {
  id: "pulseband-status-read",
  name: "Read simulated status",
  accessType: "read_status",
  riskLevel: "low",
  description: "Reads synthetic status only.",
  simulationOnly: true
};

const request: PermissionRequest = {
  id: "request-1",
  appId: app.id,
  deviceId: device.id,
  capabilityId: capability.id,
  app,
  device,
  capability,
  requestedAccessType: capability.accessType,
  purpose: "Audit log unit test.",
  createdAt: "2026-04-29T00:00:00.000Z",
  simulationOnly: true
};

const decision: PolicyDecision = {
  requestId: request.id,
  decision: "allow",
  riskLevel: "low",
  reason: "The app is trusted and the requested simulated capability is low risk.",
  requiresApproval: false,
  audit: true,
  humanReadableSummary: "Allowed RehabAssist to read simulated status.",
  simulationOnly: true
};

describe("AuditLog", () => {
  it("records an event correctly", () => {
    const auditLog = new AuditLog();
    const event = logDecision(request, decision, auditLog);

    expect(auditLog.getAll()).toEqual([event]);
  });

  it("accumulates multiple events", () => {
    const auditLog = new AuditLog();

    logDecision(request, decision, auditLog);
    logDecision(
      {
        ...request,
        id: "request-2"
      },
      {
        ...decision,
        requestId: "request-2"
      },
      auditLog
    );

    const events = auditLog.getAll();

    expect(events).toHaveLength(2);
    expect(events[0]?.timestamp).toBe("2026-01-01T00:00:00.000Z");
    expect(events[1]?.timestamp).toBe("2026-01-01T00:00:01.000Z");
  });

  it("clear resets the log for test/demo lifecycle only", () => {
    const auditLog = new AuditLog();

    logDecision(request, decision, auditLog);
    auditLog.clear();

    expect(auditLog.getAll()).toEqual([]);
  });

  it("resetForTestOnly explicitly resets the log for test/demo lifecycle", () => {
    const auditLog = new AuditLog();

    logDecision(request, decision, auditLog);
    auditLog.resetForTestOnly();

    expect(auditLog.getAll()).toEqual([]);
  });

  it("event contains correct fields", () => {
    const event = createAuditEvent(request, decision);

    expect(event).toMatchObject({
      id: "audit-request-1-0",
      eventType: "policy_decision_recorded",
      timestamp: "2026-01-01T00:00:00.000Z",
      appId: "app-rehabassist",
      deviceId: "device-pulseband-sim",
      capabilityId: "pulseband-status-read",
      capabilityName: "Read simulated status",
      decision: "allow",
      riskLevel: "low",
      requiresApproval: false,
      audit: true,
      simulationOnly: true
    });
    expect(event.humanReadableSummary).toContain("RehabAssist");
  });

  it("preserves the decision reason", () => {
    const event = createAuditEvent(request, decision);

    expect(event.reason).toBe(decision.reason);
    expect(event.humanReadableSummary).toContain(decision.reason);
  });

  it("recorded events receive sequence numbers", () => {
    const auditLog = new AuditLog();

    logDecision(request, decision, auditLog);
    logDecision(
      {
        ...request,
        id: "request-2"
      },
      {
        ...decision,
        requestId: "request-2"
      },
      auditLog
    );

    const events = auditLog.getAll();

    expect(events[0]?.sequenceNumber).toBe(1);
    expect(events[1]?.sequenceNumber).toBe(2);
    expect(events[0]?.schemaVersion).toBe("audit-chain-v1");
    expect(events[1]?.schemaVersion).toBe("audit-chain-v1");
  });

  it("first event has previousEventHash null", () => {
    const auditLog = new AuditLog();

    logDecision(request, decision, auditLog);

    const [event] = auditLog.getAll();

    expect(event?.previousEventHash).toBeNull();
    expect(event?.eventHash).toEqual(expect.any(String));
  });

  it("second event references first event hash", () => {
    const auditLog = new AuditLog();

    logDecision(request, decision, auditLog);
    logDecision(
      {
        ...request,
        id: "request-2"
      },
      {
        ...decision,
        requestId: "request-2"
      },
      auditLog
    );

    const events = auditLog.getAll();

    expect(events[1]?.previousEventHash).toBe(events[0]?.eventHash);
  });

  it("verifyAuditChain returns valid for untouched logs", () => {
    const auditLog = new AuditLog();

    logDecision(request, decision, auditLog);
    logDecision(
      {
        ...request,
        id: "request-2"
      },
      {
        ...decision,
        requestId: "request-2"
      },
      auditLog
    );

    expect(verifyAuditChain(auditLog.getAll())).toEqual({
      valid: true,
      reason: null
    });
  });

  it("verifyAuditChain detects modified event content", () => {
    const auditLog = new AuditLog();

    logDecision(request, decision, auditLog);

    const [event] = auditLog.getAll();
    const tamperedEvents = [
      {
        ...event,
        reason: "Tampered reason."
      }
    ];

    const result = verifyAuditChain(tamperedEvents);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("hash does not match");
    expect(result.brokenAtSequenceNumber).toBe(1);
  });

  it("verifyAuditChain detects broken previous hash", () => {
    const auditLog = new AuditLog();

    logDecision(request, decision, auditLog);
    logDecision(
      {
        ...request,
        id: "request-2"
      },
      {
        ...decision,
        requestId: "request-2"
      },
      auditLog
    );

    const events = auditLog.getAll();
    const tamperedEvents = [
      events[0],
      {
        ...events[1],
        previousEventHash: "broken-previous-hash"
      }
    ];

    const result = verifyAuditChain(tamperedEvents);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("previous hash");
    expect(result.brokenAtSequenceNumber).toBe(2);
  });
});
