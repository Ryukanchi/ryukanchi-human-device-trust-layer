# SomaGuard Threat Model

## 1. Scope

SomaGuard is a simulation-first defensive reference architecture for evaluating access to body-adjacent device capabilities. It models how a trust layer could reason about simulated wearable-health-sensor-like capabilities such as heart rate, motion, temperature, sleep summaries, location context, stress signals, and device diagnostics.

It is intended as a reference architecture for reasoning about access control, not as a production security system.

SomaGuard is not connected to real hardware. It is not a medical system, treatment system, emergency response system, implant controller, malware analysis platform, or offensive security tool. Its purpose is to model defensive decision-making patterns before any real-world integration exists.

The current architecture evaluates requests through a layered pipeline:

```text
Request
-> Self-Trust
-> Capability Registry
-> Consent Engine
-> Policy Engine
-> Risk / Sandbox
-> Final Decision
-> Audit Log
```

The threat model focuses on security and privacy risks in that decision flow.

## 2. Assets

SomaGuard is designed to protect the following assets:

- Body-adjacent data: simulated signals that represent sensitive or highly sensitive wearable data, even when no real biometric data is present.
- Consent integrity: the correctness, scope, status, purpose, expiry, and revocation state of simulated consent grants.
- Decision correctness: the ability to produce consistent, deterministic allow, deny, sandbox, or approval-required outcomes.
- System integrity: confidence that expected trust-layer components are present and operating in a trusted state.
- Capability integrity: the accuracy of registered capability metadata, including risk level, data sensitivity, allowed purposes, retention hints, and consent requirements.
- Audit logs: records of decisions and events that must remain readable, ordered, and tamper-evident in the simulation.
- Human control: the principle that sensitive or risky interactions should not proceed without modeled human authorization.

## 3. Trust Boundaries

SomaGuard treats external apps as outside the trusted core. Apps may be trusted, semi-trusted, or untrusted, but their requests are still evaluated through the same layered controls.

Key trust boundaries include:

- External app to request boundary: an app submits a permission request for a simulated capability. SomaGuard does not assume the request is safe because the app declares a purpose or trust level.
- Request to Capability Registry boundary: the requested capability ID is checked against a known registry. Unknown capabilities fail closed.
- Request to Consent Engine boundary: consent is evaluated by subject, app, capability, purpose, status, and expiry. Consent for one purpose or app does not authorize another.
- Consent and self-trust to Policy Engine boundary: policy decisions rely on trusted context, including whether the capability is known, whether consent is valid when required, and whether the system is trusted.
- Policy to Sandbox and Risk boundary: allowed policy decisions may still be sandboxed or escalated due to risk composition or suspicious audit history.
- Decision to Audit Log boundary: decisions are recorded in an append-oriented, tamper-evident audit chain for review and accountability.

The core assumption is that no single component should be enough to fully authorize a sensitive request.

## 4. Threat Scenarios

### Unauthorized Data Access

Description: An app attempts to access a simulated body-adjacent capability without appropriate authorization.

Mitigation: SomaGuard checks whether the capability is registered, whether it requires consent, whether matching consent exists, and whether policy permits the request. Missing consent for sensitive capabilities results in approval required rather than full access.

### Purpose Misuse

Description: An app attempts to use a capability for a purpose outside the granted or allowed purpose, such as using a wellness signal for advertising.

Mitigation: The Consent Engine enforces strict purpose binding. The Capability Registry defines allowed purposes per capability, and sensitive capabilities do not allow advertising in the current registry. Purpose mismatch fails closed.

### Consent Replay or Expired Consent

Description: An app attempts to reuse an old, revoked, expired, or mismatched consent grant.

Mitigation: Consent evaluation checks subject ID, app ID, capability ID, purpose, status, and expiry time. Revoked and expired grants are invalid, and a grant for one app, subject, capability, or purpose does not authorize another.

### System Compromise

Description: The trust layer itself may be missing expected components or may fail an integrity check.

Mitigation: The Self-Trust Engine evaluates expected components and integrity status. A compromised system denies requests before normal flow continues. A degraded system restricts non-low-risk requests rather than treating unknown trust state as trusted.

### Capability Spoofing

Description: An app requests an unregistered or misleading capability ID to bypass consent or policy controls.

Mitigation: The Capability Registry is the authoritative source for known capabilities. Unknown capability IDs fail closed in consent evaluation and are denied by the orchestrated decision flow.

### Over-Permissive Access

Description: A policy rule allows too much access because it trusts an app, consent grant, or low-risk classification too broadly.

Mitigation: SomaGuard layers controls instead of relying on a single allow condition. Consent is necessary but not sufficient. The Policy Engine, Self-Trust, Guardian, Composed Risk Engine, and Sandbox can still deny, sandbox, or escalate a request.

### Audit Tampering

Description: A party modifies, removes, or reorders audit events to hide unsafe or denied behavior.

Mitigation: The Audit Log models tamper-evident chaining with sequence numbers, previous event hashes, event hashes, and chain verification. This is in-memory and simulation-only, but it establishes the principle that security-relevant history should be verifiable.

## 5. Security Principles

- Fail closed: unknown capabilities, missing consent, expired consent, revoked consent, purpose mismatch, compromised self-trust, and unmatched policy conditions do not become implicit approval.
- Least privilege: requests are evaluated for a specific app, capability, purpose, and consent scope rather than broad access.
- Defense in depth: Self-Trust, Capability Registry, Consent Engine, Policy Engine, Guardian, Composed Risk Engine, Sandbox, and Audit Log each address different failure modes.
- Human-in-control: sensitive or risky interactions require explicit modeled consent or approval rather than assuming app intent is sufficient.
- Auditability: decisions should be explainable to humans and represented in structured events that can be reviewed and verified.
- Determinism: simulation decisions should be repeatable for the same inputs so tests and reviews can reason about behavior.

## 6. Out of Scope

SomaGuard does not provide:

- Real hardware control.
- Real medical device support.
- Diagnosis, treatment advice, clinical monitoring, or emergency alerting.
- Real user data collection or real biometric processing.
- Real HealthKit or Google Health Connect integration.
- Kernel, driver, firmware, network, or exploit behavior.
- Malware simulation or offensive control logic.
- Persistence, cloud sync, or production identity management.
- Real actuator, prosthetic, exosuit, implant, or body-control behavior.

## 7. Summary

SomaGuard is designed to be safe by construction due to its local, deterministic, and simulation-only nature. Its layered decision flow requires a request to pass through system trust checks, capability registration, consent validation, policy evaluation, risk analysis, sandbox handling, and audit logging.

No single signal is treated as sufficient authorization for sensitive simulated body-adjacent capabilities. Known capability metadata defines the request surface, consent binds access to purpose and status, policy applies defensive allow and deny rules, risk layers can contain or escalate behavior, and audit records preserve decision history for review.

This threat model should evolve as SomaGuard adds new simulated device anchors, consent behaviors, policy rules, and review workflows.
