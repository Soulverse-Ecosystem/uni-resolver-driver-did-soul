# did:soul: a self-certifying identity method

## Abstract

Most digital identity is a row in a company's database. The company can edit that row, and the
person it describes has no way to detect the change. `did:soul` removes that possibility by
deriving the identifier from a hash of its own first record, so the name and the content it
refers to cannot be separated. The registry that publishes these identifiers holds no key
material and cannot author, alter, or recover one. Verification is arithmetic performed on data
the holder presents, not a question answered by an authority.

## 1. Problem

Federated identity concentrates control with the provider. The provider can disable an account,
alter its attributes, or impersonate its holder, and users must trust that it does not. Public
key infrastructure addresses impersonation but ties identity to certificate authorities that hold
similar power.

Decentralized identifiers move key control to the subject. But many DID methods reintroduce a
dependency: an identifier that names a location, a ledger, or a service becomes hostage to it.
If the identifier encodes a domain, whoever controls the domain eventually controls the identity.

The question this method answers is narrow: **can an identifier prove its own integrity without
anyone vouching for it, and without naming where it lives?**

## 2. Approach

`did:soul` is a profile of did:webvh v1.0. It keeps webvh's hash-chained log and its Data
Integrity proofs, and removes the domain and path from the identifier.

```
did:soul:QmaPK5S4dDPVeXXX85auWfWtMgBTsCX1GHVLBrNWQLfzAm
```

Everything after the prefix is a SCID: the base58 encoding of a SHA-256 multihash over the
canonical form of the first log entry. Because the identifier is a hash of the record, altering
the record changes the identifier. A forged document does not answer to the same name.

Subsequent changes are appended as entries, each naming its predecessor's hash and signed by a key
the previous entry authorized. History extends. It does not rewrite.

## 3. What this buys

**The operator cannot impersonate its users.** Entries arrive already signed with keys the
registry never sees. There is no operation by which the registry mints or edits an identity. The
guarantee holds against the operator exactly as it holds against an outsider.

**Verification does not require the registry.** A holder presents its DID, its log, and a
signature. The verifier replays the log and checks the proofs locally. A relying party can
authenticate a subject while the registry is offline. This is not a fallback path, it is the
normal one.

**Identifiers survive infrastructure changes.** No domain in the identifier means renaming or
moving the registry changes nothing. Identifiers outlive the hostnames that served them.

**No ledger and no fees.** Creating and updating are HTTP requests. There is no chain, no token,
and no transaction cost.

## 4. Architecture

Three concerns are kept separate, with only one of them authoritative.

| Concern | Store | Authority |
| --- | --- | --- |
| Truth | Append-only signed log, one file per identifier | Authoritative |
| Lookup speed | Relational index | Derived, rebuildable |
| Durability | Content-addressed archive | Redundant, off the resolution path |

The log is authoritative because it is what was signed. Keeping it verbatim lets any reader re-run
the checks byte for byte, whereas re-serializing it through a database would require trusting the
operator's serialization, which is precisely what the design avoids.

The index can be discarded and rebuilt from the logs. The archive is a second copy written on a
best-effort basis, so an archive failure never delays or breaks resolution.

## 5. Lifecycle

Creation, update, key rotation, and deactivation are all signed entries appended to the log.
Rotation changes the authorized keys without changing the identifier. Deactivation is terminal:
the identifier remains resolvable and is reported as deactivated.

Full details are in `docs/scheme.md`.

## 6. Security posture

The guarantees and their limits are set out in `docs/privacy-security.md`. In summary: forgery,
tampering, and unauthorized updates are prevented cryptographically. Availability and freshness
rest with the operator. There is no recovery for a holder who loses every authorized key, which
is inherent to self-custody rather than an oversight.

Two limitations should be read alongside the guarantees. Witness co-signing is specified but not
enforced, so equivocation is not currently prevented. And the archive runs on a private IPFS
swarm, so it provides durability rather than independent public audit.

## 7. Deployment status

The registry, the SDK, and a Universal Resolver driver are implemented. The method is deployed on
staging and has not yet run in production. The driver performs full local verification rather than
proxying the registry's answer, so a compromised registry cannot induce it to return a document
that does not verify.

## 8. Use cases

**Wallet-held identity.** A wallet derives its identifier, holds its keys, and proves control
while offline.

**Authentication without a callback.** A relying party verifies a presented log directly, with no
request to the identity provider, and therefore no way for the provider to observe or block the
authentication.

**Service and agent identity.** Stable, rotatable identifiers for backend services and automated
agents, with no per-identifier cost.

## 9. References

- [DID Core](https://www.w3.org/TR/did-core/)
- [did:webvh](https://identity.foundation/didwebvh/)
- [Data Integrity EdDSA Cryptosuites](https://www.w3.org/TR/vc-di-eddsa/)
- [RFC 8785, JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
- [RFC 8032, EdDSA](https://www.rfc-editor.org/rfc/rfc8032)
