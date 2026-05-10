/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { DisclaimerFooter } from '../DisclaimerFooter';
import type { View, Entity } from '../../types';

interface MainLayoutProps {
  view: View;
  setView: (v: View) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  activeEntityId: string | null;
  setActiveEntityId: (id: string | null) => void;
  entities: Entity[];
  setShowNewJournal: (show: boolean) => void;
  children: React.ReactNode;
}

export function MainLayout({
  view,
  setView,
  isSidebarOpen,
  setIsSidebarOpen,
  activeEntityId,
  setActiveEntityId,
  entities,
  setShowNewJournal,
  children,
}: MainLayoutProps) {
  const activeEntity = entities.find((e) => e.id === activeEntityId);

  return (
    <div className="min-h-screen flex bg-[var(--bg)] relative">
      <Sidebar
        view={view}
        setView={setView}
        activeEntity={activeEntity}
        entities={entities}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        setActiveEntityId={setActiveEntityId}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0">
        <Header
          view={view}
          entities={entities}
          activeEntityId={activeEntityId}
          setActiveEntityId={setActiveEntityId}
          setView={setView}
          setIsSidebarOpen={setIsSidebarOpen}
          setShowNewJournal={setShowNewJournal}
        />

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</div>

        <DisclaimerFooter />
      </main>

      <BottomNav
        view={view}
        setView={setView}
        setActiveEntityId={setActiveEntityId}
        setIsSidebarOpen={setIsSidebarOpen}
        activeEntityId={activeEntityId}
      />
    </div>
  );
}
