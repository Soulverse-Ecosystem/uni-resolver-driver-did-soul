import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DID_RESOLUTION_CONTENT_TYPE,
  parseDidLog,
  resolveFromLog,
  verifyLog,
  type DidLogEntry,
  type ResolveOptions,
} from '@soulverse-sdk/did-soul-core';
import type {
  DidResolutionResult,
  ResolutionError,
} from '../interface/interface';

/** did:soul:{scid}, where scid is 46 base58 characters. Nothing may follow it. */
const DID_SOUL = /^did:soul:[1-9A-HJ-NP-Za-km-z]{46}$/;

@Injectable()
export class ResolverService {
  private readonly logger = new Logger(ResolverService.name);
  private readonly registryUrl: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.registryUrl = (config.get<string>('SOUL_REGISTRY_URL') ?? '').replace(
      /\/+$/,
      '',
    );
    this.timeoutMs = Number(
      config.get<string>('SOUL_REGISTRY_TIMEOUT_MS') ?? 10000,
    );
  }

  /**
   * Fetches the raw log and verifies it here. The registry is a transport, not an
   * authority: a did:soul is a hash of its own genesis entry, so trusting a resolution
   * result we did not check would discard the only property the method has.
   */
  async resolve(
    did: string,
    options: ResolveOptions,
  ): Promise<DidResolutionResult> {
    if (!DID_SOUL.test(did)) {
      return this.failure('invalidDid');
    }

    let raw: string;
    try {
      const response = await fetch(`${this.registryUrl}/dids/${did}/log`, {
        headers: { Accept: 'application/jsonl' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (response.status === 404) {
        return this.failure('notFound');
      }
      if (!response.ok) {
        this.logger.warn(
          `Registry answered HTTP ${response.status} for ${did}`,
        );
        return this.failure('internalError');
      }
      raw = await response.text();
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      this.logger.warn(
        `Fetching ${did} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return this.failure(timedOut ? 'timeout' : 'internalError');
    }

    let log: DidLogEntry[];
    try {
      log = parseDidLog(raw);
      // Throws on a broken hash chain, an unauthorized proof, or a forged SCID.
      verifyLog(log, did);
    } catch (error) {
      this.logger.warn(
        `Refusing ${did}: ${error instanceof Error ? error.message : 'log did not verify'}`,
      );
      return this.failure('invalidDidDocument');
    }

    try {
      const result = resolveFromLog(log, did, options);
      return {
        didDocument: result.didDocument,
        didDocumentMetadata: result.didDocumentMetadata,
        didResolutionMetadata: {
          ...result.didResolutionMetadata,
          contentType: DID_RESOLUTION_CONTENT_TYPE,
        },
      } as DidResolutionResult;
    } catch (error) {
      this.logger.warn(
        `Resolving ${did} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return this.failure('notFound');
    }
  }

  private failure(error: ResolutionError): DidResolutionResult {
    return {
      didDocument: null,
      didDocumentMetadata: {},
      didResolutionMetadata: {
        error,
        contentType: DID_RESOLUTION_CONTENT_TYPE,
      },
    };
  }
}
