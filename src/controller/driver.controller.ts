import {
  Controller,
  Get,
  Header,
  HttpStatus,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import {
  DID_RESOLUTION_CONTENT_TYPE,
  type ResolveOptions,
} from '@soulverse/did-soul-core';
import type { Response } from 'express';
import { ResolverService } from '../resolver/resolver.service';

/** The Universal Resolver driver binding. */
@Controller('1.0/identifiers')
export class DriverController {
  constructor(private readonly resolver: ResolverService) {}

  @Get(':did')
  @Header('Cache-Control', 'no-store')
  async resolve(
    @Param('did') did: string,
    @Res() response: Response,
    @Query('versionId') versionId?: string,
    @Query('versionTime') versionTime?: string,
    @Query('versionNumber') versionNumber?: string,
  ): Promise<void> {
    const options: ResolveOptions = {};
    if (versionId !== undefined) options.versionId = versionId;
    if (versionTime !== undefined) options.versionTime = versionTime;
    if (versionNumber !== undefined)
      options.versionNumber = Number(versionNumber);

    const result = await this.resolver.resolve(did, options);
    const error = result.didResolutionMetadata.error;

    // The DID Resolution binding maps failures onto status codes. The previous driver
    // answered 200 for everything, so a caller had to read the body to notice a failure.
    const status =
      error === undefined
        ? HttpStatus.OK
        : error === 'notFound'
          ? HttpStatus.NOT_FOUND
          : error === 'deactivated'
            ? HttpStatus.GONE
            : error === 'internalError' || error === 'timeout'
              ? HttpStatus.INTERNAL_SERVER_ERROR
              : HttpStatus.BAD_REQUEST;

    response.status(status).type(DID_RESOLUTION_CONTENT_TYPE).send(result);
  }
}
