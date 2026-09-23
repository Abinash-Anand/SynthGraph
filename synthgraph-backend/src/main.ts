import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

// The browser never talks to this API directly today - the first-party
// frontend's Route Handlers proxy every call server-side (see
// SYNTHGRAPH_API_URL in synthgraph-frontend), and the SDK/CLI are plain
// HTTP clients CORS doesn't apply to. This only matters for third-party,
// browser-based API consumers (a self-hoster's own dashboard, Swagger
// "try it out", etc.) - so it's opt-in via an explicit allowlist, not
// wide-open, once this runs in production.
function resolveCorsOrigin(): boolean | string[] {
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins && allowedOrigins.length > 0) {
    return allowedOrigins;
  }

  // No explicit allowlist: permissive locally (developer convenience,
  // matches this app's previous default), deny-all in production rather
  // than silently staying wide open.
  return process.env.NODE_ENV === 'production' ? false : true;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: resolveCorsOrigin() });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;

  await app.listen(port, '0.0.0.0');

  console.log(`SynthGraph backend running on port ${port}`);
}

await bootstrap();