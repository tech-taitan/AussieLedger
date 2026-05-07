/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuditLog } from '../types';
import { History, User, Calendar, Tag, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface AuditTrailProps {
  logs: AuditLog[];
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ logs }) => {
  // Sort logs by timestamp descending
  const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getActionColor = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE_ENTITY': return 'bg-emerald-100 text-emerald-700';
      case 'UPDATE_ENTITY': return 'bg-blue-100 text-blue-700';
      case 'POST_JOURNAL': return 'bg-indigo-100 text-indigo-700';
      case 'DELETE_JOURNAL': return 'bg-rose-100 text-rose-700';
      case 'IMPORT_DATA': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white border border-[var(--line-strong)] shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[var(--line)] bg-gray-50 flex justify-between items-center">
        <h3 className="col-header flex items-center gap-2">
          <History size={16} />
          System Audit Trail
        </h3>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {logs.length} Total Operations
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--line)] bg-gray-50/50">
              <th className="p-3 text-[10px] font-bold uppercase text-gray-500">Timestamp</th>
              <th className="p-3 text-[10px] font-bold uppercase text-gray-500">User</th>
              <th className="p-3 text-[10px] font-bold uppercase text-gray-500">Action</th>
              <th className="p-3 text-[10px] font-bold uppercase text-gray-500">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {sortedLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              sortedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="text-gray-400" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                        {log.user.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium">{log.user}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter",
                      getActionColor(log.action)
                    )}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-600 max-w-md">
                    <div className="flex items-start gap-2">
                      <Info size={12} className="mt-0.5 text-gray-400 flex-shrink-0" />
                      <span className="line-clamp-2">{log.details}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
