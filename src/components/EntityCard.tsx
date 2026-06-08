/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  Square,
  Building2,
  Briefcase,
  Globe,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { Entity } from '../types';

export interface EntityCardProps {
  key?: React.Key;
  entity: Entity;
  isSelected: boolean;
  toggleSelection: (id: string, e?: React.MouseEvent) => void;
  onClick: () => void;
  rev: number;
  exp: number;
  profit: number;
}

export function EntityCard({
  entity,
  isSelected,
  toggleSelection,
  onClick,
  rev,
  exp,
  profit,
}: EntityCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={cn(
        'bg-white p-6 border transition-all cursor-pointer flex flex-col group relative overflow-hidden',
        isSelected
          ? 'border-indigo-600 ring-1 ring-indigo-600 shadow-md'
          : 'border-[var(--line-strong)] hover:border-[var(--ink)] shadow-sm hover:shadow-md',
      )}
    >
      <div
        className={cn(
          'absolute top-4 right-4 z-20 p-1 transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        onClick={(e) => toggleSelection(entity.id, e)}
      >
        {isSelected ? (
          <CheckSquare size={20} className="text-indigo-600" />
        ) : (
          <Square size={20} className="text-gray-300" />
        )}
      </div>

      <div className="flex justify-between items-start mb-4 pr-6 gap-3">
        <div className="min-w-0 flex-1">
          <h3
            title={entity.name}
            className="font-bold text-lg group-hover:text-indigo-600 transition-colors uppercase tracking-tight truncate"
          >
            {entity.name}
          </h3>
          <div className="flex gap-2 items-center mt-1 min-w-0">
            <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full shrink-0">
              {entity.type}
            </span>
            {entity.status === 'Deactivated' && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-600 rounded-full shrink-0">
                Deactivated
              </span>
            )}
            {entity.registrationNumber && (
              <span className="text-[10px] text-gray-400 font-mono truncate">
                {entity.registrationNumber}
              </span>
            )}
          </div>
        </div>
        <div className="p-2 bg-gray-50 rounded-sm shrink-0">
          {entity.type === 'Trust' ? (
            <Briefcase size={18} className="text-emerald-600" />
          ) : (
            <Building2 size={18} className="text-gray-400" />
          )}
        </div>
      </div>

      <div className="mb-4 space-y-1">
        {entity.businessAddress && (
          <div className="text-[10px] text-gray-500 flex items-center gap-1">
            <Globe size={10} />
            <span className="truncate">{entity.businessAddress}</span>
          </div>
        )}
        {entity.contactPerson && (
          <div className="text-[10px] text-gray-500 flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-200 flex items-center justify-center text-[8px]">
              👤
            </div>
            <span>{entity.contactPerson}</span>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-[var(--line)]">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Net Profit
            </div>
            <div
              className={cn(
                'text-xl font-bold font-mono tracking-tighter',
                profit >= 0 ? 'text-green-600' : 'text-rose-600',
              )}
            >
              ${profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
          <motion.div animate={{ rotate: isHovered ? 180 : 0 }} className="text-gray-300">
            <ArrowUpRight size={14} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-dashed border-[var(--line)] space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500 uppercase font-bold tracking-wider">
                  Gross Revenue
                </span>
                <span className="font-mono font-bold text-gray-900">
                  ${rev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500 uppercase font-bold tracking-wider">
                  Total Expenses
                </span>
                <span className="font-mono font-bold text-rose-500">
                  -${exp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-[11px] pt-1 pt-2 border-t border-gray-50">
                <span className="text-gray-500 uppercase font-bold tracking-wider">Margin</span>
                <span className="font-mono font-bold text-indigo-600">
                  {rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0'}%
                </span>
              </div>
              {entity.notes && (
                <div className="pt-2 border-t border-gray-100 mt-2">
                  <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">
                    Entity Notes
                  </span>
                  <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-3 italic leading-relaxed">
                    &ldquo;{entity.notes}&rdquo;
                  </p>
                </div>
              )}
            </div>
            <button
              className="mt-6 w-full py-2 bg-[var(--ink)] text-white text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              Open Ledger →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!isHovered && (
        <div className="mt-4 text-center opacity-30 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] font-bold uppercase tracking-tighter text-gray-400">
            Hover for details
          </span>
        </div>
      )}
    </motion.div>
  );
}
