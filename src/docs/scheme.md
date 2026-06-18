# The did:soul Method Specification


## Abstract


The `did:soul` method specification conforms to the requirements specified in the [DID Core specification](https://www.w3.org/TR/did-core/) published by the W3C. For more information about DIDs and DID method specifications, please see the [DID Primer](https://w3c-ccg.github.io/did-primer/).


## Introduction


The `did:soul` method is designed to support a decentralized identity layer for the Soulverse ecosystem. DIDs created using this method are used for agents, users, services, AI agents, and autonomous actors, providing each with a persistent, self-sovereign, cryptographically verifiable identity that is not tied to any central authority.


Key design principles of the `did:soul` method:


- **Decentralized creation** → DIDs are created locally and pinned to IPFS without requiring a blockchain transaction or central registry.
- **Cloud-grade key protection** → Private keys are encrypted before storage and never persisted in plaintext.
- **Immutable history** → Every version of a DID Document is pinned to IPFS as a distinct CID, forming a cryptographically verifiable, tamper-evident audit trail.
- **Versioned resolution** → Any historical version of a DID Document can be resolved by version number.
- **Deactivation** → DIDs can be permanently deactivated, with resolvers returning the correct W3C deactivation metadata.


## DID Format


A `did:soul` identifier has the following structure:


```text
did-soul          = "did:soul:" soul-identifier
soul-identifier   = UUID v4
```


The method-specific identifier is a cryptographically secure, randomly generated UUID. Every `did:soul` identifier therefore looks like:


```text
did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b
```


## DID Lifecycle

 ```mermaid
flowchart TB
    User[User/Agent]
    API[DID API - NestJS]
    DB[Registry]
    IPFS[IPFS - Doc Storage]
    Gen[DID Document Generator]
    Res[Resolver Service]
    UnivRes[Universal Resolver]

    User --> API
    API --> Gen
    API --> DB
    API --> IPFS
    API --> Res
    Res --> DB
    Res --> IPFS
    API -->|Driver API| UnivRes
```


All `did:soul` DIDs begin life anchored to IPFS. Once created, they are immediately resolvable by any node with access to the IPFS provider. Subsequent changes to the DID Document, service updates, or key rotation each produce a new content identifier, and every version is recorded in the version history of the registry.


The key design property is that DID creation is fully decentralized through IPFS; no blockchain or central registry write is required for a DID to become valid and resolvable. The local PostgreSQL registry serves as a fast-lookup index; the ground truth of each DID Document version is always the IPFS-pinned content addressed by its CID.


## DID Creation


To create a `did:soul` DID, a client submits a `POST /dids` request with no request body. The node performs all key generation, document assembly, KMS encryption, and IPFS pinning internally.


### Creation Steps


1. **Identifier generation** → Generate a cryptographically secure UUID v4 and form the full DID string: `did:soul:<uuid>`.
2. **Key pair generation** → Generate an Ed25519 key pair using a standard signing key generation algorithm.
3. **Multibase encoding** → Convert the raw public key bytes to multibase format by prepending the `0xed01` multicodec prefix and encoding as base58btc (prefix `z`). This produces the `publicKeyMultibase` value embedded in the DID Document.
4. **Private key encryption** → Send the private key to KMS. Store only the returned `CiphertextBlob` in the registry. The plaintext private key is discarded from memory after this step.
5. **DID Document assembly** → Construct a W3C-compliant DID Document:
  - `@context` set to the W3C DID v1 and Ed25519-2020 contexts
  - `id` set to the full DID string
  - `controller` set to the DID itself (self-controlled)
  - `verificationMethod` containing the public key as `#keys-1`
  - `authentication` and `assertionMethod` both referencing `#keys-1`
  - `created` and `updated` set to the current ISO timestamp
6. **IPFS pinning** → Upload the DID Document to IPFS. Tag the pin with `pinataMetadata` including the DID string and version number.
7. **Registry persistence** → Write a record to the `did` table with: `did`, `currentCid`, `encryptedKey`, `version: 1`, `deactivated: false`.
8. **History initialization** → Write the first entry to the version history with `version: 1` and the initial CID.


### Example Response


```json
{
 "statusCode": 201,
 "message": "DID created successfully",
 "did": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b",
 "didDocument": {
   "@context": [
     "https://www.w3.org/ns/did/v1",
     "https://w3id.org/security/suites/ed25519-2020/v1"
   ],
   "id": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b",
   "controller": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b",
   "verificationMethod": [
     {
       "id": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b#keys-1",
       "type": "Ed25519VerificationKey2020",
       "controller": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b",
       "publicKeyMultibase": "z6MkuvpRHmgcJPF7v7vqYVQAASDigPP7MLy14tKLCRkp6Cbo"
     }
   ],
   "authentication": [
     "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b#keys-1"
   ],
   "assertionMethod": [
     "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b#keys-1"
   ],
   "created": "2026-04-21T18:25:20.080Z",
   "updated": "2026-04-21T18:25:20.080Z"
 },
 "cid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
 "version": 1
}
```


## Verification Method Format


| Field | Value |
|---|---|
| `id` | `{did}#keys-{version}` — e.g. `did:soul:abc123#keys-1` |
| `type` | `Ed25519VerificationKey2020` |
| `controller` | The DID itself (self-controlled) |
| `publicKeyMultibase` | Base58btc-encoded public key with multicodec prefix `0xed01`, prefixed with `z` |


## Key Fragment Naming


Key fragments follow the pattern `#keys-{N}` where `N` is the version number at which the key was introduced:


| Fragment | Introduced at | Meaning |
|---|---|---|
| `#keys-1` | Creation (version 1) | Initial signing key |
| `#keys-2` | First rotation (version 2) | First rotated key |
| `#keys-N` | Rotation N-1 (version N) | Key active at version N |


## Verification Relationships


| Property | Points to | Purpose |
|---|---|---|
| `authentication` | Latest key fragment (e.g. `#keys-2`) | Proves the subject controls the DID; used for login and DIDComm |
| `assertionMethod` | Previous key fragment (e.g. `#keys-1`) after rotation | Proves authorship of Verifiable Credentials; retained for legacy credential verification |


Important: After key rotation, `assertionMethod` intentionally retains the previous key fragment. This ensures that Verifiable Credentials signed with the old key remain verifiable even after the controller has rotated to a new signing key.


## DID Update


A DID Update changes the content of the DID Document by adding or replacing service endpoints or verification methods without changing the signing key. To initiate an update, the client submits an update request to the node with the fields they want to change. The node then performs the following steps:


### Update Steps


1. Verify the DID exists and is not deactivated.
2. Fetch the current DID Document from IPFS using `currentCid`.
3. Merge the update payload into the current document:
  - `service` is replaced if provided in the payload; otherwise retained from the current document.
  - `verificationMethod` is replaced if provided; otherwise retained.
  - `authentication` is replaced if provided; otherwise retained.
  - `@context`, `id`, `controller`, and `created` are always preserved unchanged.
4. Set `updated` to the current ISO timestamp.
5. Increment the version counter (`newVersion = currentVersion + 1`).
6. Pin the updated DID Document to IPFS. Tag with `pinataMetadata` using the new version number.
7. Update the registry: set `currentCid` to the new CID and `version` to `newVersion`.
8. Append a new entry to the version history with the new version and content identifier.


All fields in the request body are optional. Fields not provided are preserved from the current DID Document.


### Example Response


```json
{
 "did": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b",
 "cid": "QmNewCidAfterUpdate...",
 "document": {
   "@context": [
     "https://www.w3.org/ns/did/v1",
     "https://w3id.org/security/suites/ed25519-2020/v1"
   ],
   "id": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b",
   "controller": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b",
   "verificationMethod": [{ "..." }],
   "authentication": [
     "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b#keys-1"
   ],
   "service": [
     {
       "id": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b#svc-1",
       "type": "LinkedDomains",
       "serviceEndpoint": "https://api.soulverse.com/agent/541e2553"
     }
   ],
   "created": "2026-04-21T18:25:20.080Z",
   "updated": "2026-04-23T09:00:00.000Z"
 },
 "version": 2
}
```


## Key Rotation


Key rotation is a special class of DID update that replaces the active cryptographic key pair with a newly generated one. Unlike a document update, key rotation always generates new key material and re-encrypts via KMS. Key rotation is initiated through a dedicated rotation request. No request body is required.


### Rotation Steps


1. Verify the DID exists and is not deactivated.
2. Fetch the current DID Document from IPFS using `currentCid`.
3. Generate a new Ed25519 key pair.
4. Encode the new public key in multibase format (`publicKeyMultibase`).
5. Encrypt the new private key via KMS. The old encrypted key is superseded.
6. Increment the version counter (`newVersion = currentVersion + 1`).
7. Construct the new key fragment ID: `{did}#keys-{newVersion}`.
8. Assemble the updated DID Document:
  - `verificationMethod` is set to contain only the new key.
  - `authentication` is updated to reference the new key fragment.
  - `assertionMethod` is not updated; it retains the previous key fragment to preserve verifiability of credentials signed with the old key.
  - `updated` is set to the current ISO timestamp.
9. Pin the updated document to IPFS. Tag with the new version.
10. Update registry: `currentCid`, `version`, and `encryptedKey` are all updated.
11. Append a new entry to the version history with the new version, CID, and new encrypted key.


### Example Response


```json
{
 "did": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b",
 "cid": "QmXma5JdRB9vVjMEuaBpNGhsooKiut7VRPogtuSQi7hQmB",
 "document": {
   "@context": [
     "https://www.w3.org/ns/did/v1",
     "https://w3id.org/security/suites/ed25519-2020/v1"
   ],
   "id": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b",
   "controller": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b",
   "verificationMethod": [
     {
       "id": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b#keys-2",
       "type": "Ed25519VerificationKey2020",
       "controller": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b",
       "publicKeyMultibase": "z6MkmZcxWnSjqSeu8Jyb9LRXC8dbP51BWxFR1uGcf1ZZ8pcQ"
     }
   ],
   "authentication": [
     "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b#keys-2"
   ],
   "assertionMethod": [
     "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b#keys-1"
   ],
   "created": "2026-04-21T18:25:20.080Z",
   "updated": "2026-04-23T08:54:09.192Z"
 },
 "version": 2
}
```


### Key State After Rotation


**Version 1 (created):**
- `verificationMethod`: `[#keys-1]`
- `authentication`: `[#keys-1]` ← active signing key
- `assertionMethod`: `[#keys-1]` ← credential issuance key


**Version 2 (after rotate):**
- `verificationMethod`: `[#keys-2]`
- `authentication`: `[#keys-2]` ← new active signing key
- `assertionMethod`: `[#keys-1]` ← retained: credentials signed with `#keys-1` remain verifiable


## DID Deactivation


Deactivating a DID is a permanent, irreversible operation that terminates the DID's active lifecycle. Deactivated DIDs cannot be updated or have their keys rotated because there is no longer an active controller. They can be resolved without error, but the resolver returns `deactivated: true` in the resolution metadata.


### Deactivation Steps


1. Verify the DID exists and is not already deactivated.
2. Set `deactivated: true` in the registry.
3. The DID Document on IPFS is preserved in all versions. The registry audit trail remains intact.


## DID Resolution


Resolution is the operation of responding to a DID with its current (or a historical) DID Document. If you think of the DID as a persistent pointer, resolution is the act of dereferencing it. Given a DID and an optional version number, the resolver queries the registry for the corresponding CID, then retrieves the DID Document from IPFS.


### Resolution Steps


1. Parse the DID string from the request.
2. Query the registry for a record matching the DID.
3. If no record is found, return error `4001 (DID_NOT_FOUND)`.
4. If `deactivated` is `true`, return `{ success: false, message: "DID is deactivated" }`.
5. Determine the target CID:
  - If a version query parameter is provided, query the registry for the matching version. If not found, return error `4004 (DID_VERSION_NOT_FOUND)`.
  - Otherwise, use `currentCid` from the registry.
6. Fetch the DID Document from IPFS.
7. If the fetch fails, return error `4002 (FAILED_RESOLVE_DID)`.
8. Return the DID Document with resolution metadata.




### Example Response


```json
{
 "didDocument": {
   "@context": [
     "https://www.w3.org/ns/did/v1",
     "https://w3id.org/security/suites/ed25519-2020/v1"
   ],
   "id": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b",
   "controller": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b",
   "verificationMethod": [
     {
       "id": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b#keys-1",
       "type": "Ed25519VerificationKey2020",
       "controller": "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b",
       "publicKeyMultibase": "z6MkuvpRHmgcJPF7v7vqYVQAASDigPP7MLy14tKLCRkp6Cbo"
     }
   ],
   "authentication": [
     "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b#keys-1"
   ],
   "assertionMethod": [
     "did:soul:541e2553-5b46-4ef3-a8c6-4b4597af831b#keys-1"
   ],
   "created": "2026-04-21T18:25:20.080Z",
   "updated": "2026-04-21T18:25:20.080Z"
 },
 "didDocumentMetadata": {
   "created": "2026-04-21T18:25:21.489Z",
   "updated": "2026-04-21T18:25:21.489Z",
   "versionId": "1",
   "deactivated": false
 }
}
```


## Proof Verification


When verifying a proof on a Verifiable Credential or other signed object, the verifier must resolve the signer's DID at the version that was active when the proof was created. This is the critical mechanism that makes `did:soul` key rotation safe for issued credentials.


The `updated` field in `didDocumentMetadata` and the version number in the registry together allow a verifier to determine which DID Document and therefore which public key was active at any point in time.


This temporal resolution ensures that a Verifiable Credential issued at version 1 of a DID remains verifiable at version 3, even though the signer has since rotated their key twice. The old key remains reachable at the historical version via versioned resolution.


## Verification Method Reference Format


The `proof.verificationMethod` field identifies which key was used to create the proof. In `did:soul` operations:


- **Create operations** — No proof is required (the node creates the DID autonomously).
- **Verifiable Credentials and Presentations** — Must reference the full DID key fragment: `did:soul:abc123#keys-1`.
- **Future signed update/rotate operations** — Must reference the full DID key fragment of the active controller at the time of the operation.


## Security Considerations


### Private Key Protection


Private keys are protected using Key Management Service (KMS) with a dedicated master key. The plaintext private key exists in memory only during the key generation and encryption step. Only the encrypted ciphertext (`CiphertextBlob`) is written to the database.


No API endpoint in this method exposes the plaintext private key.


### IPFS Immutability as a Security Property


Every DID Document version is content-addressed; the CID is a cryptographic hash of the document content. This means:


- A stored CID is a tamper-evident commitment to the document content.
- If an attacker modifies the document, the CID changes, breaking the link.
- The version history table provides an append-only log of CIDs, forming an immutable audit trail.


### Deactivation Finality


Deactivation is irreversible by design. Once `deactivated: true` is set, no further mutations are accepted. This prevents an attacker who has gained registry access from re-activating a deactivated DID.

