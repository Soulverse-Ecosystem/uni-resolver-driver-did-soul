# Archived

These describe the earlier did:soul design: UUID identifiers, KMS held keys, Pinata, and in
places a KERI key event log. None of that is what the method is now.

The method is `did:soul:{scid}`, a profile of did:webvh v1.0, with client held keys and a
self-verifying hash-chained log. The identifier has no domain and no path.

Two claims in here are actively wrong and must not be carried into a method specification:

- Identifiers are not UUIDs.
- Records are not independently auditable on the public IPFS network. The archive is a
  mirror off the resolution path, and it currently sits on a private swarm.

Rewrite from the current implementation before submitting anything to DIF or the DID spec
registries.
