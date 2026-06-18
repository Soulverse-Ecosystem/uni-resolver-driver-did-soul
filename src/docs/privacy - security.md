# did:soul - Security and Privacy Considerations

## 1. Security Considerations

This section follows the requirements of RFC3552 and the W3C DID 1.1 specification Section 7.3. Implementers are advised to read the Security Considerations section of the Controlled Identifiers v1.0 specification before deploying did:soul in a production environment.

---

### 1.1 Security Architecture and Trust Model

Before discussing individual attack vectors, the overall trust model of did:soul v1 must be understood.

#### 1.1.1 Assets

| Asset | Description | Sensitivity |
|---|---|---|
| DID Document | Public key material, service endpoints, version metadata | Public - integrity critical |
| Private Key (encrypted) | KMS-encrypted Ed25519 private key ciphertext | Secret - stored in DB |
| Private Key (plaintext) | Transient plaintext during generation and KMS encryption | Secret - exists only in memory briefly |
| Registry Records | DID-to-CID mappings, version history, deactivation status | Integrity critical - source of truth |
| Resolution Responses | DID Document + metadata returned to verifiers | Integrity critical - not currently signed |
| KMS | Symmetric key used to encrypt/decrypt all private keys | |

#### 1.1.2 Actors

| Actor | Trust Level | Capabilities |
|---|---|---|
| DID Subject | Untrusted by backend | In v1, has no direct cryptographic control, relies on Soulverse |
| Soulverse Backend | Trusted authority | Generates keys, encrypts/decrypts via KMS, writes to registry and IPFS, performs all mutations |
| Soulverse Personnel | Partially trusted | DB admins, DevOps, admins have varying access to registry and KMS |
| Verifier | Untrusted | Resolves DIDs; cannot modify state |
| Resolver Operator | Partially trusted | Operates did:soul driver; routes resolution requests |
| External Attacker | Untrusted | Network-level or application-level adversary |

#### 1.1.3 Trust Boundaries

The did:soul v1 architecture has four trust boundaries:

- **Trust boundary 1:** User Device - Soulverse Backend. The user trusts Soulverse to act faithfully on their behalf.
- **Trust boundary 2:** Backend - The backend trusts KMS for key protection and encryption.
- **Trust boundary 3:** Registry - IPFS. The registry CID maps to IPFS content. Registry integrity is assumed.
- **Trust boundary 4:** Driver - Backend. The Universal Resolver driver trusts the backend response.

---

### 2.2 Attack Surface on DID Operations

The following attack types are documented with respect to the five did:soul operations: CREATE, RESOLVE, UPDATE, KEY ROTATE, and DEACTIVATE.

#### 2.2.1 Eavesdropping

All communication between the did:soul driver, the Soulverse backend API, and IPFS MUST be conducted over TLS 1.2 or higher. DID Documents contain only public key material, however transport-layer encryption is required to prevent leakage of resolution patterns, user behaviour, and service endpoint metadata.

- **Residual risk:** An adversary with access to TLS session metadata (timing, volume) may infer resolution activity even without decrypting payloads.

#### 2.2.2 Replay Attacks

The v1 implementation does not include timestamps or nonces in resolution responses. Resolution results are not signed and cannot be distinguished from replayed copies at the protocol layer.

- **Known gap:** Resolution responses do not currently carry a retrieved timestamp or any freshness indicator. Verifiers have no method-level mechanism to detect stale or replayed DID Documents.
- **Planned mitigation:** Introduction of signed resolution metadata with timestamps is planned for v2. Until then, verifiers SHOULD implement their own freshness checks at the application layer.

#### 2.2.3 Message Insertion

All DID Documents are stored on IPFS as content-addressed objects. A CID uniquely identifies the exact bytes of a document, any modification produces a different CID. An attacker who inserts a modified document into IPFS will produce a different CID, which will not match the registry record.

- **Important clarification:** DID Document integrity relies on both IPFS content addressing and the integrity of the registry-maintained CID mappings. If the registry is compromised, an attacker could substitute a malicious CID that points to a valid but attacker-controlled DID Document on IPFS.

#### 2.2.4 Deletion

DID Documents stored on IPFS are immutable and content-addressed. However, the did:soul resolver depends on IPFS content availability, if a CID is not pinned and is garbage-collected, the associated DID Document version becomes unresolvable.

- **Mitigation:** The Soulverse infrastructure pins all DID Document CIDs. Independent resolver nodes MUST also pin CIDs for DIDs they serve.
- **Residual risk:** If Soulverse infrastructure becomes unavailable, DID resolution would fail until the registry is restored.

#### 2.2.5 Modification

DID Document content integrity is enforced by IPFS content addressing. Modifications to stored documents are detectable, any change produces a new, distinct CID.

- **Critical gap:** The v1 implementation does not perform cryptographic signature verification on UPDATE, KEY ROTATE, or DEACTIVATE requests. These operations are gated by application-level API authentication, not by Ed25519 signature verification against the DID Document's verificationMethod.
- **Planned mitigation:** The non-custodial architecture will require all mutating operations to be signed by the DID controller's private key held on the user's device.

#### 2.2.6 Denial of Service

