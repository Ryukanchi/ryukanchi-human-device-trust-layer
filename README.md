# ryukanchi-human-device-trust-layer

Codename: **SomaGuard**

`ryukanchi-human-device-trust-layer` is a documentation-only defensive research project for a simulation-first reference architecture around body-adjacent devices.

The project studies how a human-first trust layer could sit between people, software systems, and simulated future devices such as wearables, AR interfaces, prosthetic simulators, exoskeleton simulators, biosensors, and future cyberware concepts.

Core principle:

**Keep the human in control.**

## What This Project Is

SomaGuard is a defensive architecture concept. It explores how consent, permissions, safety modes, emergency locks, audit logs, quarantine states, and policy decisions could be described before any system is allowed near sensitive body-adjacent capabilities.

The project is simulation-only. Its purpose is to define language, boundaries, and research direction for safer systems, not to connect to real devices.

## What This Project Is Not

This project is not:

- Runtime software
- An API
- A user interface
- A package or dependency set
- A medical device project
- An implant project
- A hardware integration project
- A malware, exploit, or offensive security project
- A system for real body manipulation

It must not include real hardware interaction, medical device control, implant logic, malware behavior, exploit instructions, offensive control logic, or real body-affecting behavior.

## Why This Exists

Body-adjacent devices may become more capable, persistent, and personal. Future systems may sense context, display information near the body, assist movement in simulation, or mediate sensitive human workflows.

Those systems need trust models that start with the person. A human-first trust layer should make it clear who is requesting access, what capability is involved, what consent exists, what safety mode applies, and how the human can stop or deny the request.

SomaGuard exists to make those questions explicit before implementation begins.

## Defensive Positioning

This project is defensive by design. It focuses on reducing risk, improving visibility, preserving consent, and defining clear control boundaries.

The architecture should treat body-adjacent capability as sensitive, even when simulated. It should favor denial over ambiguity, human review over hidden automation, and clear audit records over silent decisions.

## MVP Direction

The MVP direction is simulation-first and documentation-first.

The first useful milestone is not software. It is a stable written model that explains:

- Device categories and simulated capabilities
- Permission and consent concepts
- Safety modes and emergency lock behavior
- Audit log expectations
- Quarantine conditions
- Policy engine responsibilities
- Example scenarios that remain non-medical and non-operational

No implementation should begin until the documentation clearly defines the safety boundaries and the simulated trust model.

## Current Status

This repository contains initial documentation only. There is no code, no package manifest, no dependencies, no API, and no UI.

## Documentation

- [Vision](docs/vision.md)
- [Ethics](docs/ethics.md)
- [Glossary](docs/glossary.md)
- [Roadmap](docs/roadmap.md)

