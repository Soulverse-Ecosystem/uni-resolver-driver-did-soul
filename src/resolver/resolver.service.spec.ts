import { ConfigService } from '@nestjs/config';
import {
  Ed25519Signer,
  createDid,
  didKeyVerificationMethod,
  encodePublicKeyMultikey,
  generateEd25519KeyPair,
  serializeDidLog,
  type DidLogEntry,
} from '@soulverse-sdk/did-soul-core';
import { ResolverService } from './resolver.service';

const config = {
  get: (key: string): string | undefined =>
    key === 'SOUL_REGISTRY_URL' ? 'http://registry.test' : undefined,
} as ConfigService;

function serve(body: string, status = 200): void {
  globalThis.fetch = () => Promise.resolve(new Response(body, { status }));
}

async function genesis(): Promise<{ did: string; entry: DidLogEntry }> {
  const keyPair = generateEd25519KeyPair();
  const multikey = encodePublicKeyMultikey(keyPair.publicKey);
  const created = await createDid({
    updateKeys: [multikey],
    signer: new Ed25519Signer(
      didKeyVerificationMethod(multikey),
      keyPair.privateKey,
    ),
  });
  return { did: created.did, entry: created.entry };
}

describe('ResolverService', () => {
  let service: ResolverService;
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    service = new ResolverService(config);
  });
  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  it('resolves a log that verifies', async () => {
    const { did, entry } = await genesis();
    serve(serializeDidLog([entry]));

    const result = await service.resolve(did, {});

    expect(result.didResolutionMetadata.error).toBeUndefined();
    expect(result.didDocument?.id).toBe(did);
  });

  // The registry is a transport, not an authority. A tampered document changes the
  // genesis hash, so the SCID no longer matches its own content.
  it('refuses a document the registry tampered with', async () => {
    const { did, entry } = await genesis();
    const forged = structuredClone(entry);
    const methods = forged.state.verificationMethod as {
      publicKeyMultibase: string;
    }[];
    methods[0].publicKeyMultibase =
      'z6MkrzzAttackerKeyrzzvqn5uxau3PHHoaRtL3onJybqmL5iA';
    serve(serializeDidLog([forged]));

    const result = await service.resolve(did, {});

    expect(result.didResolutionMetadata.error).toBe('invalidDidDocument');
    expect(result.didDocument).toBeNull();
  });

  it('refuses a log served under a different did', async () => {
    const mine = await genesis();
    const theirs = await genesis();
    serve(serializeDidLog([theirs.entry]));

    const result = await service.resolve(mine.did, {});

    expect(result.didResolutionMetadata.error).toBe('invalidDidDocument');
  });

  it.each([
    ['did:soul:tooshort', 'invalidDid'],
    ['did:soul:', 'invalidDid'],
    ['did:web:example.com', 'invalidDid'],
    ['did:soul:../../admin', 'invalidDid'],
  ])('rejects %s before any network call', async (did, expected) => {
    globalThis.fetch = () => {
      throw new Error('must not reach the registry');
    };

    const result = await service.resolve(did, {});

    expect(result.didResolutionMetadata.error).toBe(expected);
  });

  it('maps a missing did to notFound', async () => {
    const { did } = await genesis();
    serve('', 404);

    const result = await service.resolve(did, {});

    expect(result.didResolutionMetadata.error).toBe('notFound');
  });
});
