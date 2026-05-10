/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, LayoutDashboard, BookOpen, FileSpreadsheet, Menu } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { View } from '../../types';

interface BottomNavProps {
  view: View;
  setView: (v: View) => void;
  setActiveEntityId: (id: string | null) => void;
  setIsSidebarOpen: (open: boolean) => void;
  activeEntityId: string | null;
}

function MobileNavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 transition-colors',
        active ? 'text-blue-600' : 'text-gray-500',
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase">{label}</span>
    </button>
  );
}

export function BottomNav({
  view,
  setView,
  setActiveEntityId,
  setIsSidebarOpen,
  activeEntityId,
}: BottomNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[var(--line-strong)] h-16 flex items-center justify-around px-2 z-40">
      <MobileNavButton
        active={view === 'master-dashboard'}
        onClick={() => {
          setView('master-dashboard');
          setActiveEntityId(null);
        }}
        icon={<Layers size={20} />}
        label="Master"
      />
      {activeEntityId && (
        <>
          <MobileNavButton
            active={view === 'dashboard'}
            onClick={() => setView('dashboard')}
            icon={<LayoutDashboard size={20} />}
            label="Entity"
          />
          <MobileNavButton
            active={view === 'journals'}
            onClick={() => setView('journals')}
            icon={<BookOpen size={20} />}
            label="Journals"
          />
          <MobileNavButton
            active={view === 'trial-balance'}
            onClick={() => setView('trial-balance')}
            icon={<FileSpreadsheet size={20} />}
            label="TB"
          />
        </>
      )}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="flex flex-col items-center gap-1 text-gray-500"
      >
        <Menu size={20} />
        <span className="text-[10px] font-bold uppercase">More</span>
      </button>
    </nav>
  );
}
