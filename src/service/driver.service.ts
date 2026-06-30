import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BackendUrlService } from '../constant/constant';
import { ResolveDto } from '../dto/driver.dto';
import { DidResolutionResult } from '../interface/interface';
import { mapAxiosErrorToDidError } from 'src/utils/error-handling';
import { initKeri, didDocumentFromKel } from '../keri/verify';

@Injectable()
export class DriverService {
  constructor(
    private readonly httpService: HttpService,
    private readonly backendUrl: BackendUrlService,
  ) {}

  async resolve(payload: ResolveDto): Promise<DidResolutionResult> {
    if (!payload?.did || !payload.did.startsWith('did:soul:')) {
      return this.buildError('invalidDid');
    }

    try {
      await initKeri();
      const url = this.backendUrl.getKelUrl(payload.did);
      const response = await firstValueFrom(this.httpService.get(url));
      const kel =
        (response.data as { kel?: Record<string, unknown>[] })?.kel ?? [];

      // The driver verifies the key event log itself; it does not trust the backend.
      const result = didDocumentFromKel(kel);
      if (!result.ok || result.did !== payload.did) {
        return this.buildError('notFound');
      }

      return {
        didDocument: result.didDocument ?? null,
        didDocumentMetadata: { deactivated: false },
        didResolutionMetadata: { contentType: 'application/did+json' },
      };
    } catch (error) {
      const mappedError = mapAxiosErrorToDidError(error);
      return this.buildError(mappedError);
    }
  }

  private buildError(error: string): DidResolutionResult {
    return {
      didDocument: null,
      didDocumentMetadata: {},
      didResolutionMetadata: { error },
    };
  }
}
