# DID method recommendation proposal: did:soul

This is a proposal to include `did:soul` in the set of DID methods recognized and recommended by the decentralized identity ecosystem.

## Description

The `did:soul` method is a DID method designed for the Soulverse ecosystem. It provides persistent, cryptographically verifiable, self-sovereign identifiers for individuals, organizations, devices, AI agents, and services. The method combines a lightweight registry, content-addressed DID Document storage on IPFS, and global resolution support through a dedicated DID driver.

The `did:soul` method is intended to provide a stable identity layer that remains resolvable over time, while preserving document history and supporting standard DID lifecycle operations.

### Benefits

The `did:soul` method provides several practical benefits for decentralized identity use cases:

- **Persistent identifiers**: The DID remains stable across updates and key rotations.
- **Cryptographic verifiability**: Public keys in the DID Document enable signature verification and proof-based interaction.
- **Content-addressed document history**: Each DID Document version is stored as an immutable IPFS object, creating a tamper-evident audit trail.
- **Global resolvability**: A resolver can obtain the current or historical DID Document using the DID and version metadata.
- **Interoperability**: The method is designed to work with DID Core concepts and Universal Resolver infrastructure.
- **Privacy-aware design**: The DID itself is random and non-semantic, reducing direct linkage to personal attributes.
- **Operational flexibility**: Updates, key rotation, and deactivation are supported as distinct lifecycle operations.
- **Free DID creation**: No fee is required to create a DID.
- **No blockchain gas cost**: The method does not depend on a blockchain transaction for creation, so users avoid gas fees.
- **Versioned DID Document history**: Updates can be stored as new versions, so the identity history remains traceable.
- **Reconstructable resolution**: A resolver can rebuild the DID Document from stored history.
- **Privacy-friendly identifier design**: If the DID uses random UUIDs or non-semantic identifiers, it does not reveal identity meaning from the DID itself.
- **Flexible lifecycle support**: Creation, update, and resolution are handled as separate lifecycle steps.

### Drawbacks

The `did:soul` method also has limitations and trade-offs that should be acknowledged:

- **Dependence on registry availability**: Resolution relies on the registry as the authoritative index for the latest DID Document reference.
- **Public document exposure**: DID Documents stored on IPFS are retrievable by anyone with the CID, so sensitive data must not be placed in the document.
- **Key management complexity**: Secure key generation, rotation, and protection require disciplined operational controls.
- **Historical resolution cost**: Resolving older versions may require additional lookup and retrieval steps.
- **Not fully self-certifying by identifier alone**: The DID is unique and stable, but resolution still depends on associated registry state and stored history.
- **Implementation maturity may be limited**: As a custom method, adoption depends on tooling, documentation, and resolver support.
- **Storage or infrastructure costs may still exist**: Even if DID creation is free, supporting systems like storage or hosting may still have operational cost.

## Core Innovation: Registry State and Content-Addressed Documents

The fundamental insight behind `did:soul` is that DID state management and DID Document storage have different requirements:

| Requirement | DID State / Registry | DID Document / IPFS |
| --- | --- | --- |
| Speed | Fast lookup and lifecycle management | Content-addressed storage |
| Immutability | Version tracking and state history | Document-level immutability |
| Availability | Resolver-compatible registry access | Globally retrievable by CID |
| Verifiability | Operational metadata and lifecycle state | Cryptographically anchored document history |

By separating these concerns, `did:soul` provides a practical identity system that supports both stable identifiers and traceable document history.

- **Identity Creation**: Instant creation of a unique DID using a UUID v4 identifier.
- **Identity Updates**: New DID Document versions are published as content-addressed records and tracked through the registry.
- **Resolution**: Any supported node can resolve the DID by following the registry reference to the corresponding DID Document.

## DID Lifecycle

```text
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   CREATE    │───▶│   UPDATE    │───▶│   RESOLVE   │
│   (UUID)    │    │ (Versioned) │    │ (Any Node)  │
└─────────────┘    └─────────────┘    └─────────────┘
      │                  │                   │
      ▼                  ▼                   ▼
   Instant           New CID in          Reconstruct
   Global          document history      DID Document
   Unique             preserved           from history
```

All `did:soul` identifiers begin life as a cryptographically unique UUID v4. The DID Document is stored in IPFS, and each update produces a new content identifier, making the document history tamper-evident and auditable.

## DID Resolution Model

`did:soul` resolution follows a deterministic replay model. A resolver uses the DID identifier to locate the current or historical DID Document version, then reconstructs the DID resolution result from the stored document and metadata.

