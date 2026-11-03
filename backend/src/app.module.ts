import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './modules/users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ConfigModule } from '@nestjs/config';
import { geminiCallModule } from './modules/gemini/geminiCall.module.js';
import { TtsModule } from './modules/tts/tts.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,         
      envFilePath: '.env',     
    })
      ,PrismaModule
      ,UsersModule
      ,geminiCallModule
      ,TtsModule
    ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}
