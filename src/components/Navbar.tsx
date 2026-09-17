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
  UserCheck,
  LogOut,
  LogIn,
  Shield,
  Search
} from 'lucide-react';
import { UserRole, AuthUser } from '../types';
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
  currentUser?: AuthUser | null;
  onSignOut?: () => void;
  onOpenLogin?: () => void;
  onOpenSecurityAudit?: () => void;
  onOpenFirebaseDiagnostics?: () => void;
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
  currentUser,
  onSignOut,
  onOpenLogin,
  onOpenSecurityAudit,
  onOpenFirebaseDiagnostics,
}) => {
  const currentRoleInfo = ROLE_PERMISSIONS[activeRole];

  const navItems = [
    { id: 'architect', label: 'AI Architect', icon: Layers, badge: 'Auto-DAG' },
    { id: 'intelligence', label: 'AI Search & Studio', icon: Sparkles, badge: 'Grounded & Veo' },
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
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">ShoonyaAI</span>
                <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 shrink-0">
                  AI NATIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden lg:block">
                Autonomous Pipelines &bull; Real-time Analytics &bull; Enterprise Governance
              </p>
            </div>
          </div>

          {/* Real-time Streaming Metrics & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Firebase Cloud Firestore Diagnostic Trigger Button */}
            <button
              onClick={onOpenFirebaseDiagnostics}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/50 hover:bg-amber-900/70 border border-amber-500/40 text-xs transition-all cursor-pointer shadow-xs"
              title="Click to run live Firebase Cloud Diagnostics & view latency tests"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-[11px] font-mono text-amber-300 font-semibold">Firestore Tests</span>
            </button>

            {/* Live Throughput Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
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

            {/* Security Breach Audit Trigger */}
            <button
              id="nav-security-audit-btn"
              onClick={onOpenSecurityAudit}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all min-h-[38px] cursor-pointer shadow-xs"
              title="Verify Zero API Key Leakage & Breach Posture"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Breach Shield</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse hidden xs:inline" />
            </button>

            {/* Quick Search & AI Studio Trigger */}
            <button
              id="nav-search-btn"
              onClick={() => setActiveTab('intelligence')}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white text-xs transition-all min-h-[38px] cursor-pointer shadow-inner"
              title="Open Technical Search Grounding, Chatbot & Veo Studio (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden lg:inline text-slate-400">Search Tech & Stacks...</span>
              <span className="lg:hidden text-slate-400">AI Search</span>
              <kbd className="hidden lg:inline text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">⌘K</kbd>
            </button>

            {/* Custom Report Generator Button */}
            <button
              id="nav-report-btn"
              onClick={onOpenReport}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all min-h-[38px] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">AI Report</span>
            </button>

            {/* Alerts Notification Button */}
            <button
              id="nav-alerts-btn"
              onClick={onOpenAlerts}
              className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
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
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-slate-800 border border-slate-700 max-w-[115px] xs:max-w-[140px] sm:max-w-none">
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-[9px] text-slate-400 leading-none font-semibold truncate hidden xs:block">ROLE</span>
                  <select
                    id="nav-role-select"
                    value={activeRole}
                    onChange={(e) => setActiveRole(e.target.value as UserRole)}
                    className="bg-transparent text-xs font-semibold text-white focus:outline-hidden cursor-pointer pr-1 truncate"
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

            {/* User Auth Profile / Sign In Widget */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-800">
                <div 
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200"
                  title={`Signed in via ${currentUser.loginMethod === 'google' ? 'Google' : 'Mobile OTP'} (${currentUser.email || currentUser.phone})`}
                >
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    className="w-5 h-5 rounded-full ring-1 ring-emerald-400 shrink-0"
                  />
                  <span className="font-semibold text-white max-w-[80px] xs:max-w-[110px] truncate text-[11px] hidden xs:inline">
                    {currentUser.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/80 hover:text-rose-400 text-slate-400 border border-slate-700 hover:border-rose-500/40 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all min-h-[38px] cursor-pointer shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>Sign In</span>
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="bg-slate-950/60 border-t border-slate-800/80 px-2 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex space-x-1 sm:space-x-2 py-1.5 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap min-h-[40px] transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono hidden xs:inline-block ${
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
