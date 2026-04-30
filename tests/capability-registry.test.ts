import { describe, expect, it } from "vitest";
import {
  assertCapabilityExists,
  getCapabilityById,
  isKnownCapability,
  isPurposeAllowed,
  listCapabilities,
  listCapabilitiesByDeviceType,
  requiresConsent,
  validateCapabilityRegistry
} from "../packages/capability-registry/src/index.js";

const expectedPulseBandCapabilityIds = [
  "read_heart_rate",
  "read_motion",
  "read_temperature",
  "read_battery",
  "read_sleep_summary",
  "read_location_context",
  "read_stress_signal",
  "read_device_diagnostics"
];

describe("capability registry", () => {
  it("contains all PulseBand v1 capabilities", () => {
    const ids = listCapabilities().map((capability) => capability.id);

    expect(ids).toEqual(expectedPulseBandCapabilityIds);
  });

  it("has unique capability IDs", () => {
    const ids = listCapabilities().map((capability) => capability.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every capability has required metadata", () => {
    for (const capability of listCapabilities()) {
      expect(capability.id).toEqual(expect.any(String));
      expect(capability.displayName).toEqual(expect.any(String));
      expect(capability.description).toEqual(expect.any(String));
      expect(capability.accessType).toBe("read");
      expect(capability.riskLevel).toEqual(expect.any(String));
      expect(capability.dataSensitivity).toEqual(expect.any(String));
      expect(capability.bodyImpact).toEqual(expect.any(String));
      expect(typeof capability.requiresConsent).toBe("boolean");
      expect(capability.allowedPurposes.length).toBeGreaterThan(0);
      expect(capability.retentionHint).toEqual(expect.any(String));
      expect(capability.sourceDeviceTypes.length).toBeGreaterThan(0);
    }
  });

  it("validateCapabilityRegistry returns valid for the built-in registry", () => {
    expect(validateCapabilityRegistry()).toEqual({
      valid: true,
      errors: []
    });
  });

  it("heart rate requires consent", () => {
    expect(requiresConsent("read_heart_rate")).toBe(true);
  });

  it("battery is low risk", () => {
    expect(getCapabilityById("read_battery")?.riskLevel).toBe("low");
  });

  it("battery does not require consent", () => {
    expect(requiresConsent("read_battery")).toBe(false);
  });

  it("advertising is not allowed for heart rate", () => {
    expect(isPurposeAllowed("read_heart_rate", "advertising")).toBe(false);
  });

  it("advertising is not allowed for sleep summary", () => {
    expect(isPurposeAllowed("read_sleep_summary", "advertising")).toBe(false);
  });

  it("advertising is not allowed for location context", () => {
    expect(isPurposeAllowed("read_location_context", "advertising")).toBe(false);
  });

  it("location context is high risk", () => {
    expect(getCapabilityById("read_location_context")?.riskLevel).toBe("high");
  });

  it("stress signal is highly sensitive", () => {
    expect(getCapabilityById("read_stress_signal")?.dataSensitivity).toBe(
      "highly_sensitive"
    );
  });

  it("listCapabilitiesByDeviceType returns PulseBand capabilities", () => {
    const ids = listCapabilitiesByDeviceType("wearable_health_sensor").map(
      (capability) => capability.id
    );

    expect(ids).toEqual(expectedPulseBandCapabilityIds);
  });

  it("getCapabilityById returns the expected capability", () => {
    expect(getCapabilityById("read_heart_rate")).toMatchObject({
      id: "read_heart_rate",
      displayName: "Read heart rate",
      sourceDeviceTypes: ["wearable_health_sensor"]
    });
  });

  it("getCapabilityById returns undefined for unknown capability", () => {
    expect(getCapabilityById("unknown_capability")).toBeUndefined();
  });

  it("isKnownCapability returns false for unknown capability", () => {
    expect(isKnownCapability("unknown_capability")).toBe(false);
  });

  it("requiresConsent returns true for unknown capability as fail-closed behavior", () => {
    expect(requiresConsent("unknown_capability")).toBe(true);
  });

  it("assertCapabilityExists throws for unknown capability", () => {
    expect(() => assertCapabilityExists("unknown_capability")).toThrow(
      "Unknown registered capability: unknown_capability"
    );
  });

  it("sensitive or highly sensitive capabilities require consent", () => {
    const sensitiveCapabilities = listCapabilities().filter(
      (capability) =>
        capability.dataSensitivity === "sensitive" ||
        capability.dataSensitivity === "highly_sensitive"
    );

    expect(sensitiveCapabilities.length).toBeGreaterThan(0);

    for (const capability of sensitiveCapabilities) {
      expect(capability.requiresConsent).toBe(true);
    }
  });

  it("highly sensitive capabilities do not allow advertising", () => {
    const highlySensitiveCapabilities = listCapabilities().filter(
      (capability) => capability.dataSensitivity === "highly_sensitive"
    );

    expect(highlySensitiveCapabilities.length).toBeGreaterThan(0);

    for (const capability of highlySensitiveCapabilities) {
      expect(capability.allowedPurposes).not.toContain("advertising");
    }
  });
});

