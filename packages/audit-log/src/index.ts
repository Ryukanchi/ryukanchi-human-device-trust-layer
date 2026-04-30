import crypto from "node:crypto";
import type {
  AuditEvent,
  PermissionRequest,
  PolicyDecision
} from "../../core-types/src/index.js";

const baseTimestampMs = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
const auditSchemaVersion = "audit-chain-v1";

export interface AuditChainVerificationResult {
  valid: boolean;
  reason: string | null;
  brokenAtSequenceNumber?: number;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`);

  return `{${entries.join(",")}}`;
}

function eventWithoutHash(event: AuditEvent): Omit<AuditEvent, "eventHash"> {
  const { eventHash: _eventHash, ...withoutHash } = event;
  return withoutHash;
}

export function hashAuditEvent(event: Omit<AuditEvent, "eventHash">): string {
  return crypto
    .createHash("sha256")
    .update(stableJson(event))
    .digest("hex");
}

export class AuditLog {
  private events: AuditEvent[] = [];

  record(event: AuditEvent): AuditEvent {
    const previousEvent = this.events.at(-1);
    const chainedEvent: AuditEvent = {
      ...event,
      sequenceNumber: this.events.length + 1,
      previousEventHash: previousEvent?.eventHash ?? null,
      schemaVersion: auditSchemaVersion
    };
    const eventHash = hashAuditEvent(eventWithoutHash(chainedEvent));
    const recordedEvent = {
      ...chainedEvent,
      eventHash
    };

    this.events.push(recordedEvent);
    return { ...recordedEvent };
  }

  getAll(): AuditEvent[] {
    return this.events.map((event) => ({ ...event }));
  }

  clear(): void {
    this.resetForTestOnly();
  }

  // Test/demo lifecycle only. A production audit log should be append-only.
  resetForTestOnly(): void {
    this.events = [];
  }
}

export function createAuditEvent(
  request: PermissionRequest,
  decision: PolicyDecision,
  sequence = 0
): AuditEvent {
  const timestamp = new Date(baseTimestampMs + sequence * 1000).toISOString();

  return {
    id: `audit-${request.id}-${sequence}`,
    eventType: "policy_decision_recorded",
    timestamp,
    appId: request.appId,
    deviceId: request.deviceId,
    capabilityId: request.capabilityId,
    capabilityName: request.capability.name,
    decision: decision.decision,
    riskLevel: decision.riskLevel,
    reason: decision.reason,
    requiresApproval: decision.requiresApproval,
    audit: decision.audit,
    sandboxed: false,
    humanReadableSummary: `${decision.decision.toUpperCase()} ${request.app.name} -> ${request.device.name}/${request.capability.name}: ${decision.reason}`,
    simulationOnly: true
  };
}

export function logDecision(
  request: PermissionRequest,
  decision: PolicyDecision,
  auditLog: AuditLog
): AuditEvent {
  const event = createAuditEvent(request, decision, auditLog.getAll().length);
  return auditLog.record(event);
}

export function verifyAuditChain(
  events: AuditEvent[]
): AuditChainVerificationResult {
  let previousEventHash: string | null = null;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const expectedSequenceNumber = index + 1;
    const brokenAtSequenceNumber =
      event?.sequenceNumber ?? expectedSequenceNumber;

    if (event === undefined) {
      return {
        valid: false,
        reason: "Audit chain contains an undefined event.",
        brokenAtSequenceNumber: expectedSequenceNumber
      };
    }

    if (event.sequenceNumber !== expectedSequenceNumber) {
      return {
        valid: false,
        reason: `Expected sequence number ${expectedSequenceNumber}, received ${String(event.sequenceNumber)}.`,
        brokenAtSequenceNumber
      };
    }

    if (event.schemaVersion !== auditSchemaVersion) {
      return {
        valid: false,
        reason: "Audit event schema version is missing or unsupported.",
        brokenAtSequenceNumber
      };
    }

    if (index === 0 && event.previousEventHash !== null) {
      return {
        valid: false,
        reason: "First audit event must not reference a previous hash.",
        brokenAtSequenceNumber
      };
    }

    if (index > 0 && event.previousEventHash !== previousEventHash) {
      return {
        valid: false,
        reason: "Audit event previous hash does not match the prior event hash.",
        brokenAtSequenceNumber
      };
    }

    const expectedHash = hashAuditEvent(eventWithoutHash(event));

    if (event.eventHash !== expectedHash) {
      return {
        valid: false,
        reason: "Audit event hash does not match event content.",
        brokenAtSequenceNumber
      };
    }

    previousEventHash = event.eventHash;
  }

  return {
    valid: true,
    reason: null
  };
}
