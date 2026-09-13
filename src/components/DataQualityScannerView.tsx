import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  FileSearch, 
  Copy, 
  Check, 
  Code2, 
  RefreshCw, 
  CheckCheck, 
  ArrowRight,
  Filter,
  Eye,
  Zap,
  Info
} from 'lucide-react';
import { DataQualityScanResult, DataQualityIssue } from '../types';
import { SAMPLE_DATA_QUALITY_SCANS, INITIAL_WAREHOUSE_MODELS } from '../mockData';

interface DataQualityScannerViewProps {
  onApplyCleansingModel?: (tableName: string, dbtModel: string) => void;
}

export const DataQualityScannerView: React.FC<DataQualityScannerViewProps> = ({ onApplyCleansingModel }) => {
  const [selectedTable, setSelectedTable] = useState<string>('orders_fact');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('Snowflake Enterprise');
  const [scanResults, setScanResults] = useState<Record<string, DataQualityScanResult>>(SAMPLE_DATA_QUALITY_SCANS);
  const [isScanning, setIsScanning] = useState(false);
  const [copiedSql, setCopiedSql] = useState<string | null>(null);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);
  const [filterIssueType, setFilterIssueType] = useState<string>('all');

  const currentScan = scanResults['mdl-01'] || Object.values(scanResults)[0];

  const handleScanSampleData = async () => {
    setIsScanning(true);
    setAppliedMessage(null);

    try {
      const res = await fetch('/api/gemini/scan-data-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: selectedTable,
          warehouse: selectedWarehouse,
          sampleRows: currentScan.sampleDataPreview
        }),
      });

      if (!res.ok) throw new Error('Data quality scan failed');
      const data: DataQualityScanResult = await res.json();

      setScanResults(prev => ({
        ...prev,
        'mdl-01': data
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSql(key);
    setTimeout(() => setCopiedSql(null), 2000);
  };

  const handleDeployCleansing = () => {
    if (onApplyCleansingModel) {
      onApplyCleansingModel(currentScan.table, currentScan.cleansingDbtModel);
    }
    setAppliedMessage(`Successfully attached cleansing dbt transformation model to pipeline "${currentScan.table}"!`);
    setTimeout(() => setAppliedMessage(null), 5000);
  };

  const filteredIssues = filterIssueType === 'all' 
    ? currentScan.issues 
    : currentScan.issues.filter(i => i.issueType === filterIssueType);

  const getIssueBadge = (type: DataQualityIssue['issueType']) => {
    switch (type) {
      case 'missing_value':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">Missing / Null Key</span>;
      case 'inconsistent_format':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Format Inconsistency</span>;
      case 'out_of_range':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">Out-Of-Range Value</span>;
      case 'duplicate_key':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Duplicate Key</span>;
    }
  };

  const getCellStatusBadge = (status: string) => {
    switch (status) {
      case 'VALID':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">VALID</span>;
      case 'NULL_KEY':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">DEFECT: NULL</span>;
      case 'OUT_OF_RANGE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">DEFECT: OUT-OF-RANGE</span>;
      case 'FORMAT_MISMATCH':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">DEFECT: FORMAT</span>;
      case 'DUPLICATE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">DEFECT: DUP</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <FileSearch className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Proactive Data Quality Scanner & Cleansing Advisor
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Scans sample data rows prior to warehouse commit to detect missing values, format inconsistencies, duplicate keys, and out-of-range anomalies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Scan Target:</span>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
              >
                {INITIAL_WAREHOUSE_MODELS.map(m => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.warehouse.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleScanSampleData}
              disabled={isScanning}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning 10,000 Rows...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Scan Sample Data</span>
                </>
              )}
            </button>
          </div>
        </div>

        {appliedMessage && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{appliedMessage}</span>
          </div>
        )}
      </div>

      {/* Quality Summary Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Overall Quality Score</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black ${
                currentScan.overallQualityScore >= 85 ? 'text-emerald-600' : currentScan.overallQualityScore >= 70 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {currentScan.overallQualityScore}%
              </span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-bold text-sm">
            {currentScan.overallQualityScore >= 80 ? 'Grade B+' : 'Grade C'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Scanned Sample Volume</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {currentScan.scannedRows.toLocaleString()} Rows
          </div>
          <span className="text-[11px] text-slate-500">Representative stratified sample</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Clean Rows Ratio</span>
          <div className="text-2xl font-black text-emerald-600">
            {currentScan.cleanRowsPct}%
          </div>
          <span className="text-[11px] text-slate-500">{(100 - currentScan.cleanRowsPct).toFixed(1)}% require sanitization</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Proactively Flagged Issues</span>
          <div className="text-2xl font-black text-rose-600">
            {currentScan.issues.length} Defect Classes
          </div>
          <span className="text-[11px] text-slate-500">Cleansing models available below</span>
        </div>
      </div>

      {/* Interactive Sample Data Preview with Defect Highlighting */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Sample Data Ingestion Inspector (Defect Heatmap)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Inspecting staging buffer for `{currentScan.table}`
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3.5 py-2.5 font-semibold">order_id</th>
                <th className="px-3.5 py-2.5 font-semibold">customer_uuid</th>
                <th className="px-3.5 py-2.5 font-semibold">order_amount_usd</th>
                <th className="px-3.5 py-2.5 font-semibold">order_created_at</th>
                <th className="px-3.5 py-2.5 font-semibold text-right">Data Quality Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {currentScan.sampleDataPreview.map((row, idx) => (
                <tr 
                  key={idx} 
                  className={row.status !== 'VALID' ? 'bg-rose-50/30 dark:bg-rose-950/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'}
                >
                  <td className="px-3.5 py-2.5 text-slate-800 dark:text-slate-200">
                    {row.order_id}
                  </td>
                  <td className="px-3.5 py-2.5">
                    {row.customer_uuid === null ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                        NULL (MISSING)
                      </span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">{row.customer_uuid}</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5">
                    {row.order_amount_usd < 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold">
                        ${row.order_amount_usd.toFixed(2)} (NEGATIVE)
                      </span>
                    ) : (
                      <span className="text-slate-700 dark:text-slate-300">${row.order_amount_usd.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5">
                    {row.order_created_at.includes('/') ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                        {row.order_created_at} (NON-ISO)
                      </span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">{row.order_created_at}</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-sans">
                    {getCellStatusBadge(row.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issues & Cleansing Recommendations */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <span>Preliminary Cleansing & Transformation Recommendations</span>
            <span className="text-xs font-normal text-slate-500">
              ({currentScan.issues.length} detected patterns)
            </span>
          </h3>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterIssueType}
              onChange={(e) => setFilterIssueType(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Issue Categories</option>
              <option value="missing_value">Missing / Null Values</option>
              <option value="inconsistent_format">Format Inconsistencies</option>
              <option value="out_of_range">Out of Range Anomalies</option>
              <option value="duplicate_key">Duplicate Keys</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredIssues.map((issue) => (
            <div 
              key={issue.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 mt-0.5">
                    <ShieldAlert className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {issue.column}
                      </span>
                      {getIssueBadge(issue.issueType)}
                      <span className="text-xs text-slate-500 font-medium">
                        {issue.affectedRowsCount.toLocaleString()} rows ({issue.affectedRowsPct}% of sample)
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Observed Defect:</span> {issue.sampleDefect}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 shrink-0">
                  <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {issue.severity} Priority
                  </span>
                </div>
              </div>

              {/* Cleansing Recommendation */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  AI Cleansing Logic:
                </span>
                <p className="text-slate-600 dark:text-slate-400 mb-2">
                  {issue.recommendation}
                </p>

                {/* SQL Expression */}
                <div className="rounded bg-slate-950 p-2.5 font-mono text-xs text-cyan-300 flex items-center justify-between gap-2 border border-slate-800">
                  <code className="truncate">{issue.cleansingSql}</code>
                  <button
                    onClick={() => handleCopy(issue.cleansingSql, issue.id)}
                    className="shrink-0 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Cleansing SQL snippet"
                  >
                    {copiedSql === issue.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Production Cleansing dbt Model Spec */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Synthesized Cleansing dbt Model (`stg_{currentScan.table}_cleansed.sql`)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(currentScan.cleansingDbtModel, 'dbt-cleansing-spec')}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              {copiedSql === 'dbt-cleansing-spec' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql === 'dbt-cleansing-spec' ? 'Copied' : 'Copy Model'}</span>
            </button>

            <button
              onClick={handleDeployCleansing}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all cursor-pointer shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-300" />
              <span>Apply to Ingestion Pipeline</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Complete self-contained dbt staging transformation that standardizes formats, hashes missing guest IDs, corrects out-of-range signs, and window-deduplicates streaming deliveries:
        </p>

        <div className="rounded-lg bg-slate-950 p-3.5 font-mono text-xs text-cyan-300 overflow-x-auto border border-slate-800 leading-relaxed">
          <pre>{currentScan.cleansingDbtModel}</pre>
        </div>
      </div>
    </div>
  );
};
