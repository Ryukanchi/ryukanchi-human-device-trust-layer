import type {
  AccessType,
  BodyImpact,
  ConsentPurpose,
  DataSensitivity,
  DeviceType,
  RetentionHint,
  RiskLevel
} from "../../core-types/src/index.js";

export interface RegisteredCapability {
  id: string;
  displayName: string;
  description: string;
  accessType: AccessType;
  riskLevel: RiskLevel;
  dataSensitivity: DataSensitivity;
  bodyImpact: BodyImpact;
  requiresConsent: boolean;
  allowedPurposes: ConsentPurpose[];
  retentionHint: RetentionHint;
  sourceDeviceTypes: DeviceType[];
}

export interface CapabilityRegistryValidationResult {
  valid: boolean;
  errors: string[];
}

export const pulseBandDeviceType: DeviceType = "wearable_health_sensor";

const pulseBandCapabilities: RegisteredCapability[] = [
  {
    id: "read_heart_rate",
    displayName: "Read heart rate",
    description:
      "Reads a synthetic heart-rate-like signal from PulseBand Sim for local simulation only.",
    accessType: "read",
    riskLevel: "high",
    dataSensitivity: "highly_sensitive",
    bodyImpact: "informational",
    requiresConsent: true,
    allowedPurposes: [
      "user_view",
      "wellness_summary",
      "rehab_tracking",
      "safety_monitoring",
      "research_simulation"
    ],
    retentionHint: "not_recommended",
    sourceDeviceTypes: [pulseBandDeviceType]
  },
  {
    id: "read_motion",
    displayName: "Read motion",
    description:
      "Reads synthetic movement context from PulseBand Sim for local simulation only.",
    accessType: "read",
    riskLevel: "medium",
    dataSensitivity: "moderate",
    bodyImpact: "informational",
    requiresConsent: true,
    allowedPurposes: [
      "user_view",
      "wellness_summary",
      "rehab_tracking",
      "safety_monitoring",
      "research_simulation"
    ],
    retentionHint: "session",
    sourceDeviceTypes: [pulseBandDeviceType]
  },
  {
    id: "read_temperature",
    displayName: "Read temperature",
    description:
      "Reads a synthetic temperature-like signal from PulseBand Sim without medical interpretation.",
    accessType: "read",
    riskLevel: "medium",
    dataSensitivity: "highly_sensitive",
    bodyImpact: "informational",
    requiresConsent: true,
    allowedPurposes: [
      "user_view",
      "wellness_summary",
      "rehab_tracking",
      "safety_monitoring"
    ],
    retentionHint: "not_recommended",
    sourceDeviceTypes: [pulseBandDeviceType]
  },
  {
    id: "read_battery",
    displayName: "Read battery",
    description:
      "Reads synthetic PulseBand Sim battery state for local device maintenance simulation.",
    accessType: "read",
    riskLevel: "low",
    dataSensitivity: "low",
    bodyImpact: "none",
    requiresConsent: false,
    allowedPurposes: ["device_maintenance"],
    retentionHint: "ephemeral",
    sourceDeviceTypes: [pulseBandDeviceType]
  },
  {
    id: "read_sleep_summary",
    displayName: "Read sleep summary",
    description:
      "Reads a synthetic sleep-summary-like signal from PulseBand Sim for simulation only.",
    accessType: "read",
    riskLevel: "high",
    dataSensitivity: "highly_sensitive",
    bodyImpact: "informational",
    requiresConsent: true,
    allowedPurposes: [
      "user_view",
      "wellness_summary",
      "rehab_tracking",
      "research_simulation"
    ],
    retentionHint: "not_recommended",
    sourceDeviceTypes: [pulseBandDeviceType]
  },
  {
    id: "read_location_context",
    displayName: "Read location context",
    description:
      "Reads synthetic coarse location context associated with PulseBand Sim scenarios.",
    accessType: "read",
    riskLevel: "high",
    dataSensitivity: "highly_sensitive",
    bodyImpact: "informational",
    requiresConsent: true,
    allowedPurposes: ["safety_monitoring", "rehab_tracking"],
    retentionHint: "not_recommended",
    sourceDeviceTypes: [pulseBandDeviceType]
  },
  {
    id: "read_stress_signal",
    displayName: "Read stress signal",
    description:
      "Reads a synthetic stress-like signal for simulation only, without diagnosis or interpretation.",
    accessType: "read",
    riskLevel: "high",
    dataSensitivity: "highly_sensitive",
    bodyImpact: "informational",
    requiresConsent: true,
    allowedPurposes: [
      "user_view",
      "wellness_summary",
      "rehab_tracking",
      "safety_monitoring"
    ],
    retentionHint: "not_recommended",
    sourceDeviceTypes: [pulseBandDeviceType]
  },
  {
    id: "read_device_diagnostics",
    displayName: "Read device diagnostics",
    description:
      "Reads synthetic PulseBand Sim diagnostic status for local maintenance simulation.",
    accessType: "read",
    riskLevel: "low",
    dataSensitivity: "low",
    bodyImpact: "none",
    requiresConsent: false,
    allowedPurposes: ["device_maintenance"],
    retentionHint: "session",
    sourceDeviceTypes: [pulseBandDeviceType]
  }
];

