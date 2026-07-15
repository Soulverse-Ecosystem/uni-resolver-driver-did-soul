# Universal Resolver Driver: did:soul

This is a [Universal Resolver](https://github.com/decentralized-identity/universal-resolver) driver for **did:soul** identifiers.

## Specifications

- [Decentralized Identifiers](https://www.w3.org/TR/did-core/)
- [DID Method Specification](src/docs/scheme.md)

## Example DIDs

```
did:soul:a51eaff1-9bc4-4a76-9be7-1eaaaa4b1b26
did:soul:d9328da5-4a94-41d9-900a-a04dd243e9d9
```

## Build and Run (Docker)

```bash
# Build the Docker image
docker build -f ./Dockerfile . -t universalresolver/driver-did-soul

# Run the container
docker run -p 8080:8080 universalresolver/driver-did-soul

# Test the driver
curl -X GET http://localhost:8080/1.0/identifiers/did:soul:<identifier>
```

## Build and Run (Native)

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Driver Metadata

### Resolution Metadata

| Field | Value |
|---|---|
| `contentType` | `application/did+json` |
| `pattern` | DID must begin with `did:soul:` |

### Supported Query Parameters

| Parameter | Alias | Description |
|---|---|---|
| `version` | `versionId` | Resolve a specific version of the DID document |

## Method-Specific Information

The `did:soul` method is a DID method developed by the [Soulverse](https://www.soulverse.world/) ecosystem.

### Key Characteristics

- **Authority:** Soulverse
- **Resolution:** Delegates to the Soulverse backend API
- **Versioning:** Supports historical DID document resolution via `version` / `versionId` query parameters
- **Deactivation:** Tracks and surfaces `deactivated` status in `didDocumentMetadata`

### DID Syntax

```
did:soul:<soul-specific-id>
```

Where `<soul-specific-id>` is an identifier managed by the Soulverse platform.

## Resolution Endpoint

The driver proxies resolution requests to:

```
GET {SOULVERSE_BACKEND_ENDPOINT}/dids/{did}
GET {SOULVERSE_BACKEND_ENDPOINT}/dids/{did}?version={version}
```

## Architecture

```
Universal Resolver → Driver → Soulverse Backend API → DID Document
```

### Source Components

| File | Role |
|---|---|
| `src/main.ts` | Application entry point; binds NestJS app to the configured port |
| `src/module.ts` | Root NestJS module; wires together HTTP client, config, controller, and services |
| `src/controller/driver.controller.ts` | HTTP handler for `GET /1.0/identifiers/:did` |
| `src/service/driver.service.ts` | Core resolution logic; validates the DID prefix and delegates to the backend |
| `src/constant/constant.ts` | `BackendUrlService`; builds the backend URL (with optional version parameter) |
| `src/dto/driver.dto.ts` | `ResolveDto`; typed input validation for DID and version |
| `src/interface/interface.ts` | TypeScript interfaces for `DidResolutionResult` and `DidDocument` |
| `src/utils/error-handling.ts` | Maps Axios HTTP errors to W3C DID error types |
| `Dockerfile` | Container configuration for deployment |

## Response Format

### Successful Resolution

```json
{
  "didDocument": {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1"
    ],
    "id": "did:soul:a51eaff1-9bc4-4a76-9be7-1eaaaa4b1b26",
    "controller": "did:soul:a51eaff1-9bc4-4a76-9be7-1eaaaa4b1b26",
    "verificationMethod": [
      {
        "id": "did:soul:a51eaff1-9bc4-4a76-9be7-1eaaaa4b1b26#keys-1",
        "type": "Ed25519VerificationKey2020",
        "controller": "did:soul:a51eaff1-9bc4-4a76-9be7-1eaaaa4b1b26",
        "publicKeyMultibase": "z6Mkn8qNkxijhq1av1VVphNFe4ckdb53kh3RTYjjbJTigia1"
      }
    ],
    "authentication": [
      "did:soul:a51eaff1-9bc4-4a76-9be7-1eaaaa4b1b26#keys-1"
    ],
    "assertionMethod": [
      "did:soul:a51eaff1-9bc4-4a76-9be7-1eaaaa4b1b26#keys-1"
    ],
    "created": "2026-06-26T10:17:54Z",
    "updated": "2026-06-26T10:17:54Z"
  },
  "didResolutionMetadata": {
    "driverDuration": 8081,
    "contentType": "application/did",
    "pattern": "^(did:soul:.+)$",
    "driverUrl": "http://driver-did-soul:8080/1.0/identifiers/$1",
    "duration": 8082,
    "did": {
      "didString": "did:soul:a51eaff1-9bc4-4a76-9be7-1eaaaa4b1b26",
      "methodSpecificId": "a51eaff1-9bc4-4a76-9be7-1eaaaa4b1b26",
      "method": "soul"
    }
  },
  "didDocumentMetadata": {
    "versionId": "1",
    "deactivated": false,
    "updated": "2026-06-26T10:17:55Z"
  }
}
```

### Error Responses

| Error | Cause |
|---|---|
| `invalidDid` | DID does not start with `did:soul:`, or the backend returned HTTP 400 |
| `notFound` | DID was not found in the registry (backend returned HTTP 404) |
| `timeout` | The backend request timed out (`ECONNABORTED` / `ETIMEDOUT`) |
| `internalError` | Any other unexpected error |

```json
{
  "didDocument": null,
  "didDocumentMetadata": {},
  "didResolutionMetadata": {
    "error": "notFound"
  }
}
```

## Integration Testing

```bash
# Start the driver
npm run start:dev

# Resolve a DID
curl -X GET http://localhost:4000/1.0/identifiers/did:soul:<identifier>

# Resolve a specific version
curl -X GET "http://localhost:4000/1.0/identifiers/did:soul:<identifier>?version=1"
```

## Additional Resources

- [W3C DID Core Specification](https://www.w3.org/TR/did-core/)
- [Universal Resolver](https://github.com/decentralized-identity/universal-resolver)
