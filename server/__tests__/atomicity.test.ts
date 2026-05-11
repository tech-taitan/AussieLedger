/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'vitest';

describe('Transactional whole-collection replace (DEP-02)', () => {
  it.todo('rolls back PUT /api/entities on insert error (e.g. unique constraint)');
  it.todo('rolls back PUT /api/entries on child-row error');
  it.todo('POST /api/import wraps all four replaces in a single outer transaction');
  it.todo('partial state never visible on failure');
});