The did:soul resolution flow traverses: Universal Resolver, did:soul driver, Soulverse backend, Database, and IPFS. Each component is a potential denial of service target. Rate limiting MUST be implemented on the backend API. Response caching with appropriate TTLs MUST be implemented.

- **Residual risk:** The centralised registry is a single point of failure. Distributed resolver node architecture (planned, Q4 2026) will reduce this risk.

#### 2.2.7 Amplification

The did:soul resolution protocol does not amplify requests, a single resolution request returns a single DID Document. Implementations SHOULD reject DID Documents exceeding 64KB to prevent storage amplification.

#### 2.2.8 Man-in-the-Middle

Transport-layer attacks are mitigated by mandatory TLS. The did:soul driver communicates with the Soulverse backend over authenticated HTTPS endpoints.

- **Known gap:** Resolution responses are not cryptographically signed by the method itself. Certificate pinning is recommended for high-security deployments.

---

### 3.3 Insider Threat Considerations

Given the custodial architecture of v1, insider threats represent a significant risk that may exceed external attack risk for many threat scenarios.

#### 3.3.1 Personnel with Registry Access

Database administrators with write access can modify CID mappings for any DID, alter version history, or change deactivation status.

| Threat | Impact | Required Mitigation |
|---|---|---|
| CID substitution | Resolver serves attacker-controlled document | DB write access restricted to app service account only |
| Version history tampering | Fabricated or erased state transitions | Audit enabled for all DID tables |
| Deactivation toggle | Reactivate deactivated DIDs or vice versa | Direct human write access requires change approval + audit log |

#### 3.3.2 Personnel with AWS Access

Administrators with access to the KMS can decrypt any stored private key, disable or delete the CMK, or modify IAM policies.

| Threat | Impact | Required Mitigation |
|---|---|---|
| CMK decrypt access | Recovery of all private key material | IAM scoped to minimum principals; CloudTrail on all KMS operations |
| CMK deletion/disable | All private keys irrecoverable | Multi-party approval for CMK policy changes and deletion |
| IAM policy modification | Grant unauthorized decrypt access | CloudTrail monitoring; IAM change alerts |

#### 3.3.3 Personnel with Application Access

Soulverse operators with backend application access can trigger CREATE, UPDATE, KEY ROTATE, or DEACTIVATE for any DID without the subject's knowledge.

| Threat | Impact | Required Mitigation |
|---|---|---|
| Unauthorized DID mutation | DID state changed without subject consent | Audit logging with operator identity on all lifecycle operations |
| Transient key access | Plaintext key exposure during signing | Privileged access management; key decrypt operations logged and monitored |

---

### 4.4 Integrity Protection and Update Authentication

- **Current v1 implementation:** Mutating operations are authenticated at the application layer via backend API access control.
- **What is NOT currently implemented:** Signature verification by the backend against the DID Document's verificationMethod before accepting mutations; client-side signing of mutation requests.
- **Planned mitigation:** The non-custodial model will require all mutation requests to include an Ed25519 signature over a canonical payload. This will be mandatory in the v2 specification.

---

### 5.5 Authentication Characteristics

#### 5.5.1 Cryptographic Primitives

The did:soul method uses Ed25519 for key generation: 128-bit security level, deterministic signatures, fast verification, resistance to small-subgroup attacks.

#### 5.5.2 Key Custodianship (v1) - Disclosure

In the current v1 architecture, the private key is generated in the Soulverse backend, encrypted via KMS, and stored in DB. This is a custodial model. Security implications that MUST be disclosed to users:

- Soulverse has the technical ability to perform any operation on any DID it manages
- Compromise of Soulverse's account could expose all private key material
- The DID subject does not independently hold or control their private key
- The DID subject cannot independently prove they authorised a given state change

#### 5.5.3 Planned Non-Custodial Model

The target architecture (roadmap, 2027) will move key generation and storage to the user's device. The backend will verify signatures without ever holding private key material.

---

### 5.6 Unique Assignment of DIDs

did:soul identifiers are UUID v4 values: 122 bits of randomness, collision probability of approximately 1 in 5.3 x 10^36. Uniqueness is enforced by the Soulverse registry via a database unique constraint.

- **Limitation:** UUID-based identifiers are not self-certifying. A verifier cannot confirm identifier uniqueness without querying the Soulverse registry.

---

### 5.7 Endpoint Authentication

The did:soul resolution endpoint is the Soulverse backend API, accessed over HTTPS. Implementers SHOULD pin the backend endpoint's TLS certificate or use certificate transparency monitoring.

---

### 5.8 Cryptographic Protection Mechanisms

| Data | Protection | Susceptible To |
|---|---|---|
| DID Document (IPFS) | Content-addressed integrity via CID | Available only if pinned; registry compromise can substitute CID |
| Private key (at rest) | AES-256 encryption via KMS | KMS account compromise; CMK rotation errors |
| Private key (in memory) | Transient only during key generation | Memory dump during generation window |
| Registry records (DB) | TLS in transit; DB access controls at rest | Unauthorised DB write access; insider modification |
| Resolution responses (HTTP) | TLS in transit | Transport interception; no method-layer signing in v1 |

