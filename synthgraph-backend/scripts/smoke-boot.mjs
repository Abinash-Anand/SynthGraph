// Boots the built backend (dist/main.js) and checks that it really starts.
//
// Why this exists: vitest runs the TypeScript sources and never applies the
// @nestjs/swagger CLI plugin (nest-cli.json), which only `nest build` does. So a
// problem in the generated Swagger schema, for example an inline object type on a
// TypeORM entity property, passes every unit and e2e test and then crashes the
// real server at startup ("A circular dependency has been detected ..."). Only
// starting the built app shows it.
//
// What it checks, with the same environment the app would have (DATABASE_URL,
// JWT_SECRET):
//   1. the process starts and keeps running;
//   2. GET /docs-json returns an OpenAPI document with paths and schemas, which
//      proves Swagger generation completed over every controller and DTO;
//   3. an unauthenticated GET /auth/me is a 401, so the guards are wired.
// Then it stops the process. On any failure it prints the app's own output and
// exits non-zero.
//
// Usage: npm run build && npm run smoke:boot

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';

const STARTUP_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;
const MAX_OUTPUT_CHARS = 20_000;

if (!existsSync('dist/main.js')) {
  console.error('smoke-boot: dist/main.js not found. Run `npm run build` first.');
  process.exit(2);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

const port = await freePort();
const base = `http://127.0.0.1:${port}`;

let output = '';
const remember = (chunk) => {
  output = (output + chunk).slice(-MAX_OUTPUT_CHARS);
};

const child = spawn(process.execPath, ['dist/main.js'], {
  env: {
    ...process.env,
    PORT: String(port),
    // The check is about Swagger, so it must not be switched off.
    DISABLE_API_DOCS: 'false',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.on('data', (chunk) => remember(chunk.toString()));
child.stderr.on('data', (chunk) => remember(chunk.toString()));

let exited = null;
child.once('exit', (code, signal) => {
  exited = { code, signal };
});

function stop() {
  if (exited === null) child.kill();
}

function fail(reason) {
  console.error(`smoke-boot: FAILED - ${reason}`);
  console.error('--- backend output (last part) ---');
  console.error(output.trim() || '(no output)');
  console.error('-----------------------------------');
  stop();
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDocs() {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (exited !== null) {
      fail(
        `the backend exited before it was ready (code ${exited.code}, signal ${exited.signal})`,
      );
    }
    try {
      const response = await fetch(`${base}/docs-json`);
      if (response.ok) return response;
    } catch {
      // Not listening yet.
    }
    await sleep(POLL_INTERVAL_MS);
  }
  fail(`the backend was not ready within ${STARTUP_TIMEOUT_MS / 1000}s`);
}

try {
  const docs = await waitForDocs();

  let document;
  try {
    document = await docs.json();
  } catch {
    fail('GET /docs-json did not return JSON');
  }
  const paths = Object.keys(document.paths ?? {});
  const schemas = Object.keys(document.components?.schemas ?? {});
  if (!document.openapi || paths.length === 0 || schemas.length === 0) {
    fail(
      `GET /docs-json is not a usable OpenAPI document (paths: ${paths.length}, schemas: ${schemas.length})`,
    );
  }

  const me = await fetch(`${base}/auth/me`);
  if (me.status !== 401) {
    fail(`GET /auth/me without a key returned ${me.status}, expected 401`);
  }

  if (exited !== null) fail('the backend exited right after starting');

  console.log(
    `smoke-boot: ok - started on port ${port}; OpenAPI document has ${paths.length} paths and ${schemas.length} schemas; /auth/me is guarded`,
  );
} finally {
  stop();
}
