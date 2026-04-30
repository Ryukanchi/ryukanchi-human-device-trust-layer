import { describe, expect, it } from "vitest";
import {
  createConsentGrant,
  evaluateConsent,
  expireConsentGrant,
  findMatchingConsentGrant,
  isConsentExpired,
  revokeConsentGrant,
  type ConsentEvaluationInput,
  type ConsentGrant
} from "../packages/consent-engine/src/index.js";

const subjectId = "simulated-human";
const appId = "app-rehabassist";
const now = "2026-04-30T12:00:00.000Z";
const grantedAt = "2026-04-30T09:00:00.000Z";
const futureExpiry = "2026-05-01T00:00:00.000Z";

function grant(input: Partial<Parameters<typeof createConsentGrant>[0]> = {}) {
  return createConsentGrant({
    subjectId,
    appId,
    capabilityId: "read_heart_rate",
    purpose: "wellness_summary",
    grantedAt,
    expiresAt: futureExpiry,
    ...input
  });
}

function input(overrides: Partial<ConsentEvaluationInput> = {}): ConsentEvaluationInput {
  return {
    subjectId,
    appId,
    capabilityId: "read_heart_rate",
    purpose: "wellness_summary",
    now,
    grants: [grant()],
    ...overrides
  };
}

describe("Consent Engine", () => {
  it("validates consent for read_heart_rate with wellness_summary", () => {
    const result = evaluateConsent(input());

    expect(result.decision).toBe("valid");
    expect(result.valid).toBe(true);
    expect(result.requiresConsent).toBe(true);
  });

  it("denies read_heart_rate when consent is missing", () => {
    const result = evaluateConsent(input({ grants: [] }));

    expect(result.decision).toBe("missing");
    expect(result.valid).toBe(false);
  });

  it("treats revoked consent as invalid", () => {
    const revokedGrant = revokeConsentGrant(grant(), "2026-04-30T10:00:00.000Z");
    const result = evaluateConsent(input({ grants: [revokedGrant] }));

    expect(result.decision).toBe("revoked");
    expect(result.valid).toBe(false);
    expect(result.matchingGrantId).toBe(revokedGrant.id);
  });

  it("treats expired consent status as invalid", () => {
    const expiredGrant = expireConsentGrant(grant());
    const result = evaluateConsent(input({ grants: [expiredGrant] }));

    expect(result.decision).toBe("expired");
    expect(result.valid).toBe(false);
  });

  it("treats consent as expired when expiresAt is before now", () => {
    const expiredGrant = grant({ expiresAt: "2026-04-30T08:00:00.000Z" });
    const result = evaluateConsent(input({ grants: [expiredGrant] }));

    expect(result.decision).toBe("expired");
    expect(isConsentExpired(expiredGrant, now)).toBe(true);
  });

  it("rejects purpose mismatch", () => {
    const result = evaluateConsent(
      input({
        purpose: "safety_monitoring"
      })
    );

    expect(result.decision).toBe("purpose_mismatch");
    expect(result.valid).toBe(false);
  });

  it("does not use consent for one capability to authorize another capability", () => {
    const result = evaluateConsent(
      input({
        capabilityId: "read_sleep_summary"
      })
    );

    expect(result.decision).toBe("missing");
    expect(result.valid).toBe(false);
  });

  it("does not use consent for one app to authorize another app", () => {
    const result = evaluateConsent(
      input({
        appId: "app-other"
      })
    );

    expect(result.decision).toBe("missing");
    expect(result.valid).toBe(false);
  });

  it("does not use consent for one subject to authorize another subject", () => {
    const result = evaluateConsent(
      input({
        subjectId: "other-simulated-human"
      })
    );

    expect(result.decision).toBe("missing");
    expect(result.valid).toBe(false);
  });

  it("read_battery does not require consent and evaluates valid", () => {
    const result = evaluateConsent(
      input({
        capabilityId: "read_battery",
        purpose: "device_maintenance",
        grants: []
      })
    );

    expect(result.decision).toBe("capability_does_not_require_consent");
    expect(result.valid).toBe(true);
    expect(result.requiresConsent).toBe(false);
  });

  it("unknown capability fails closed and requires consent", () => {
    const result = evaluateConsent(
      input({
        capabilityId: "unknown_capability",
        grants: []
      })
    );

    expect(result.decision).toBe("unknown_capability");
    expect(result.valid).toBe(false);
    expect(result.requiresConsent).toBe(true);
  });

  it("advertising purpose is not valid for read_heart_rate", () => {
    const result = evaluateConsent(
      input({
        purpose: "advertising"
      })
    );

    expect(result.decision).toBe("purpose_mismatch");
    expect(result.valid).toBe(false);
  });

  it("createConsentGrant creates deterministic IDs", () => {
    const first = grant();
    const second = grant();

    expect(first.id).toBe(second.id);
    expect(first.id).toBe(
      "consent:simulated-human:app-rehabassist:read_heart_rate:wellness_summary:2026-04-30T09:00:00.000Z"
    );
  });

  it("revokeConsentGrant does not mutate original grant", () => {
    const original = grant();
    const revoked = revokeConsentGrant(original, "2026-04-30T10:00:00.000Z");

    expect(original.status).toBe("active");
    expect(original.revokedAt).toBeNull();
    expect(revoked.status).toBe("revoked");
    expect(revoked.revokedAt).toBe("2026-04-30T10:00:00.000Z");
  });

  it("expireConsentGrant does not mutate original grant", () => {
    const original = grant();
    const expired = expireConsentGrant(original);

    expect(original.status).toBe("active");
    expect(expired.status).toBe("expired");
  });

  it("findMatchingConsentGrant returns the correct grant", () => {
    const expectedGrant = grant();
    const unrelatedGrant = grant({
      capabilityId: "read_sleep_summary"
    });
    const result = findMatchingConsentGrant(
      input({
        grants: [unrelatedGrant, expectedGrant]
      })
    );

    expect(result).toEqual(expectedGrant);
  });

  it("includes matching grant ID in valid result", () => {
    const expectedGrant = grant();
    const result = evaluateConsent(input({ grants: [expectedGrant] }));

    expect(result.decision).toBe("valid");
    expect(result.matchingGrantId).toBe(expectedGrant.id);
  });

  it("returns humanReadableSummary for every result", () => {
    const cases = [
      evaluateConsent(input()),
      evaluateConsent(input({ grants: [] })),
      evaluateConsent(input({ capabilityId: "unknown_capability", grants: [] })),
      evaluateConsent(
        input({
          capabilityId: "read_battery",
          purpose: "device_maintenance",
          grants: []
        })
      )
    ];

    for (const result of cases) {
      expect(result.humanReadableSummary).toEqual(expect.any(String));
      expect(result.humanReadableSummary.length).toBeGreaterThan(0);
    }
  });

  it("requiresConsent is true for sensitive capabilities", () => {
    const result = evaluateConsent(
      input({
        capabilityId: "read_stress_signal",
        purpose: "wellness_summary",
        grants: []
      })
    );

    expect(result.requiresConsent).toBe(true);
    expect(result.valid).toBe(false);
  });

  it("capability_does_not_require_consent result has requiresConsent false", () => {
    const result = evaluateConsent(
      input({
        capabilityId: "read_device_diagnostics",
        purpose: "device_maintenance",
        grants: []
      })
    );

    expect(result.decision).toBe("capability_does_not_require_consent");
    expect(result.requiresConsent).toBe(false);
  });

  it("revocation overrides an otherwise matching active consent shape", () => {
    const revoked: ConsentGrant = revokeConsentGrant(
      grant(),
      "2026-04-30T10:00:00.000Z"
    );

    expect(evaluateConsent(input({ grants: [revoked] }))).toMatchObject({
      decision: "revoked",
      valid: false
    });
  });
});
