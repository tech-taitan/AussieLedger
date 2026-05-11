/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import express from 'express';

export function healthRouter(aiEnabled: boolean): express.Router {
  const router = express.Router();
  router.get('/health', (_req, res) => {
    res.json({ ok: true, version: 2, aiEnabled });
  });
  return router;
}
