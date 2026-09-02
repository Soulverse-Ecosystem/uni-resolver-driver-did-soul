# did:soul: Security and Privacy Considerations

Accompanies `docs/scheme.md`. Describes what the method guarantees, what it does not, and the
gaps in the current deployment.

## 1. Trust model

The registry verifies and publishes entries. It holds no private key material and has no
operation that mints, alters, or recovers an identifier. Every entry arrives already signed by a
key the registry has never seen.

This bounds a registry compromise. An attacker who takes the registry can:

- refuse to publish, or refuse to serve, an identifier (availability)
- serve a stale but internally valid log (freshness)
- observe who publishes and who resolves (metadata)

They cannot:

- forge an entry, which requires a key the registry does not hold
- alter published history, because every entry commits to its predecessor's hash
- substitute a different document under the same identifier, because the SCID commits to the
  genesis entry

The last point is the method's core guarantee, and it holds against the operator as strongly as
against an outsider.

## 2. Verification independence

A verifier given a DID, its log, and a signature can reach a verdict with no network access. The
registry is therefore not in the trust path for authentication. A relying party that already
holds a subject's log does not consult the registry at all, and a registry outage does not
prevent authentication.

## 3. Attack surface

**Forged genesis.** Rejected: the SCID is recomputed from the submitted entry and compared to the
identifier.

**Tampered history.** Rejected: each entry's hash is computed over its predecessor's `versionId`,
so any edit, reordering, or reparenting invalidates the chain from that point on.

**Unauthorized update.** Rejected: each proof is checked against the `updateKeys` authorized by
the *previous* entry, so a rotated-out key cannot sign a later entry.

**Replay of a valid entry.** Rejected: `versionId` is unique and the chain enforces order.

**Signature malleability.** Mitigated: Ed25519 verification follows RFC 8032 strictly, rejects
small-order public keys, and does not accept ZIP-215 relaxations. This matters for
interoperability as much as security, since it means implementations agree on validity.

**Canonicalization mismatch.** Mitigated by RFC 8785 (JCS). The known implementation hazard is
reconstructing the SCID placeholder form by walking the object graph rather than by literal string
replacement, which misses SCIDs nested inside identifiers and URLs.

**Unauthenticated publishing.** Publishing requires no credential, by design: an entry proves
itself, so there is nothing a credential would add. The exposure is resource consumption rather
than forgery, and it is mitigated by per-client rate limiting. Deployments MUST rate limit writes
and MUST derive the client identity from a source the client cannot set. A deployment behind a
proxy that forwards a client-supplied `X-Forwarded-For` unchanged makes its own rate limit
bypassable.

**Denial of service.** Unresolved beyond rate limiting. A determined attacker can still consume
storage by publishing many well-formed identifiers.

## 4. Key management

Security rests entirely on the client's key handling, which the method does not and cannot
constrain. Implementers should note:

- Keys MUST be generated from a cryptographically secure random source on the client. A key
  derived from any value a server supplies or can predict places control with that server and
  silently defeats self-custody, even though the resulting log verifies correctly.
- Rotation is supported and does not change the identifier. Deployments should rotate on a
  schedule rather than only after suspected compromise.
- There is no recovery. A holder who loses every authorized key cannot be restored by the
  operator. Multiple `updateKeys`, held on separate devices, is the available mitigation.

## 5. Privacy

**The identifier is not random.** It is a hash of the genesis entry. It reveals nothing about the
subject directly, but it is a stable correlator: the same identifier used across contexts links
those contexts. Subjects wanting unlinkability should use separate identifiers per context.

**Everything published is public.** The log and the DID document are world-readable by design.
Personal data MUST NOT be placed in a DID document. Service endpoints can leak affiliation.

**History is permanent.** The log is append-only. A value published once cannot be withdrawn,
only superseded, and archived copies may persist beyond the registry's control. This is in
tension with erasure obligations under GDPR and similar regimes, and deployments handling
personal data must account for it by keeping such data out of the log entirely.

**Deactivation is not deletion.** A deactivated identifier remains resolvable as deactivated, and
its history remains readable.

**Metadata.** The registry observes publication and resolution. Verification performed offline
from a presented log is not observable by the registry, which is a meaningful privacy property of
the presentation flow.

## 6. Known gaps in the current deployment

Stated so they are not mistaken for solved problems.

- **Witnesses are not enforced.** The `witness` and `watchers` parameters are parsed and
  validated but co-signing is not required. Tamper evidence is therefore detectable by anyone
  holding a prior copy, rather than prevented at publication. Equivocation, where an operator
  serves different valid histories to different parties, is not currently prevented.
- **The archive is not publicly auditable.** Published logs are mirrored to an IPFS deployment
  operated by the method's authors, which currently runs a private swarm. Archived content is not
  retrievable from the public IPFS network, so the mirror provides durability, not independent
  audit.
- **Single operator.** One organization runs the registry. The method limits what that operator
  can forge, but availability and freshness rest with it.
- **No production deployment.** The method runs on staging only.

## 7. Residual risks

- A subject who loses all keys loses the identifier permanently.
- A registry can withhold or serve stale data, and without witnesses a verifier cannot always
  distinguish stale from current.
- Compromise of a current update key allows an attacker to rotate keys and take over the
  identifier. Detection depends on the subject or a watcher noticing the published rotation.
