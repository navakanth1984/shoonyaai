import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  User, 
  Globe, 
  Clock,
  Layers,
  ChevronRight,
  Code2
} from 'lucide-react';
import { AuditLog, UserRole } from '../types';
import { ROLE_PERMISSIONS } from '../mockData';

interface AuditLogViewerProps {
  logs: AuditLog[];
  activeRole: UserRole;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs, activeRole }) => {
  const currentRole = ROLE_PERMISSIONS[activeRole];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ALLOWED' | 'BLOCKED' | 'SUCCESS' | 'WARNING'>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = logs.filter(l => {
    const matchesSearch = 
      l.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.ipAddress.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `shoonyai_audit_logs_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Enterprise Audit Logs & Compliance Trail</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                Immutable Ledger
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Tamper-evident system activity recording every pipeline deployment, security policy mutation, and unauthorized query attempt.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              disabled={!currentRole.canExportReports}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Audit Trail (JSON)</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by actor email, action type, target pipeline, or IP address..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <span className="text-xs text-slate-500">Status:</span>
            {(['ALL', 'SUCCESS', 'ALLOWED', 'BLOCKED', 'WARNING'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === st 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Timestamp (UTC)</th>
                <th className="px-4 py-3">Actor & Persona</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Target Resource</th>
                <th className="px-4 py-3">Origin IP</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                    No audit records matching search criteria
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const statusBadge = 
                    log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                    log.status === 'ALLOWED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                    log.status === 'BLOCKED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';

                  return (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <div className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{log.actor}</div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{log.role}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 truncate max-w-xs">
                        {log.target}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {log.ipAddress}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadge}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Audit Log Modal / Detail Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span>Audit Record #{selectedLog.id}</span>
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Timestamp:</span>
                <span className="font-mono text-slate-900 dark:text-white">{selectedLog.timestamp}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Actor Account:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedLog.actor}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Assigned Persona:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">{selectedLog.role}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Target System:</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedLog.target}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Authorization Decision:</span>
                <span className="font-bold text-emerald-600">{selectedLog.status}</span>
              </div>

              {selectedLog.metadata && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1 font-semibold">Structured Audit Metadata:</span>
                  <pre className="p-3 rounded-lg bg-slate-950 text-cyan-300 font-mono text-[11px] overflow-x-auto border border-slate-800">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
