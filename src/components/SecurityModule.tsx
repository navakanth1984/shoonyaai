import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  Key, 
  CheckCircle2, 
  AlertOctagon, 
  FileCheck2, 
  Sparkles, 
  Cpu, 
  UserCheck, 
  Users,
  Layers,
  Search
} from 'lucide-react';
import { PIIMaskingPolicy, UserRole } from '../types';
import { ROLE_PERMISSIONS, INITIAL_PII_POLICIES } from '../mockData';

interface SecurityModuleProps {
  activeRole: UserRole;
  onTriggerAuditLog: (action: string, target: string, status: 'ALLOWED' | 'BLOCKED' | 'SUCCESS' | 'WARNING') => void;
}

export const SecurityModule: React.FC<SecurityModuleProps> = ({ 
  activeRole, 
  onTriggerAuditLog 
}) => {
  const currentRole = ROLE_PERMISSIONS[activeRole];
  const [policies, setPolicies] = useState<PIIMaskingPolicy[]>(INITIAL_PII_POLICIES);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'policies' | 'rbac' | 'compliance'>('policies');

  const handleRunAiScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/gemini/security-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName: 'Production Ingestion Streams (Kafka & Snowflake)',
          fields: ['customer_email', 'card_pan_number', 'ip_address', 'patient_diagnosis_code', 'ssn_last4', 'order_total', 'salary_usd']
        })
      });

      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      setScanResult(data);

      onTriggerAuditLog('PII_COMPLIANCE_SCAN', 'Dataset: Production Ingestion Streams', 'SUCCESS');
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleTogglePolicy = (id: string) => {
    if (!currentRole.canAccessSecurityPolicies) {
      onTriggerAuditLog('UNAUTHORIZED_POLICY_EDIT_ATTEMPT', `Policy ID: ${id}`, 'BLOCKED');
      alert(`Permission Denied: Your current role [${currentRole.label}] cannot modify security masking policies.`);
      return;
    }

    setPolicies(prev => prev.map(p => {
      if (p.id === id) {
        const nextState = !p.active;
        onTriggerAuditLog('POLICY_STATE_CHANGE', `Policy: ${p.column} -> ${nextState ? 'ACTIVE' : 'DISABLED'}`, 'SUCCESS');
        return { ...p, active: nextState };
      }
      return p;
    }));
  };

  const handleChangeMaskType = (id: string, newType: PIIMaskingPolicy['maskingType']) => {
    if (!currentRole.canAccessSecurityPolicies) {
      onTriggerAuditLog('UNAUTHORIZED_POLICY_EDIT_ATTEMPT', `Policy ID: ${id}`, 'BLOCKED');
      alert(`Permission Denied: Your current role [${currentRole.label}] cannot modify security masking policies.`);
      return;
    }

    setPolicies(prev => prev.map(p => {
      if (p.id === id) {
        onTriggerAuditLog('POLICY_MASK_CHANGE', `Policy: ${p.column} -> ${newType}`, 'SUCCESS');
        return { ...p, maskingType: newType };
      }
      return p;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Security, RBAC & Governance Center</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                SOC2 / GDPR / HIPAA Compliance
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Zero-trust column encryption, automated PII sanitization, fine-grained role-based access control, and cryptographic audits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAiScan}
              disabled={isScanning}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isScanning ? (
                <>
                  <Cpu className="w-4 h-4 animate-spin" />
                  <span>Scanning Schema...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run AI Governance Scan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'policies'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            PII Masking Policies ({policies.filter(p => p.active).length} Active)
          </button>
          <button
            onClick={() => setActiveTab('rbac')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'rbac'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            RBAC Permission Matrix
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'compliance'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Compliance Posture
          </button>
        </div>
      </div>

      {/* AI Scan Findings Card (If Scan Run) */}
      {scanResult && (
        <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 via-rose-950/40 to-slate-900 border border-rose-800/50 text-white shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span>AI Governance Audit Report Findings</span>
            </h3>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Overall Risk: {scanResult.overallRiskScore}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">GDPR Art. 32</span>
              <span className="text-sm font-bold text-emerald-400">{scanResult.complianceReadiness?.gdpr}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">HIPAA § 164.312</span>
              <span className="text-sm font-bold text-emerald-400">{scanResult.complianceReadiness?.hipaa}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">SOC2 CC6.1</span>
              <span className="text-sm font-bold text-emerald-400">{scanResult.complianceReadiness?.soc2}</span>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="text-[11px] font-bold uppercase text-slate-400 mb-1">Recommended Governance Actions:</h4>
            <ul className="space-y-1 text-xs text-slate-300">
              {scanResult.governanceRecommendations?.map((r: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tab 1: PII Masking Policies */}
      {activeTab === 'policies' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-500" />
                <span>Active Column-Level Data Masking Policies</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transformations applied dynamically at the stream ingestion gate before landing in the warehouse staging schema.
              </p>
            </div>
            {!currentRole.canAccessSecurityPolicies && (
              <span className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900">
                Viewing as {currentRole.label} (Modifications Locked)
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Column Identifier</th>
                  <th className="px-4 py-3">Target Table / Stream</th>
                  <th className="px-4 py-3">Classification</th>
                  <th className="px-4 py-3">Sensitivity</th>
                  <th className="px-4 py-3">Applied Mask Technique</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {policies.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {p.column}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.table}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                        {p.classification}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.sensitivity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                        p.sensitivity === 'HIGH' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {p.sensitivity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.maskingType}
                        disabled={!currentRole.canAccessSecurityPolicies}
                        onChange={(e) => handleChangeMaskType(p.id, e.target.value as any)}
                        className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 disabled:opacity-60"
                      >
                        <option value="SHA256_HASH">SHA-256 Hash + Salt</option>
                        <option value="TOKENIZE">Tokenize (PCI Format Preserving)</option>
                        <option value="REDACT">Full Redaction [***REDACTED***]</option>
                        <option value="PARTIAL_MASK">Partial Mask (***-**-1234)</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleTogglePolicy(p.id)}
                        disabled={!currentRole.canAccessSecurityPolicies}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                          p.active 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {p.active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: RBAC Permission Matrix */}
      {activeTab === 'rbac' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>Enterprise Role-Based Access Control (RBAC) Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deterministic authorization policies enforced at the API gateway and warehouse proxy layer.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Role / Persona</th>
                  <th className="px-3 py-3 text-center">Deploy Pipelines</th>
                  <th className="px-3 py-3 text-center">Edit Topology</th>
                  <th className="px-3 py-3 text-center">Security & PII</th>
                  <th className="px-3 py-3 text-center">View Audit Logs</th>
                  <th className="px-3 py-3 text-center">Warehouses</th>
                  <th className="px-3 py-3 text-center">Raw SQL</th>
                  <th className="px-3 py-3 text-center">Export Reports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {Object.values(ROLE_PERMISSIONS).map(r => {
                  const isCurrent = r.role === activeRole;
                  return (
                    <tr key={r.role} className={`${isCurrent ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'}`}>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{r.label}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-sans uppercase">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">{r.canDeployPipelines ? '✅' : '❌'}</td>
                      <td className="px-3 py-3 text-center">{r.canEditTopology ? '✅' : '❌'}</td>
                      <td className="px-3 py-3 text-center">{r.canAccessSecurityPolicies ? '✅' : '❌'}</td>
                      <td className="px-3 py-3 text-center">{r.canViewAuditLogs ? '✅' : '❌'}</td>
                      <td className="px-3 py-3 text-center">{r.canManageWarehouses ? '✅' : '❌'}</td>
                      <td className="px-3 py-3 text-center">{r.canRunRawSql ? '✅' : '❌'}</td>
                      <td className="px-3 py-3 text-center">{r.canExportReports ? '✅' : '❌'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Compliance Posture */}
      {activeTab === 'compliance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-500" />
              <span>Regulatory Adherence Scores</span>
            </h3>
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">GDPR Article 32 (Security of Processing)</span>
                  <span className="text-emerald-600">96% Compliant</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '96%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">HIPAA Security Rule (§ 164.312)</span>
                  <span className="text-emerald-600">100% Compliant</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">SOC 2 Type II (Confidentiality & Integrity)</span>
                  <span className="text-emerald-600">98% Compliant</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '98%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-500" />
              <span>Cryptographic Key Management (KMS)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Hardware Security Module (HSM) backed envelope encryption active across all cloud warehouse destinations.
            </p>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 flex justify-between">
                <span className="text-slate-500">Root Key ID:</span>
                <span className="text-slate-800 dark:text-slate-200">kms-us-east-1-root-88f2a</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 flex justify-between">
                <span className="text-slate-500">Rotation Schedule:</span>
                <span className="text-emerald-600 font-bold">Every 90 Days (Auto)</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 flex justify-between">
                <span className="text-slate-500">Algorithm:</span>
                <span className="text-slate-800 dark:text-slate-200">AES-GCM-256 with HMAC-SHA512</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
