// Independent KERI verification for the did:soul resolver. The driver fetches the
// raw key event log from the backend and verifies it here, so resolution trusts
// key math, not the backend. signify-ts is ESM-only and loaded via dynamic import.

import { DidDocument } from '../interface/interface';

export type Sad = Record<string, unknown>;

interface Qb64 {
  qb64: string;
}

interface Verfer {
  qb64: string;
  qb64b: Uint8Array;
}

interface SignifyLib {
  ready(): Promise<unknown>;
  Prefixer: new (opts: { code: string }, sad: Sad) => Qb64;
  Saider: { saidify(sad: Sad): [Qb64, Sad] };
  Diger: new (opts: Record<string, unknown>, raw: Uint8Array) => Qb64;
  Verfer: new (opts: { qb64: string }) => Verfer;
  MtrDex: { Blake3_256: string };
}

interface ResolvedDidDocument extends DidDocument {
  controller: string;
}

let S: SignifyLib | null = null;
const SIGNIFY = 'signify-ts';
const ESTABLISHMENT = new Set(['icp', 'rot', 'dip', 'drt']);

export async function initKeri(): Promise<void> {
  if (!S) {
    S = (await import(SIGNIFY)) as SignifyLib;
    await S.ready();
  }
}

function lib(): SignifyLib {
  if (!S) throw new Error('KERI not initialized');
  return S;
}

export function verifyKel(kel: Sad[]): {
  ok: boolean;
  reason: string;
  aid: string;
  currentKey: string;
} {
  const fail = (reason: string) => ({
    ok: false,
    reason,
    aid: '',
    currentKey: '',
  });
  if (!Array.isArray(kel) || kel.length === 0)
    return fail('empty key event log');
  const { Prefixer, Saider, Diger, Verfer, MtrDex } = lib();

  const icp = kel[0];
  if (icp.t !== 'icp') return fail('first event is not an inception');
  let prefix: string;
  try {
    prefix = new Prefixer({ code: MtrDex.Blake3_256 }, { ...icp, d: '', i: '' })
      .qb64;
  } catch {
    return fail('inception could not be derived');
  }
  if (prefix !== icp.i || icp.i !== icp.d)
    return fail('inception is not self-certifying');

  const aid = icp.i;
  let prior = icp;
  let currentKeys: string[] = icp.k as string[];
  for (let n = 1; n < kel.length; n++) {
    const e = kel[n];
    if (e.i !== aid)
      return fail(`event ${n} belongs to a different identifier`);
    if (parseInt(e.s as string, 16) !== n)
      return fail(`event ${n} is out of sequence`);
    if (e.p !== prior.d)
      return fail(`event ${n} does not chain to the prior event`);
    let recomputed: string;
    try {
      recomputed = Saider.saidify({ ...e })[0].qb64;
    } catch {
      return fail(`event ${n} digest could not be derived`);
    }
    if (recomputed !== e.d) return fail(`event ${n} digest is invalid`);
    if (ESTABLISHMENT.has(e.t as string)) {
      for (const k of e.k as string[]) {
        let dig: string;
        try {
          dig = new Diger({}, new Verfer({ qb64: k }).qb64b).qb64;
        } catch {
          return fail(`event ${n} has an invalid key`);
        }
        if (!(prior.n as string[]).includes(dig))
          return fail(`event ${n} key was not pre-rotation committed`);
      }
      currentKeys = e.k as string[];
    }
    prior = e;
  }
  return { ok: true, reason: 'valid', aid, currentKey: currentKeys[0] };
}

export function didDocumentFromKel(kel: Sad[]): {
  ok: boolean;
  reason: string;
  did?: string;
  didDocument?: ResolvedDidDocument;
} {
  const v = verifyKel(kel);
  if (!v.ok) return { ok: false, reason: v.reason };
  const did = `did:soul:${v.aid}`;
  return {
    ok: true,
    reason: 'valid',
    did,
    didDocument: {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: did,
      controller: did,
      verificationMethod: [
        {
          id: `${did}#key-0`,
          type: 'JsonWebKey2020',
          controller: did,
          publicKeyMultibase: v.currentKey,
        },
      ],
      authentication: [`${did}#key-0`],
      assertionMethod: [`${did}#key-0`],
    },
  };
}
