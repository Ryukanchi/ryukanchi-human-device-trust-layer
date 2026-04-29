import { describe, expect, it } from "vitest";
import { AuditLog } from "../packages/audit-log/src/index.js";
import { ComposedRiskEngine } from "../packages/composed-risk/src/index.js";
import type { AuditEvent, RiskLevel } from "../packages/core-types/src/index.js";

function event(id: string, riskLevel: RiskLevel): AuditEvent {
  return {
    id,
    eventType: "policy_decision_recorded",
    timestamp: `2026-01-01T00:00:0${id.at(-1) ?? "0"}.000Z`,
    appId: "app-test",
    deviceId: "device-test",
    capabilityId: `cap-${id}`,
    capabilityName: "Test capability",
    decision: riskLevel === "critical" ? "deny" : "allow",
    riskLevel,
    reason: "Test audit event.",
    requiresApproval: riskLevel === "critical",
    audit: true,
    sandboxed: false,
    humanReadableSummary: "Test audit event.",
    simulationOnly: true
  };
}

function evaluate(events: AuditEvent[]) {
  const auditLog = new AuditLog();

  for (const auditEvent of events) {
    auditLog.record(auditEvent);
  }

  return new ComposedRiskEngine(auditLog).evaluate();
}

describe("ComposedRiskEngine", () => {
  it("returns low for only low-risk history", () => {
    const result = evaluate([event("event-1", "low"), event("event-2", "low")]);

    expect(result.riskLevel).toBe("low");
    expect(result.reason).toContain("only low-risk events");
  });

  it("escalates multiple medium actions to high", () => {
    const result = evaluate([
      event("event-1", "medium"),
      event("event-2", "medium")
    ]);

    expect(result.riskLevel).toBe("high");
    expect(result.reason).toContain("multiple medium-risk events");
  });

  it("escalates medium and high combination to high", () => {
    const result = evaluate([
      event("event-1", "medium"),
      event("event-2", "high")
    ]);

    expect(result.riskLevel).toBe("high");
    expect(result.reason).toContain("medium and high risk events");
  });

  it("escalates multiple high actions to critical", () => {
    const result = evaluate([event("event-1", "high"), event("event-2", "high")]);

    expect(result.riskLevel).toBe("critical");
    expect(result.reason).toContain("multiple high-risk events");
  });

  it("returns critical when critical is present", () => {
    const result = evaluate([
      event("event-1", "low"),
      event("event-2", "critical")
    ]);

    expect(result.riskLevel).toBe("critical");
    expect(result.reason).toContain("critical event is present");
  });
});

