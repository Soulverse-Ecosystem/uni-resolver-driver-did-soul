import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BackendUrlService } from '../constant/constant';
import { ResolveDto } from '../dto/driver.dto';
import { DidResolutionResult } from '../interface/interface';
import { mapAxiosErrorToDidError } from 'src/utils/error-handling';

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
      const url = this.backendUrl.getResolveDidUrl(payload);
      const response = await firstValueFrom(this.httpService.get(url));

      const data = response.data as DidResolutionResult;

      return {
        didDocument: data.didDocument,
        didDocumentMetadata: {
          versionId: data?.didDocumentMetadata?.versionId,
          deactivated: data?.didDocumentMetadata?.deactivated ?? false,
          updated: data?.didDocumentMetadata?.updated,
        },
        didResolutionMetadata: {
          contentType: 'application/did+json',
        },
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
