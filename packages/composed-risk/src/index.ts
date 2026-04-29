import type { RiskLevel } from "../../core-types/src/index.js";
import type { AuditLog } from "../../audit-log/src/index.js";

export interface ComposedRiskResult {
  riskLevel: RiskLevel;
  reason: string;
}

export class ComposedRiskEngine {
  constructor(private readonly auditLog: AuditLog) {}

  evaluate(): ComposedRiskResult {
    const events = this.auditLog.getAll();
    const mediumCount = events.filter(
      (event) => event.riskLevel === "medium"
    ).length;
    const highCount = events.filter((event) => event.riskLevel === "high").length;
    const hasCritical = events.some((event) => event.riskLevel === "critical");

    if (hasCritical) {
      return {
        riskLevel: "critical",
        reason: "Composed risk is critical because at least one critical event is present."
      };
    }

    if (highCount >= 2) {
      return {
        riskLevel: "critical",
        reason: "Composed risk escalated to critical because multiple high-risk events are present."
      };
    }

    if (mediumCount >= 1 && highCount >= 1) {
      return {
        riskLevel: "high",
        reason: "Composed risk escalated to high because medium and high risk events are combined."
      };
    }

    if (mediumCount >= 2) {
      return {
        riskLevel: "high",
        reason: "Composed risk escalated to high because multiple medium-risk events are present."
      };
    }

    if (mediumCount === 1 || highCount === 1) {
      const riskLevel = highCount === 1 ? "high" : "medium";

      return {
        riskLevel,
        reason: `Composed risk remains ${riskLevel} because only one ${riskLevel}-risk event is present.`
      };
    }

    return {
      riskLevel: "low",
      reason: "Composed risk is low because only low-risk events are present."
    };
  }
}

