/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
export interface ServerEnv {
  port: number;
  host: string;
  dbPath: string;
  geminiApiKey: string | undefined;
  aiEnabled: boolean;
}

export function loadEnv(): ServerEnv {
  const port = parseInt(process.env.PORT ?? '4000', 10);
  const host = process.env.HOST ?? '127.0.0.1';
  const dbPath = process.env.DB_PATH ?? './data/ledger.db';
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const aiEnabled = Boolean(geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY');
  return { port, host, dbPath, geminiApiKey, aiEnabled };
}
