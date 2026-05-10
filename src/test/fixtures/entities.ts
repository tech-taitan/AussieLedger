/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Entity } from '../../types';

export const sampleEntity: Entity = {
  _v: 1,
  id: 'test-ent-1',
  name: 'Sample Pty Ltd',
  type: 'Company',
  registrationNumber: '11 111 111 111',
  status: 'Active',
};

export const sampleTrust: Entity = {
  _v: 1,
  id: 'test-ent-2',
  name: 'Sample Family Trust',
  type: 'Trust',
  registrationNumber: '22 222 222 222',
  status: 'Active',
};

export const sampleEntities: Entity[] = [sampleEntity, sampleTrust];