Resolution returns:
- `didDocument`
- `didDocumentMetadata`
- `didResolutionMetadata`

This design supports current-state resolution as well as historical version lookup.

## Relationship to DID Drivers

The `did:soul` method is designed to be compatible with DID resolution infrastructure through a dedicated driver. The driver connects the method to the Universal Resolver, enabling `did:soul` identifiers to be resolved through a standard interface across the decentralized identity ecosystem.

## Existing Materials

- [White Paper](https://github.com/Soulverse-Ecosystem/uni-resolver-driver-did-soul/blob/main/src/docs/white-paper.md)
- [Method Specification](https://github.com/Soulverse-Ecosystem/uni-resolver-driver-did-soul/blob/main/src/docs/scheme.md)
- [Privacy and Security](https://github.com/Soulverse-Ecosystem/uni-resolver-driver-did-soul/blob/main/src/docs/privacy%20-%20security.md)


## Meeting the selection criteria

Document here how this DID method meets the DID method selection criteria.

| Criteria | Details |
| --- | --- |
| Alignment with DID Core specification | Yes. `did:soul` follows DID Core-style identifier, document, and resolution concepts. |
| Security and privacy features | Yes. Document storage is content-addressed, and private key material is protected through managed key services. |
| Scalability and performance | Yes. Registry-based lookup and IPFS-backed storage support scalable resolution and versioning. |
| Ease of implementation and use | Yes. Clear lifecycle operations and resolver integration simplify adoption. |
| Community adoption and support | currently used within the Soulverse ecosystem and supported by the DIF Universal Resolver. Wider adoption is still emerging and will be supported by publishing the formal specification.|
| Compliance with relevant regulations and best practices | Yes. The method supports auditable lifecycle management and data minimization principles. |
| Government and regulatory alignment | Yes. Built on internationally recognized security standards suitable for government and regulated use. |
| Privacy-preserving crypto | Yes. The method uses modern asymmetric cryptography and avoids unnecessary exposure of sensitive data. |
| Digitally signed cryptographic log of changes to the DID Document | Yes. Each update creates a new immutable document version. |
| Sustainability: Energy efficiency and eco-friendly infrastructure | Yes. `did:soul` avoids blockchain-related energy consumption and uses lightweight, cloud-based infrastructure, resulting in a low environmental footprint |
| Long-lived DIDs needed for long-lived VCs | Yes. identifiers remain stable throughout their lifetime, and historical records remain available to support long-term verification and trust. |
| Rapid creation and updates | Yes. It supports fast creation and updates of identifiers, enabling near real-time operation for applications and user workflows.
| Support for key rotation | Yes. Key rotation is supported as a lifecycle operation. |
| Reliable and predictable-latency operation, for updating and resolving | Yes. Registry-backed lookup and content-addressed retrieval support predictable resolution. |
| Resolution should not require additional state or context | Yes. Resolution is based on the DID and associated document history. |
| DIDs are permanent and immutable account identifiers | Yes. The DID string remains stable across updates. |
| Consider support for various DID Traits | Supports decentralized, persistent, cryptographically verifiable, and resolvable traits. |
| Consider categories defined by DID Rubric | Category: decentralized identity method. |
| Who WANTS to standardize the DID method and commits to doing the work? | Soulverse Engineering Team. |
| Are there no trademark or IP issues? | No known issues. |
| Diversity of DID methods | The `did:soul` introduces a unique approach to decentralized identity, contributing to greater diversity within the DID ecosystem.

## Is this DID method already involved in a standardization process? If so, where?

`did:soul` is currently an internal DID method proposal for the Soulverse ecosystem. It is designed to align with decentralized identity ecosystem practices and to support Universal Resolver compatibility.

## Supporting use cases

- **User Identity:**
Users need verifiable identity that can persist across applications and sessions. `did:soul` provides a stable identifier that can be resolved and used in credential workflows.

- **AI Agent Identity:** AI agents need independent, verifiable identities to interact with services and other agents. `did:soul` supports agent identity and credential-based trust.

- **Organizational Identity:** Organizations can use `did:soul` for signing, verification, and service discovery.

- **Verifiable Credentials:** `did:soul` can serve as a subject identifier for credential issuance and verification.

- **Decentralized Messaging:** Identity-linked messaging and secure communication can be built on top of `did:soul` resolution.

- **Device Identity:** IoT and hardware devices can be assigned persistent, verifiable identifiers.

## Contact

- **Organization**: Soulverse
- **Method**: `did:soul`
- **Infrastructure**: Soulverse DID ecosystem