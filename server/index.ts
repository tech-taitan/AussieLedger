/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Production server entry point. `tsx watch` (dev:server) and
 * `node server/dist/server/index.js` (start:server) both run this.
 */
import { buildApp } from './app.js';

const { app, env } = buildApp();
app.listen(env.port, env.host, () => {
  // eslint-disable-next-line no-console
  console.log(`AussieLedger server listening on http://${env.host}:${env.port}, DB at ${env.dbPath}, AI ${env.aiEnabled ? 'enabled' : 'disabled'}`);
});
