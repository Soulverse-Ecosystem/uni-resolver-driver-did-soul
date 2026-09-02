# The did:soul Method Specification

**Status:** draft. Implemented and deployed on staging.
**Profile of:** [did:webvh](https://identity.foundation/didwebvh/) v1.0.

## Abstract

`did:soul` is a self-certifying DID method whose identifier is a hash of the first entry of its
own history. The method retains did:webvh's hash-chained log, its `eddsa-jcs-2022` Data Integrity
proofs, and its verification rules, and narrows the identifier syntax to a bare SCID with no
domain and no path. Keys are held by the client. The registry verifies and publishes entries and
holds no key material.

## Relationship to did:webvh

An implementation of did:webvh v1.0 can verify a `did:soul` log by supplying the identifier
syntax below. The differences are:

| | did:webvh | did:soul |
| --- | --- | --- |
| Identifier | `did:webvh:{scid}:{domain}[:{path}]` | `did:soul:{scid}` |
| Location | Encoded in the identifier | Not encoded |
| Log retrieval | Derived from the domain | Registry endpoint |
| SCID derivation | Identical | Identical |
| Entry chaining and proofs | Identical | Identical |

Removing the domain makes an identifier independent of where it is served. Moving or renaming the
registry does not change any identifier.

## DID syntax

```abnf
did-soul     = "did:soul:" scid
scid         = 46*46 base58btc-char
base58btc-char = %x31-39 / %x41-48 / %x4A-4E / %x50-5A / %x61-6B / %x6D-7A
```

The SCID is the base58btc encoding of a SHA-256 multihash, which is 46 characters and begins
`Qm`. Implementations MUST reject an identifier that does not match this grammar before
performing any network operation.

```
did:soul:QmaPK5S4dDPVeXXX85auWfWtMgBTsCX1GHVLBrNWQLfzAm
```

## SCID derivation

The SCID commits to the entire genesis entry.

1. Build the genesis entry with the literal string `{SCID}` wherever the SCID will appear. This
   includes the DID document `id`, the `controller`, every verification method `id`, and
   `parameters.scid`.
2. Remove the `proof` property.
3. Serialize with JSON Canonicalization Scheme (RFC 8785).
4. Compute SHA-256 over those bytes.
5. Frame the digest as a multihash: `0x12 0x20` followed by the 32 digest bytes.
6. Encode with base58btc.

```
scid = base58btc( 0x12 || 0x20 || sha256( JCS( entry_with_placeholder_and_no_proof ) ) )
```

Verification reverses step 1 by **literal string replacement** of the declared SCID with `{SCID}`
throughout the serialized entry. A structural walk of the object graph is NOT sufficient: SCIDs
appear inside nested identifiers and URLs, and a walk that only visits known properties will miss
them and accept an entry it should reject.

## Log format

A log is JSON Lines: one entry per line, in order, no enclosing array.

```json
{
  "versionId": "1-QmXk9…",
  "versionTime": "2020-01-01T00:00:00Z",
  "parameters": { "method": "did:webvh:1.0", "scid": "QmaPK5…", "updateKeys": ["z6Mk…"] },
  "state": { "@context": [...], "id": "did:soul:QmaPK5…", ... },
  "proof": [ { "type": "DataIntegrityProof", "cryptosuite": "eddsa-jcs-2022", ... } ]
}
```

`versionId` is `{versionNumber}-{entryHash}`, where `versionNumber` starts at 1 and increases by
exactly one per entry.

The entry hash binds each entry to its predecessor:

```
entryHash = base58btc( multihash( sha256( JCS( entry_without_proof, versionId := predecessor_versionId ) ) ) )
```

For the genesis entry the predecessor `versionId` is the SCID itself. Replacing `versionId` with
the predecessor's value before hashing is what makes the log a chain: an entry cannot be moved,
reordered, or reparented without invalidating its hash.

## Proofs

Each entry carries one or more Data Integrity proofs.

- `type`: `DataIntegrityProof`
- `cryptosuite`: `eddsa-jcs-2022`
- `proofPurpose`: `assertionMethod`
- `verificationMethod`: a `did:key` URL whose key MUST appear in the **previous** entry's
  `updateKeys` (for the genesis entry, in its own `updateKeys`)

The signing input is `sha256(JCS(proofConfig)) || sha256(JCS(document))`, the proof configuration
hash **first**. Reversing the order produces a signature that verifies against nothing.

Signatures are Ed25519 verified under RFC 8032 rules. Implementations MUST reject small-order
public keys and MUST NOT accept the ZIP-215 relaxations, so that every implementation agrees on
which signatures are valid.

## Operations

### Create

The client generates an Ed25519 key pair, builds the genesis entry with `{SCID}` placeholders and
its public key in `updateKeys`, derives the SCID, substitutes it, and signs. The registry
recomputes the SCID, verifies the proof, and publishes.

### Update

An entry whose `versionId` chains to the current tail, signed by a key listed in the previous
entry's `updateKeys`. The `state` is the new DID document in full.

### Rotate

An update that changes `parameters.updateKeys`. Later entries MUST be signed by the new keys. The
identifier does not change.

### Deactivate

An update setting `parameters.deactivated` to `true`. Resolution then reports the DID as
deactivated and the registry MUST refuse further entries.

## Resolution

1. Reject the identifier if it does not match the syntax above.
2. Retrieve the log: `GET {registry}/dids/{did}/log`.
3. Verify the genesis entry: recompute the SCID by placeholder substitution and compare it to the
   identifier. Reject on mismatch.
4. For each entry in order: check `versionNumber` increments by one, recompute the entry hash
   against the predecessor's `versionId`, and verify every proof against the previously authorized
   `updateKeys`. Reject `versionTime` values that move backwards or lie in the future beyond an
   implementation-defined tolerance.
5. Apply entries in order. The final `state` is the DID document.

Steps 3 to 5 require no network access. Given the same log, all conformant implementations MUST
produce the same document.

### Resolution metadata

| Condition | `didResolutionMetadata.error` | HTTP |
| --- | --- | --- |
| Resolved | absent | 200 |
| Unknown identifier | `notFound` | 404 |
| Deactivated | `deactivated` | 410 |
| Malformed identifier | `invalidDid` | 400 |
| SCID does not match | `invalidScid` | 400 |
| Proof failed | `invalidProof` | 400 |

## Security considerations

See `docs/privacy-security.md`.

## Notes for implementers

Two mistakes account for most interoperability failures:

1. **Reconstructing the placeholder form structurally.** Use literal string replacement.
2. **Ordering the two hashes in the signing input incorrectly.** The proof configuration hash
   comes first.
