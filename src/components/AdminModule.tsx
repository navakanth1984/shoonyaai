import React, { useState } from 'react';
import { 
  Server, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  ExternalLink, 
  HardDrive, 
  DollarSign, 
  Activity,
  Cpu,
  Layers,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { WarehouseConnection, UserRole } from '../types';
import { INITIAL_WAREHOUSES, ROLE_PERMISSIONS } from '../mockData';

interface AdminModuleProps {
  activeRole: UserRole;
  onTriggerAuditLog: (action: string, target: string, status: 'ALLOWED' | 'BLOCKED' | 'SUCCESS' | 'WARNING') => void;
}

export const AdminModule: React.FC<AdminModuleProps> = ({ 
  activeRole, 
  onTriggerAuditLog 
}) => {
  const currentRole = ROLE_PERMISSIONS[activeRole];
  const [warehouses, setWarehouses] = useState<WarehouseConnection[]>(INITIAL_WAREHOUSES);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWh, setNewWh] = useState({
    name: '',
    type: 'snowflake',
    host: '',
    database: '',
    schema: 'PUBLIC'
  });

  const handleTestConnection = (id: string) => {
    setTestingId(id);
    setTimeout(() => {
      setWarehouses(prev => prev.map(wh => {
        if (wh.id === id) {
          const newLatency = Math.floor(Math.random() * 25) + 30;
          onTriggerAuditLog('WAREHOUSE_PING_TEST', `Warehouse: ${wh.name}`, 'SUCCESS');
          return { ...wh, latencyMs: newLatency, lastSynced: 'Just now' };
        }
        return wh;
      }));
      setTestingId(null);
    }, 1200);
  };

  const handleAddWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRole.canManageWarehouses) {
      alert(`Permission Denied: Current role [${currentRole.label}] cannot provision new warehouse connections.`);
      return;
    }

    const created: WarehouseConnection = {
      id: `wh-${Date.now().toString().slice(-4)}`,
      name: newWh.name || `${newWh.type.toUpperCase()} Mart`,
      type: newWh.type as any,
      host: newWh.host || 'cluster.cloud.endpoint',
      database: newWh.database || 'ANALYTICS',
      schema: newWh.schema || 'PUBLIC',
      status: 'connected',
      latencyMs: 45,
      activeQueries: 2,
      storageGb: 120,
      monthlySpendUsd: 450,
      lastSynced: 'Just now'
    };

    setWarehouses(prev => [...prev, created]);
    setShowAddModal(false);
    onTriggerAuditLog('WAREHOUSE_CREATE', `Warehouse: ${created.name}`, 'SUCCESS');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Server className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Cloud Data Warehouses & Cluster Administration</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                Multi-Cloud Fabric
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure endpoints for Snowflake, BigQuery, Redshift, and Databricks. Monitor compute clusters, spend, and connection health.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {currentRole.canManageWarehouses ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Connect Warehouse</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700">
                Admin operations restricted for {currentRole.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {warehouses.map(wh => {
          const isTesting = testingId === wh.id;
          return (
            <div 
              key={wh.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200">
                    <Database className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{wh.name}</span>
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-xs block">
                      {wh.host}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Online</span>
                </div>
              </div>

              {/* Warehouse Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Roundtrip Latency</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{wh.latencyMs} ms</span>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Active Queries</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{wh.activeQueries}</span>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Managed Data</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{wh.storageGb} GB</span>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Monthly Spend</span>
                  <span className="font-mono font-bold text-emerald-600">${wh.monthlySpendUsd}</span>
                </div>
              </div>

              {/* Database & Schema Specs */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 font-mono">
                <span>Database: <strong className="text-slate-700 dark:text-slate-300">{wh.database}</strong></span>
                <span>Schema: <strong className="text-slate-700 dark:text-slate-300">{wh.schema}</strong></span>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Synced {wh.lastSynced}</span>
                </span>

                <button
                  onClick={() => handleTestConnection(wh.id)}
                  disabled={isTesting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-500' : ''}`} />
                  <span>{isTesting ? 'Testing Ping...' : 'Test Connection'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compute Cluster & Worker Pool Metrics */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-500" />
          <span>Distributed ETL Worker Pool & Compute Health</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Worker Node CPU</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">42% Used</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '42%' }}></div>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">8 / 16 vCPUs active</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Buffer RAM</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">58% Used</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: '58%' }}></div>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">18.5 GB / 32 GB allocated</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Auto-Scaling Nodes</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">4 / 12 Max</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="bg-cyan-500 h-full rounded-full" style={{ width: '33%' }}></div>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Surge scale watermark: 85%</span>
          </div>
        </div>
      </div>

      {/* Connect Warehouse Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-500" />
              <span>Connect New Cloud Warehouse</span>
            </h3>

            <form onSubmit={handleAddWarehouse} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Warehouse Platform</label>
                <select
                  value={newWh.type}
                  onChange={(e) => setNewWh({ ...newWh, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="snowflake">Snowflake Data Cloud</option>
                  <option value="bigquery">Google BigQuery</option>
                  <option value="redshift">AWS Redshift</option>
                  <option value="databricks">Databricks Delta Lake</option>
                  <option value="postgres">PostgreSQL Analytics Replica</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Connection Display Name</label>
                <input
                  type="text"
                  required
                  value={newWh.name}
                  onChange={(e) => setNewWh({ ...newWh, name: e.target.value })}
                  placeholder="e.g. Snowflake Production Lakehouse"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Host / Account Endpoint</label>
                <input
                  type="text"
                  required
                  value={newWh.host}
                  onChange={(e) => setNewWh({ ...newWh, host: e.target.value })}
                  placeholder="e.g. org-account.snowflakecomputing.com"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Database</label>
                  <input
                    type="text"
                    required
                    value={newWh.database}
                    onChange={(e) => setNewWh({ ...newWh, database: e.target.value })}
                    placeholder="PROD_DW"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Schema</label>
                  <input
                    type="text"
                    required
                    value={newWh.schema}
                    onChange={(e) => setNewWh({ ...newWh, schema: e.target.value })}
                    placeholder="PUBLIC"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
                >
                  Save Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
