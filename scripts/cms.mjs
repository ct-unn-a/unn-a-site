import { createRequire } from 'node:module';
import { ROOT } from './build.mjs';
const require = createRequire(import.meta.url);
const { runDevServer } = require('@decap/cli/dev');

// This unauthenticated development editor is deliberately bound to loopback.
runDevServer({ host: '127.0.0.1', dir: ROOT, mode: 'fs' }).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
