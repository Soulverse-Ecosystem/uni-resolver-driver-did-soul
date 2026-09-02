# uni-resolver-driver-did-soul

A [Universal Resolver](https://github.com/decentralized-identity/universal-resolver) driver
for `did:soul`.

```
GET /1.0/identifiers/did:soul:QmcXdvmawyuog6BurtvYTYqF1SdiU2BAR8fGZuqw3X193i
```

## It verifies, it does not proxy

A `did:soul` is an append-only, hash-chained log of signed entries, and the identifier is a
hash of its own genesis entry. So this driver fetches the raw log from the registry and
verifies it here, in process:

1. `GET {SOUL_REGISTRY_URL}/dids/{did}/log`
2. `verifyLog(log, did)` recomputes the SCID, replays the hash chain and checks every proof
3. `resolveFromLog(log, did, options)` produces the document

The registry is a transport, not an authority. A driver that returned whatever the registry
said would discard the only property the method has, and anyone who could MITM the registry
would control every key the Universal Resolver hands out. Tampering changes the genesis
hash, so the SCID stops matching its own content and resolution fails with
`invalidDidDocument`.

Verification lives in `@soulverse/did-soul-core`, the same code the registry runs. One
implementation, two callers.

## Configuration

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `SOUL_REGISTRY_URL` | yes | none | Base URL of the did:soul registry. No default on purpose: a driver pointed at nothing fails at boot rather than building requests against `undefined`. |
| `SOUL_REGISTRY_TIMEOUT_MS` | no | `10000` | Per request timeout. |
| `PORT` | no | `8080` | |

## Responses

A [DID Resolution](https://w3c-ccg.github.io/did-resolution/) result, with the status code
matching the outcome rather than always 200.

| Outcome | Status | `didResolutionMetadata.error` |
| --- | --- | --- |
| Resolved | 200 | none |
| Not a well formed did:soul | 400 | `invalidDid` |
| Log did not verify | 400 | `invalidDidDocument` |
| No such DID | 404 | `notFound` |
| Deactivated | 410 | `deactivated` |
| Registry unreachable or slow | 500 | `internalError`, `timeout` |

Historical versions work through `?versionId=`, `?versionNumber=` or `?versionTime=`.

## Run it

```sh
npm install
npm run build
SOUL_REGISTRY_URL=https://did-stage.soulverse.us node dist/main
```

```sh
npm test
```

## Identifier format

`did:soul:{scid}`, where the SCID is 46 base58 characters. There is no domain and no path.
Anything else is rejected before a network call is made.

## Method documentation

- [`docs/scheme.md`](docs/scheme.md) method specification
- [`docs/privacy-security.md`](docs/privacy-security.md) security and privacy considerations
- [`docs/PROPOSAL-did-soul.md`](docs/PROPOSAL-did-soul.md) DIF method recommendation proposal
- [`docs/white-paper.md`](docs/white-paper.md) overview
