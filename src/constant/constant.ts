import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResolveDto } from '../dto/driver.dto';

@Injectable()
export class BackendUrlService {
  constructor(private readonly config: ConfigService) {}

  getResolveDidUrl(dto: ResolveDto): string {
    const backendEndpoint = this.config.get<string>(
      'SOULVERSE_BACKEND_ENDPOINT',
    );

    if (dto.version !== undefined && dto.version !== null) {
      return `${backendEndpoint}/dids/${dto.did}?version=${dto.version}`;
    }

    return `${backendEndpoint}/dids/${dto.did}`;
  }
}
