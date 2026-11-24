import { Module } from '@nestjs/common';
import { StsGateway as TtsCateciaGateway } from './sts-gateway.js';

@Module({
  providers: [TtsCateciaGateway],
})
export class TtsModule {}