export function listCapabilities(): RegisteredCapability[] {
  return pulseBandCapabilities.map((capability) => ({ ...capability }));
}

export function getCapabilityById(
  id: string
): RegisteredCapability | undefined {
  const capability = pulseBandCapabilities.find((entry) => entry.id === id);
  return capability === undefined ? undefined : { ...capability };
}

export function listCapabilitiesByDeviceType(
  deviceType: DeviceType
): RegisteredCapability[] {
  return pulseBandCapabilities
    .filter((capability) => capability.sourceDeviceTypes.includes(deviceType))
    .map((capability) => ({ ...capability }));
}

export function isKnownCapability(id: string): boolean {
  return getCapabilityById(id) !== undefined;
}

export function isPurposeAllowed(
  capabilityId: string,
  purpose: ConsentPurpose
): boolean {
  const capability = getCapabilityById(capabilityId);
  return capability?.allowedPurposes.includes(purpose) ?? false;
}

export function requiresConsent(capabilityId: string): boolean {
  return getCapabilityById(capabilityId)?.requiresConsent ?? true;
}

export function assertCapabilityExists(
  capabilityId: string
): RegisteredCapability {
  const capability = getCapabilityById(capabilityId);

  if (capability === undefined) {
    throw new Error(`Unknown registered capability: ${capabilityId}`);
  }

  return capability;
}

export function validateCapabilityRegistry(
  capabilities: RegisteredCapability[] = pulseBandCapabilities
): CapabilityRegistryValidationResult {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const capability of capabilities) {
    if (seenIds.has(capability.id)) {
      errors.push(`Duplicate capability id: ${capability.id}`);
    }
    seenIds.add(capability.id);

    if (capability.id.trim().length === 0) {
      errors.push("Capability is missing id.");
    }
    if (capability.displayName.trim().length === 0) {
      errors.push(`${capability.id} is missing displayName.`);
    }
    if (capability.description.trim().length === 0) {
      errors.push(`${capability.id} is missing description.`);
    }
    if (capability.accessType.trim().length === 0) {
      errors.push(`${capability.id} is missing accessType.`);
    }
    if (capability.riskLevel.trim().length === 0) {
      errors.push(`${capability.id} is missing riskLevel.`);
    }
    if (capability.allowedPurposes.length === 0) {
      errors.push(`${capability.id} must define at least one allowed purpose.`);
    }
    if (capability.sourceDeviceTypes.length === 0) {
      errors.push(`${capability.id} must define at least one source device type.`);
    }
    if (capability.retentionHint.trim().length === 0) {
      errors.push(`${capability.id} is missing retentionHint.`);
    }
    if (capability.dataSensitivity.trim().length === 0) {
      errors.push(`${capability.id} is missing dataSensitivity.`);
    }
    if (capability.bodyImpact.trim().length === 0) {
      errors.push(`${capability.id} is missing bodyImpact.`);
    }
    if (
      (capability.dataSensitivity === "sensitive" ||
        capability.dataSensitivity === "highly_sensitive") &&
      !capability.requiresConsent
    ) {
      errors.push(
        `${capability.id} is ${capability.dataSensitivity} and must require consent.`
      );
    }
    if (
      capability.dataSensitivity === "highly_sensitive" &&
      capability.allowedPurposes.includes("advertising")
    ) {
      errors.push(
        `${capability.id} is highly_sensitive and must not allow advertising.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

