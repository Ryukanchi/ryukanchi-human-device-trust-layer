import type { ConsentPurpose } from "../../core-types/src/index.js";
import {
  getCapabilityById,
  isPurposeAllowed,
  requiresConsent as capabilityRequiresConsent
} from "../../capability-registry/src/index.js";

export type ConsentStatus = "active" | "expired" | "revoked";

export type ConsentDecision =
  | "valid"
  | "missing"
  | "expired"
  | "revoked"
  | "purpose_mismatch"
  | "unknown_capability"
  | "capability_does_not_require_consent";

export interface ConsentGrant {
  id: string;
  subjectId: string;
  appId: string;
  capabilityId: string;
  purpose: ConsentPurpose;
  status: ConsentStatus;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  humanReadableSummary: string;
}

export interface CreateConsentGrantInput {
  subjectId: string;
  appId: string;
  capabilityId: string;
  purpose: ConsentPurpose;
  grantedAt: string;
  expiresAt?: string | null;
}

export interface ConsentEvaluationInput {
  subjectId: string;
  appId: string;
  capabilityId: string;
  purpose: ConsentPurpose;
  now: string;
  grants: ConsentGrant[];
}

export interface ConsentEvaluationResult {
  decision: ConsentDecision;
  valid: boolean;
  reason: string;
  requiresConsent: boolean;
  matchingGrantId: string | null;
  capabilityId: string;
  purpose: ConsentPurpose;
  humanReadableSummary: string;
}

function buildConsentGrantId(input: CreateConsentGrantInput): string {
  return [
    "consent",
    input.subjectId,
    input.appId,
    input.capabilityId,
    input.purpose,
    input.grantedAt
  ].join(":");
}

function summarizeGrant(input: CreateConsentGrantInput): string {
  return `Simulated consent grant for ${input.subjectId} allowing ${input.appId} to use ${input.capabilityId} for ${input.purpose}.`;
}

function result(input: {
  decision: ConsentDecision;
  valid: boolean;
  reason: string;
  requiresConsent: boolean;
  matchingGrantId: string | null;
  capabilityId: string;
  purpose: ConsentPurpose;
}): ConsentEvaluationResult {
  return {
    ...input,
    humanReadableSummary: `${input.decision}: ${input.reason}`
  };
}

export function createConsentGrant(
  input: CreateConsentGrantInput
): ConsentGrant {
  return {
    id: buildConsentGrantId(input),
    subjectId: input.subjectId,
    appId: input.appId,
    capabilityId: input.capabilityId,
    purpose: input.purpose,
    status: "active",
    grantedAt: input.grantedAt,
    expiresAt: input.expiresAt ?? null,
    revokedAt: null,
    humanReadableSummary: summarizeGrant(input)
  };
}

export function revokeConsentGrant(
  grant: ConsentGrant,
  revokedAt: string
): ConsentGrant {
  return {
    ...grant,
    status: "revoked",
    revokedAt,
    humanReadableSummary: `${grant.humanReadableSummary} Revoked at ${revokedAt}.`
  };
}

export function expireConsentGrant(grant: ConsentGrant): ConsentGrant {
  return {
    ...grant,
    status: "expired",
    humanReadableSummary: `${grant.humanReadableSummary} Marked expired.`
  };
}

export function isConsentExpired(grant: ConsentGrant, now: string): boolean {
  return (
    grant.status === "expired" ||
    (grant.expiresAt !== null && grant.expiresAt < now)
  );
}

export function findMatchingConsentGrant(
  input: ConsentEvaluationInput
): ConsentGrant | undefined {
  return input.grants.find(
    (grant) =>
      grant.subjectId === input.subjectId &&
      grant.appId === input.appId &&
      grant.capabilityId === input.capabilityId &&
      grant.purpose === input.purpose
  );
}

function findGrantForDifferentPurpose(
  input: ConsentEvaluationInput
): ConsentGrant | undefined {
  return input.grants.find(
    (grant) =>
      grant.subjectId === input.subjectId &&
      grant.appId === input.appId &&
      grant.capabilityId === input.capabilityId &&
      grant.purpose !== input.purpose
  );
}

export function evaluateConsent(
  input: ConsentEvaluationInput
): ConsentEvaluationResult {
  const capability = getCapabilityById(input.capabilityId);

  if (capability === undefined) {
    return result({
      decision: "unknown_capability",
      valid: false,
      requiresConsent: true,
      matchingGrantId: null,
      capabilityId: input.capabilityId,
      purpose: input.purpose,
      reason:
        "Capability is not registered, so consent evaluation fails closed."
    });
  }

  const requiresConsent = capabilityRequiresConsent(input.capabilityId);

  if (!requiresConsent) {
    return result({
      decision: "capability_does_not_require_consent",
      valid: true,
      requiresConsent: false,
      matchingGrantId: null,
      capabilityId: input.capabilityId,
      purpose: input.purpose,
      reason: `${input.capabilityId} does not require consent in the simulation registry.`
    });
  }

  if (!isPurposeAllowed(input.capabilityId, input.purpose)) {
    return result({
      decision: "purpose_mismatch",
      valid: false,
      requiresConsent: true,
      matchingGrantId: null,
      capabilityId: input.capabilityId,
      purpose: input.purpose,
      reason: `${input.purpose} is not an allowed purpose for ${input.capabilityId}.`
    });
  }

  const matchingGrant = findMatchingConsentGrant(input);

  if (matchingGrant !== undefined) {
    if (matchingGrant.status === "revoked") {
      return result({
        decision: "revoked",
        valid: false,
        requiresConsent: true,
        matchingGrantId: matchingGrant.id,
        capabilityId: input.capabilityId,
        purpose: input.purpose,
        reason: "Matching simulated consent grant has been revoked."
      });
    }

    if (isConsentExpired(matchingGrant, input.now)) {
      return result({
        decision: "expired",
        valid: false,
        requiresConsent: true,
        matchingGrantId: matchingGrant.id,
        capabilityId: input.capabilityId,
        purpose: input.purpose,
        reason: "Matching simulated consent grant is expired."
      });
    }

    return result({
      decision: "valid",
      valid: true,
      requiresConsent: true,
      matchingGrantId: matchingGrant.id,
      capabilityId: input.capabilityId,
      purpose: input.purpose,
      reason: "Matching active simulated consent grant is valid for this capability and purpose."
    });
  }

  const differentPurposeGrant = findGrantForDifferentPurpose(input);

  if (differentPurposeGrant !== undefined) {
    return result({
      decision: "purpose_mismatch",
      valid: false,
      requiresConsent: true,
      matchingGrantId: differentPurposeGrant.id,
      capabilityId: input.capabilityId,
      purpose: input.purpose,
      reason: `A grant exists for ${input.capabilityId}, but not for requested purpose ${input.purpose}.`
    });
  }

  return result({
    decision: "missing",
    valid: false,
    requiresConsent: true,
    matchingGrantId: null,
    capabilityId: input.capabilityId,
    purpose: input.purpose,
    reason: `No matching active simulated consent grant exists for ${input.capabilityId} and purpose ${input.purpose}.`
  });
}

