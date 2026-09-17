import React, { useState } from 'react';
import { 
  Layers, 
  Terminal, 
  BarChart3, 
  ShieldCheck, 
  Server, 
  FileText, 
  Bell, 
  Sparkles, 
  UserCheck, 
  Play, 
  Pause, 
  X, 
  ChevronUp,
  Activity,
  CheckCircle2,
  MoreHorizontal,
  Search
} from 'lucide-react';
import { UserRole } from '../types';
import { ROLE_PERMISSIONS } from '../mockData';

interface MobileThumbBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  activeAlertsCount: number;
  onOpenAlerts: () => void;
  onOpenReport: () => void;
  isStreaming: boolean;
  setIsStreaming?: React.Dispatch<React.SetStateAction<boolean>>;
  totalThroughput?: number;
  onOpenSecurityAudit?: () => void;
}

export const MobileThumbBar: React.FC<MobileThumbBarProps> = ({
  activeTab,
  setActiveTab,
  activeRole,
  setActiveRole,
  activeAlertsCount,
  onOpenAlerts,
  onOpenReport,
  isStreaming,
  setIsStreaming,
  totalThroughput = 18400,
  onOpenSecurityAudit,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRoleSheetOpen, setIsRoleSheetOpen] = useState(false);

  const primaryNavItems = [
    { id: 'architect', label: 'Architect', icon: Layers },
    { id: 'engineer', label: 'Engineer', icon: Terminal },
    { id: 'analyst', label: 'Analyst', icon: BarChart3 },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'admin', label: 'Admin', icon: Server },
  ];

  const roles: { role: UserRole; title: string; desc: string }[] = [
    { role: 'admin', title: 'Platform Admin', desc: 'Full root access to warehouses, budgets & nodes' },
    { role: 'architect', title: 'AI Data Architect', desc: 'Synthesize topologies, dbt DAGs & models' },
    { role: 'engineer', title: 'Data Engineer', desc: 'Real-time telemetry, streaming CDC & schema drift' },
    { role: 'analyst', title: 'Business Analyst', desc: 'NLQ SQL synthesis, visualizations & reporting' },
    { role: 'security_officer', title: 'Security & Gov', desc: 'SOC2 compliance, PII masking & zero-trust' },
    { role: 'viewer', title: 'Read-only Viewer', desc: 'Read-only dashboards and metrics inspection' },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Quick Action Drawer / Bottom Sheet */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="flex justify-center -mt-2 mb-1">
              <div className="w-12 h-1.5 bg-slate-700 rounded-full"></div>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
                  <Activity className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">ShoonyaAI Thumb Control</h3>
                  <p className="text-xs text-slate-400">Instant controls & platform shortcuts</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* AI Report Button */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenReport();
                }}
                className="flex flex-col items-start justify-between p-3.5 rounded-2xl bg-gradient-to-br from-indigo-900/60 to-slate-800 border border-indigo-700/50 text-white min-h-[72px] cursor-pointer active:scale-95 transition-transform"
              >
                <div className="flex items-center justify-between w-full">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    Gemini
                  </span>
                </div>
                <div className="text-left mt-2">
                  <span className="text-xs font-bold block leading-tight">AI Report</span>
                  <span className="text-[10px] text-slate-400 leading-none">Synthesize brief</span>
                </div>
              </button>

              {/* Alerts & Outliers Button */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenAlerts();
                }}
                className="flex flex-col items-start justify-between p-3.5 rounded-2xl bg-gradient-to-br from-rose-950/60 to-slate-800 border border-rose-800/50 text-white min-h-[72px] cursor-pointer active:scale-95 transition-transform"
              >
                <div className="flex items-center justify-between w-full">
                  <Bell className="w-5 h-5 text-rose-400" />
                  {activeAlertsCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                      {activeAlertsCount} active
                    </span>
                  )}
                </div>
                <div className="text-left mt-2">
                  <span className="text-xs font-bold block leading-tight">Anomaly Alerts</span>
                  <span className="text-[10px] text-slate-400 leading-none">Detect outliers</span>
                </div>
              </button>

              {/* Role Switcher Opener */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsRoleSheetOpen(true);
                }}
                className="flex flex-col items-start justify-between p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-white min-h-[72px] cursor-pointer active:scale-95 transition-transform"
              >
                <div className="flex items-center justify-between w-full">
                  <UserCheck className="w-5 h-5 text-cyan-400" />
                  <span className="text-[10px] font-mono uppercase text-slate-400">RBAC</span>
                </div>
                <div className="text-left mt-2">
                  <span className="text-xs font-bold block leading-tight truncate max-w-[130px]">
                    {ROLE_PERMISSIONS[activeRole]?.label}
                  </span>
                  <span className="text-[10px] text-cyan-400 leading-none">Tap to switch role</span>
                </div>
              </button>

              {/* Streaming Toggle */}
              {setIsStreaming && (
                <button
                  onClick={() => {
                    setIsStreaming(!isStreaming);
                  }}
                  className={`flex flex-col items-start justify-between p-3.5 rounded-2xl border text-white min-h-[72px] cursor-pointer active:scale-95 transition-transform ${
                    isStreaming
                      ? 'bg-emerald-950/50 border-emerald-700/60'
                      : 'bg-amber-950/50 border-amber-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    {isStreaming ? (
                      <Pause className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Play className="w-5 h-5 text-amber-400" />
                    )}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isStreaming ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {isStreaming ? 'Running' : 'Paused'}
                    </span>
                  </div>
                  <div className="text-left mt-2">
                    <span className="text-xs font-bold block leading-tight">
                      {isStreaming ? 'Pause Stream' : 'Resume Stream'}
                    </span>
                    <span className="text-[10px] text-slate-400 leading-none">
                      {totalThroughput.toLocaleString()} eps
                    </span>
                  </div>
                </button>
              )}
            </div>

            {/* Additional Modules (Audit Logs, etc.) */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                All Platform Modules
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSelectTab('intelligence')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left min-h-[46px] cursor-pointer ${
                    activeTab === 'intelligence'
                      ? 'bg-cyan-600/30 border-cyan-500 text-white font-bold'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300'
                  }`}
                >
                  <Search className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs">Search & AI Studio</span>
                </button>

                <button
                  onClick={() => handleSelectTab('audit')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left min-h-[46px] cursor-pointer ${
                    activeTab === 'audit'
                      ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300'
                  }`}
                >
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs">Audit Logs (SOC2)</span>
                </button>

                <button
                  onClick={() => handleSelectTab('admin')}
                  className={`col-span-2 flex items-center gap-2.5 p-3 rounded-xl border text-left min-h-[46px] cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300'
                  }`}
                >
                  <Server className="w-4 h-4 text-blue-400" />
                  <span className="text-xs">Warehouses & Compute</span>
                </button>
              </div>

              {/* Zero Breach Security Verification Button */}
              {onOpenSecurityAudit && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSecurityAudit();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 min-h-[46px] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold">API Key & Breach Shield Audit</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    0 Leaks
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Role Switcher Bottom Sheet */}
      {isRoleSheetOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150 md:hidden"
          onClick={() => setIsRoleSheetOpen(false)}
        >
          <div 
            className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center -mt-2 mb-1">
              <div className="w-12 h-1.5 bg-slate-700 rounded-full"></div>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400">
                  <UserCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Select Active Role</h3>
                  <p className="text-xs text-slate-400">Switches role permissions & access controls</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRoleSheetOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Close role sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {roles.map((r) => {
                const isSelected = activeRole === r.role;
                return (
                  <button
                    key={r.role}
                    onClick={() => {
                      setActiveRole(r.role);
                      setIsRoleSheetOpen(false);
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all min-h-[56px] cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold">{r.title}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-indigo-900">
                            Active
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {r.desc}
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-white shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Mobile Bottom Thumb Bar */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 md:hidden px-2 py-1.5 shadow-2xl safe-area-inset-bottom"
      >
        <div className="grid grid-cols-6 items-center max-w-lg mx-auto">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
                  isActive
                    ? 'text-indigo-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0.5 w-6 h-1 bg-indigo-500 rounded-full shadow-sm shadow-indigo-500/50"></span>
                )}
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400 scale-110' : 'text-slate-400'}`} />
                <span className="text-[10px] mt-1 tracking-tight leading-none truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* More & Quick Actions Thumb Button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
              isMenuOpen || activeTab === 'audit'
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="More options"
          >
            {activeAlertsCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            )}
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight leading-none">
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
