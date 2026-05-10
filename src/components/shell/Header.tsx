/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Menu, Plus } from 'lucide-react';
import type { View, Entity } from '../../types';

interface HeaderProps {
  view: View;
  entities: Entity[];
  activeEntityId: string | null;
  setActiveEntityId: (id: string | null) => void;
  setView: (v: View) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setShowNewJournal: (show: boolean) => void;
}

export function Header({
  view,
  entities,
  activeEntityId,
  setActiveEntityId,
  setView,
  setIsSidebarOpen,
  setShowNewJournal,
}: HeaderProps) {
  return (
    <header className="h-16 border-b border-[var(--line-strong)] bg-white flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-md"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider hidden sm:block">
            {view.replace('-', ' ')}
          </h2>
          {view !== 'master-dashboard' && (
            <>
              <span className="text-gray-300 hidden sm:block">/</span>
              <select
                value={activeEntityId || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setActiveEntityId(e.target.value);
                    setView('dashboard');
                  } else {
                    setActiveEntityId(null);
                    setView('master-dashboard');
                  }
                }}
                className="text-sm font-bold bg-transparent border-none focus:ring-0 cursor-pointer hover:bg-gray-50 p-1 rounded outline-none"
              >
                <option value="" disabled>
                  Select Entity
                </option>
                {entities
                  .filter((ent) => ent.status !== 'Archived')
                  .map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
              </select>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {activeEntityId && view !== 'master-dashboard' && (
          <button
            onClick={() => setShowNewJournal(true)}
            className="bg-[var(--ink)] text-white px-3 lg:px-4 py-2 text-xs lg:text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity rounded-sm"
          >
            <Plus size={16} /> <span className="hidden sm:inline">New Entry</span>
          </button>
        )}
      </div>
    </header>
  );
}
