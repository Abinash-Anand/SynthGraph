import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';

// A dedicated app instance (not shared with any other e2e spec file) so this
// suite's own request volume against the throttled routes can't push any
// other file's calls over the limit, and vice versa - @nestjs/throttler
// keys its buckets per (controller class, handler method, throttler name,
// IP), so even within one app instance other routes are unaffected, but a
// fresh instance also means a clean bucket to start counting from.
describe('M12 Rate limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('throttles POST /auth/login after 10 requests per minute', async () => {
    for (let i = 0; i < 10; i++) {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'rate-limit-probe@example.com', password: 'wrong' });

      // Wrong credentials (401) still count as a request - the throttle
      // guard runs before the handler, so failed auth attempts are exactly
      // what this limit exists to bound.
      expect(response.status).toBe(401);
    }

    const blocked = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'rate-limit-probe@example.com', password: 'wrong' });

    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('does not throttle GET /health at all', async () => {
    for (let i = 0; i < 15; i++) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
  });
});
