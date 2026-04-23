import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DriverController } from './controller/driver.controller';
import { DriverService } from './service/driver.service';
import { BackendUrlService } from './constant/constant';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HttpModule],
  controllers: [DriverController],
  providers: [DriverService, BackendUrlService],
})
export class AppModule {}
