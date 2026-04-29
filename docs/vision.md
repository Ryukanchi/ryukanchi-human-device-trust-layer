# Vision

SomaGuard is a defensive research concept for a Human Device Trust Layer around simulated body-adjacent devices.

The project looks ahead to a future where wearable systems, AR interfaces, prosthetic simulators, exoskeleton simulators, biosensors, and cyberware concepts may become more common. These systems may interact with sensitive parts of human life: movement, perception, identity, personal data, and daily routines.

The project does not assume those systems should be trusted by default.

## Future Problem Space

Body-adjacent devices may create new trust problems because they operate close to the person. A confusing notification, unsafe command, unclear permission, or hidden automation may carry more weight when the system is near the body or connected to sensitive personal signals.

Future systems may also involve many actors:

- The human
- Device makers
- Apps
- Cloud services
- Local agents
- Update systems
- Policy engines
- Safety monitors

Without a clear trust layer, authority can become hard to see. A person may not know which system requested an action, why it was allowed, how long permission lasts, or how to stop it.

## Human Control vs System Control

The central concern is the balance between human control and system control.

Systems can assist, recommend, filter, or automate. But for body-adjacent capabilities, the human must remain the primary authority. The architecture should make it possible for the human to understand, approve, deny, pause, revoke, and audit important actions.

A trust layer should not treat consent as a vague one-time acceptance. Consent should be specific, understandable, and reversible.

## Why A Trust Layer Is Needed

A Human Device Trust Layer creates a boundary between requesters and simulated device capabilities. It can define how permission requests are evaluated, how safety modes affect decisions, how emergency locks stop activity, and how audit logs explain what happened.

The trust layer is needed because sensitive systems require more than connectivity. They require accountability.

For SomaGuard, this remains a simulation-only research architecture. The goal is to reason clearly about safety and control before any implementation exists.

