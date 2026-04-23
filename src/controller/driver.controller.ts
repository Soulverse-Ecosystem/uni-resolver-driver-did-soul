import { Controller, Get, Param, Query, Header } from '@nestjs/common';
import { DriverService } from '../service/driver.service';

@Controller('1.0/identifiers')
export class DriverController {
  constructor(private readonly service: DriverService) {}

  @Get(':did')
  @Header('Content-Type', 'application/did+json')
  async resolve(
    @Param('did') did: string,
    @Query('version') version?: string,
    @Query('versionId') versionId?: string,
  ) {
    return this.service.resolve({
      did,
      version: version ?? versionId,
    });
  }
}
