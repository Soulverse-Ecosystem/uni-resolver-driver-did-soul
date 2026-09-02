# DID method recommendation proposal: did:soul

A proposal to include `did:soul` in the set of DID methods recognized by the decentralized
identity ecosystem.

## Description

`did:soul` is a self-certifying DID method. An identifier is the hash of the first entry in its
own history, so the identifier and the content it names cannot be separated. Verifying a
`did:soul` is arithmetic performed on data the holder presents, not a query answered by an
authority.

The method is a profile of [did:webvh](https://identity.foundation/didwebvh/) v1.0. It keeps
webvh's hash-chained, self-certifying log and its `eddsa-jcs-2022` Data Integrity proofs, and
removes the domain and path from the identifier. A `did:soul` is therefore location independent:
it does not encode where it is hosted, and moving the registry does not change the identifier.

```
did:soul:QmaPK5S4dDPVeXXX85auWfWtMgBTsCX1GHVLBrNWQLfzAm
         └─────────────────────── SCID ──────────────────────┘
```

The SCID is `base58btc(multihash(sha256(JCS(genesis entry))))`. Keys are generated and held by
the client. The registry verifies entries and publishes them; it holds no key material and
cannot author, alter, or recover an identifier.

### Benefits

- **Self-certifying identifiers.** The SCID commits to the genesis entry. Altering any byte of
  that entry yields a different SCID, so a forged document cannot answer to the same identifier.
- **Verification without the registry.** A holder presents its DID, its log, and a signature. A
  verifier replays the log and checks the proofs locally. Resolution through the registry is a
  convenience for discovery, not a trust dependency.
- **The registry cannot impersonate its users.** Entries arrive already signed by a key the
  registry never sees. There is no operation by which the registry mints or edits an identity.
- **Location independence.** No domain and no path in the identifier, so identifiers survive a
  change of host, operator, or DNS name.
- **Append-only, tamper-evident history.** Each entry names the hash of its predecessor and
  carries a proof from a key the previous entry authorized. History can be extended, not rewritten.
- **Key rotation without changing the identifier.** Rotation is an ordinary signed entry.
- **Standard cryptography.** Ed25519 signatures, SHA-256, JSON Canonicalization Scheme
  (RFC 8785), and W3C Data Integrity. Nothing bespoke.
- **No blockchain and no fees.** Creation and updates are HTTP requests. There is no chain, no
  token, and no gas cost.
- **Deterministic resolution.** Given the same log, every conformant implementation resolves to
  the same DID document.

### Drawbacks

Stated plainly, including the ones that are unresolved today.

- **Discovery depends on the registry.** Verification does not, but answering "what is the log
  for this DID?" does. A holder who cannot present its own log needs a reachable registry.
- **Self-custody has no recovery path.** The registry holds no keys, so a holder who loses every
  authorized key cannot be restored by the operator. This is inherent to the design, not an
  omission.
- **Witnesses are specified but not enforced.** The `witness` and `watchers` parameters are
  parsed and validated, but co-signing is not required. Until witnesses run, tamper evidence
  means detectable by anyone holding a prior copy, not prevented at publication.
- **The archive is not publicly auditable today.** Published logs are mirrored to an IPFS
  deployment operated by the method's authors. That deployment currently runs a private swarm,
  so archived content is not retrievable from the public IPFS network. The mirror is a durability
  measure off the resolution path, and it should not be described as public auditability until
  the swarm is public.
- **Single operator.** The registry is currently run by one organization. The method's
  guarantees limit what that operator can do, but availability still rests with it.
- **Implementation maturity.** One registry implementation, one SDK, and one Universal Resolver
  driver exist. The method is deployed on staging and has not yet run in production.

## Design

The method separates three concerns that are often conflated.

| Concern | Where it lives | Authority |
| --- | --- | --- |
| Truth | Append-only signed log, one per identifier | Authoritative |
| Lookup speed | Relational index | Derived, rebuildable from the log |
| Durability | Content-addressed archive | Redundant copy, off the resolution path |

Only the log is authoritative. The index exists so lookups are fast and can be discarded and
rebuilt. The archive exists so the log is not the only copy, and an archive failure never affects
resolution.

## Lifecycle

**Create.** The client generates an Ed25519 key pair, builds a genesis entry containing the
initial DID document and the authorized update keys, computes the SCID over that entry, and signs
it. The registry recomputes the SCID, verifies the proof, and publishes.

**Update.** The client builds an entry naming the previous entry's `versionId`, signs it with a
currently authorized key, and submits it. The registry verifies the chain and the proof before
appending.

**Rotate.** An update that changes the authorized update keys. Subsequent entries must be signed
by the new keys. The identifier does not change.

**Deactivate.** A signed terminal entry. Resolution then reports the identifier as deactivated
and further entries are refused.

## Resolution

1. Fetch the log: `GET {registry}/dids/{did}/log`, returning JSON Lines, one entry per line.
2. Verify the first entry's hash equals the SCID in the identifier.
3. For each subsequent entry, verify it names its predecessor and carries a proof from a key the
   previous entry authorized.
4. Apply entries in order to obtain the current DID document.

Steps 2 to 4 require no network access. A verifier given the log offline reaches the same result.

## Relationship to DID drivers

A Universal Resolver driver is implemented and open source. It performs the full verification
above locally rather than proxying the registry's answer, so a compromised or malicious registry
cannot induce the driver to return a document that does not verify.

## Existing materials

- Method specification: `docs/scheme.md`
- Security and privacy considerations: `docs/privacy-security.md`
- Universal Resolver driver: this repository
- Registry implementation and SDK: `@soulverse-sdk/did-soul-core`

## Meeting the selection criteria

**Open and royalty free.** No fees, no tokens, no licensing obstacles to implementation.

**Specified in sufficient detail to be independently implemented.** The method is a profile of
did:webvh v1.0 with the identifier syntax narrowed. The SCID derivation, entry format, proof
suite, and verification algorithm are specified in `docs/scheme.md`.

**Multiple implementations are possible.** The verification algorithm depends only on published
standards. Any implementation with Ed25519, SHA-256, and a JCS implementation can verify a
`did:soul` without the authors' code.

**Does not depend on a proprietary or permissioned ledger.** There is no ledger.

## Standardization status

`did:soul` is not currently in a standardization process. It is built as a profile of did:webvh,
which is progressing through DIF. This proposal is the first step toward registration in the
W3C DID Specification Registries.

## Supporting use cases

Wallet-held identity where the wallet holds its own keys and can prove control while offline;
authentication to relying parties that must verify without contacting the identity provider; and
service identity for agents and backend services that need stable, rotatable identifiers.

## Contact

Soulverse Ecosystem, <https://github.com/Soulverse-Ecosystem>
