import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

import { startTestDatabase,stopTestDatabase,getTestDatabaseUrl } from './setup/test-database.js';

describe('User (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // container setup can take 20 - 40 s for the first time
  jest.setTimeout(60_000);

  beforeAll(async () => {

    // start container + run migration 
    const databaseUrl = await startTestDatabase();

    // make sure the whole app use test database 
    process.env.DATABASE_URL = databaseUrl;

    console.log("---------- DATABASE URL(TEST) ------------");
    console.log(process.env.DATABASE_URL);

    // create nest testing module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
    await stopTestDatabase();
  });

  // clean table between each test
  beforeEach(async () => {

    // Wipe User's data and it's related 
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE "User" RESTART IDENTITY CASCADE;
    `);
  })

  it('POST -> create user', async () => {
    const response = await request(app.getHttpServer())
    .post('/users')
    .send({email:"dororo@gmail.com",name:"dororo",password:"dororo123#"})
    .expect(201);

    expect(response.body).toMatchObject(
      {email:"dororo@gmail.com",name:"dororo"}
    );

    const userInDb = await prisma.user.findUnique({where:{email:"dororo@gmail.com"}});
    expect(userInDb).toBeTruthy();
  })

});