---

### 5.9 Availability and Recovery

The did:soul registry is the single source of truth for DID-to-CID mappings, version history, and deactivation status.

Requirements for production deployments:

- Database backups MUST be performed at a frequency appropriate to the deployment's RPO (Recovery Point Objective)
- A documented disaster recovery procedure MUST exist, including RTO (Recovery Time Objective) targets
- Backup integrity MUST be verified periodically through restoration testing
- IPFS CIDs MUST be pinned to at least one additional IPFS node outside the primary infrastructure

- **Current implementation note:** Availability guarantees, backup frequency, RPO, and RTO for the Soulverse-operated registry are not yet formally defined. These MUST be documented before production deployment.

---

### 5.10 Secret Data

| Secret Data | Storage | Protection Requirements |
|---|---|---|
| Ed25519 private key (plaintext) | Transient — backend memory only | MUST NOT be logged, persisted to disk, or transmitted in plaintext |
| KMS CMK | KMS service | Protected by IAM policies. Annual rotation minimum recommended |
| Encrypted private key ciphertext | Database | Database access controls. Compromise + CMK access = full key recovery |
| API credentials | Secrets management | MUST NOT be hardcoded in driver configuration or source code |

---

### 5.11 DID Document Signatures

did:soul v1 does not implement cryptographic signatures on DID Documents. Document integrity is enforced by IPFS content addressing (CID verification) rather than cryptographic proofs embedded in the document.

- Implementation of embedded DID Document proofs (e.g. Ed25519Signature2020 or DataIntegrityProof) is under evaluation for v2.

---

### 5.12 Residual Risks

| Risk | Severity | Current Status | Mitigation Path |
|---|---|---|---|
| Soulverse infrastructure availability | High | Single point of failure for resolution | Distributed resolver nodes (Q4 2026) |
| KMS account compromise | Critical | All private keys recoverable | Multi-region KMS, HSM evaluation |
| Registry database compromise | High | CID mappings could be tampered | DB audit logging, write access controls |
| No signature verification on mutations | Critical | Backend is sole authority for writes | Non-custodial signing (2027) |
| No signed resolution responses | Medium | Replay/substitution undetectable at method layer | Response signing (v2) |
| Custodial key model | High | Soulverse acts as key custodian | User-device key storage (2027) |
| UUID not self-certifying | Medium | Uniqueness depends on registry | Public-key-derived identifiers (Q4 2026) |
| Insider threat (DB admin) | High | Direct registry write access possible | IAM separation, pgAudit, change approvals |
| Insider threat | Critical | CMK access enables key recovery | CloudTrail, multi-party approval |
| Registry availability/recovery | High | No formal RPO/RTO defined | Backup policy, DR documentation |
| Plaintext key in memory window | Low | Brief exposure during generation | Secure memory handling, code audit |

---

## 6. Privacy Considerations

This section follows RFC6973 Section 5 as required by W3C DID 1.1 Section 7.4.

---

### 6.1 Surveillance

The Soulverse backend processes all DID resolution requests, creating a centralised record of who resolved which DID, when, and from what network address.

- **Mitigation:** Resolution logs SHOULD be minimised. Log retention policies MUST be defined and enforced. Distributed resolver architecture will reduce centralised surveillance capability.

---

### 6.2 Stored Data Compromise

DID Documents on IPFS are public and persistent. While they contain no PII, the combination of a persistent identifier with service endpoints may enable correlation. KMS-encrypted private keys in DB are a high-value target.

- **Mitigation:** Separation of key storage from document storage (IPFS) limits blast radius. KMS CMK access should be tightly scoped via IAM policies.

---

### 6.3 Unsolicited Traffic

Publication of service endpoints in a DID Document may invite unsolicited contact. DID controllers SHOULD only publish endpoints prepared to handle public traffic. The service array is optional.

---

### 6.4 Misattribution

did:soul v1 uses a custodial key model. Actions taken using a DID may be attributed to the DID subject when performed by Soulverse on their behalf.

- **Mitigation:** This risk is inherent to the custodial model and will be substantially reduced with the non-custodial architecture. Until then, Soulverse SHOULD maintain comprehensive audit logs.

---

### 6.5 Correlation

A persistent DID (did:soul:<uuid>) is by design a stable, long-lived identifier enabling correlation across all verifiers and services. DID controllers may create multiple DIDs for different relationships, rotate keys periodically, or deactivate and reissue DIDs when unlinkability is required.

---

### 6.6 Identification

DID Documents contain an Ed25519 public key, not directly linkable to a real-world identity. However, the DID itself is a globally unique, persistent identifier usable as a tracking vector. Selective disclosure and zero-knowledge proof techniques at the credential layer can reduce this risk.

---

### 6.7 Secondary Use

Soulverse holds resolution logs and registry data that could be used beyond the original intent. Soulverse MUST publish a data use policy. Users SHOULD be informed before DID creation.

---

### 6.8 Disclosure

Verifiers who resolve a did:soul DID disclose to Soulverse that a particular verifier is interested in a particular DID at a particular time. Distributed resolver architecture and verifier-side caching will reduce this exposure.
