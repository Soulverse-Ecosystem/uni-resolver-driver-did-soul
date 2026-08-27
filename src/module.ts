import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { DriverController } from './controller/driver.controller';
import { ResolverService } from './resolver/resolver.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(8080),
        // No default: a driver pointed at nothing should fail at boot, not build
        // requests against the string "undefined".
        SOUL_REGISTRY_URL: Joi.string().uri().required(),
        SOUL_REGISTRY_TIMEOUT_MS: Joi.number().default(10000),
      }),
    }),
  ],
  controllers: [DriverController],
  providers: [ResolverService],
})
export class AppModule {}
