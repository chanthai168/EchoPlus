import { Module } from '@nestjs/common';
import { TtsGateway as TtsCateciaGateway } from './sts-gateway.js';

@Module({
  providers: [TtsCateciaGateway],
})
export class TtsModule {}