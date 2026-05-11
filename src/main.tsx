/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { MigrationError } from './components/MigrationError';
import { initAdapter } from './storage';
import './index.css';

const root = createRoot(document.getElementById('root')!);

initAdapter()
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((err: unknown) => {
    const message =
      err instanceof Error ? err.message : 'Adapter initialisation failed';
    root.render(
      <StrictMode>
        <MigrationError message={message} />
      </StrictMode>,
    );
  });
