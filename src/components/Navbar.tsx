import React from 'react';
import { 
  Cpu, 
  Layers, 
  Terminal, 
  BarChart3, 
  ShieldCheck, 
  Server, 
  FileText, 
  Bell, 
  Sparkles, 
  ChevronDown,
  Activity,
  UserCheck
} from 'lucide-react';
import { UserRole } from '../types';
import { ROLE_PERMISSIONS } from '../mockData';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  activeAlertsCount: number;
  onOpenAlerts: () => void;
  onOpenReport: () => void;
  totalThroughput: number;
  isStreaming: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeRole,
  setActiveRole,
  activeAlertsCount,
  onOpenAlerts,
  onOpenReport,
  totalThroughput,
  isStreaming,
}) => {
  const currentRoleInfo = ROLE_PERMISSIONS[activeRole];

  const navItems = [
    { id: 'architect', label: 'AI Architect', icon: Layers, badge: 'Auto-DAG' },
    { id: 'engineer', label: 'Data Engineer', icon: Terminal, badge: 'Realtime' },
    { id: 'analyst', label: 'AI Analyst', icon: BarChart3, badge: 'NLQ' },
    { id: 'security', label: 'Security & Governance', icon: ShieldCheck, badge: 'RBAC/PII' },
    { id: 'admin', label: 'Warehouse Admin', icon: Server, badge: 'Warehouses' },
    { id: 'audit', label: 'Audit Logs', icon: FileText, badge: 'SOC2' },
  ];

  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-40">
      {/* Top Banner with Platform Status & Role Picker */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">ShoonyaAI</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                  AI NATIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Autonomous Pipelines • Real-time Analytics • Enterprise Governance
              </p>
            </div>
          </div>

          {/* Real-time Streaming Metrics & Actions */}
          <div className="flex items-center gap-3">
            {/* Live Throughput Pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
              <span className="relative flex h-2 w-2">
                {isStreaming && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isStreaming ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
              </span>
              <span className="text-slate-400 font-medium">Ingest:</span>
              <span className="text-emerald-400 font-mono font-bold">
                {isStreaming ? `${(totalThroughput).toLocaleString()} eps` : 'PAUSED'}
              </span>
            </div>

            {/* Custom Report Generator Button */}
            <button
              id="nav-report-btn"
              onClick={onOpenReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Report</span>
            </button>

            {/* Alerts Notification Button */}
            <button
              id="nav-alerts-btn"
              onClick={onOpenAlerts}
              className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Automated Alert Manager"
            >
              <Bell className="w-4 h-4" />
              {activeAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                  {activeAlertsCount}
                </span>
              )}
            </button>

            {/* RBAC Persona Switcher */}
            <div className="relative flex items-center">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
                <UserCheck className="w-4 h-4 text-slate-400" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-400 leading-none">ACTIVE ROLE</span>
                  <select
                    id="nav-role-select"
                    value={activeRole}
                    onChange={(e) => setActiveRole(e.target.value as UserRole)}
                    className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="admin" className="bg-slate-800 text-white">Platform Admin</option>
                    <option value="architect" className="bg-slate-800 text-white">AI Data Architect</option>
                    <option value="engineer" className="bg-slate-800 text-white">Data Engineer</option>
                    <option value="analyst" className="bg-slate-800 text-white">Business Analyst</option>
                    <option value="security_officer" className="bg-slate-800 text-white">Security & Governance</option>
                    <option value="viewer" className="bg-slate-800 text-white">Read-only Viewer</option>
                  </select>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="bg-slate-950/60 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex space-x-1 sm:space-x-2 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isActive ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
