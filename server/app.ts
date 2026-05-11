/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Factory only — no app.listen() here so this module can be imported
 * by tests (server/__tests__/*.test.ts) and the production entry point
 * (server/index.ts) without side-effects.
 */
import express from 'express';
import { loadEnv } from './env.js';
import { openDatabase } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { healthRouter } from './routes/health.js';
import { entitiesRouter } from './routes/entities.js';
import { accountsRouter } from './routes/accounts.js';
import { entriesRouter } from './routes/entries.js';
import { auditRouter } from './routes/audit.js';
import { exportImportRouter } from './routes/exportImport.js';
import { aiRouter } from './routes/ai.js';

export function buildApp(env = loadEnv()) {
  const db = openDatabase(env.dbPath);
  runMigrations(db);

  const app = express();

  app.use('/api', healthRouter(env.aiEnabled));
  app.use('/api', entitiesRouter(db));
  app.use('/api', accountsRouter(db));
  app.use('/api', entriesRouter(db));
  app.use('/api', auditRouter(db));
  app.use('/api', exportImportRouter(db));
  app.use('/api', aiRouter(env.geminiApiKey));

  return { app, env, db };
}
