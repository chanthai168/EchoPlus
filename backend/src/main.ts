import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder,SwaggerModule } from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import { AllExceptionsFilter } from './common/filters/global-exception.filter.js';
import { resolve } from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(resolve(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  // allow all origine (work well with development phase)
  app.enableCors();

  // Enable ValidationPips - without this DTO decorator do nothing!
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:true,                  // strips properties that don't have decorator 
      forbidNonWhitelisted:true,       // throw error if extra property are sent. 
      transform:true,                  // automatically transform payload to DTO instance 
      transformOptions:{
        enableImplicitConversion:true, // automatically convert type base on typescript type declare on DTO properties - usefull for query params 
      },

      // Only for validation error other thrown exception is ignored 
      exceptionFactory: (errors: ValidationError[]) => {
        // Pass raw error to filter 
        return new BadRequestException({
          message: 'Validation failed',
          errorCode: 'VALIDATION_ERROR',
          error: errors,
        });
      }
    })
  )

  // Register ValidationExceptionFilter
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
  .setTitle("My API")
  .setDescription("API document for my NestJS project")
  .setVersion("1.0")
  .addTag("user")
  .build();

  const document = SwaggerModule.createDocument(app,config);
  SwaggerModule.setup('api',app,document);

  const PORT = process.env.PORT ?? 8000;
  console.log('App listen on port: ' + PORT);
  await app.listen(PORT);
}
bootstrap();
