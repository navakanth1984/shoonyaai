import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Cpu, 
  TrendingUp, 
  CheckCircle2,
  Printer
} from 'lucide-react';
import { UserRole } from '../types';
import { ROLE_PERMISSIONS } from '../mockData';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: UserRole;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  activeRole,
}) => {
  const currentRole = ROLE_PERMISSIONS[activeRole];
  const [reportType, setReportType] = useState('executive');
  const [focusArea, setFocusArea] = useState('Summarize weekly ingestion volume, cloud warehouse compute spend, and top 3 ML optimization recommendations');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [generatedReport, setGeneratedReport] = useState<any>({
    title: 'ShoonyaAI Weekly Executive Data & Infrastructure Briefing',
    generatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    summary: 'The ShoonyaAI autonomous ingestion grid sustained 100% uptime over the past 7 days, processing 684.2 million events across Snowflake, BigQuery, and Databricks endpoints with a 99.98% SLA compliance rate.',
    metrics: [
      { label: 'Total Ingested Volume', value: '684.2M events' },
      { label: 'Mean End-to-End Latency', value: '235 ms' },
      { label: 'Warehouse Compute Cost', value: '$2,446.90' },
      { label: 'Sensitive Records Masked', value: '1,420,000' }
    ],
    sections: [
      {
        heading: '1. Ingestion Pipeline Health & SLA Performance',
        content: 'All continuous CDC streaming and micro-batch pipelines maintained sub-second delivery targets. Automated backpressure buffering prevented data loss during a 3x traffic surge on Thursday afternoon.'
      },
      {
        heading: '2. Multi-Cloud Warehouse Resource Utilization',
        content: 'Snowflake Enterprise consumption represented 52% of total spend ($1,270), followed by Google BigQuery at 28% ($685). Automated query pruning and cluster auto-suspend saved approximately $490 in unused compute credits.'
      },
      {
        heading: '3. Security, Governance & PII Sanitization',
        content: 'Zero unmasked PII records reached downstream analytics marts. SHA-256 tokenization was applied to all customer email and phone fields in strict compliance with GDPR Art. 32 and SOC2 criteria.'
      }
    ],
    recommendations: [
      'Implement auto-suspend timeout reduction (60s) on TRANSFORM_DBT_XL to capture an additional 12% compute savings.',
      'Promote MQTT IoT Gateway pipeline from micro-batch to continuous streaming to reduce anomaly detection latency.',
      'Review Databricks Delta Lake partition clustering keys prior to anticipated Black Friday volume surge.'
    ]
  });

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, focusArea })
      });

      if (!res.ok) throw new Error('Report synthesis failed');
      const data = await res.json();
      setGeneratedReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedReport) return;
    const text = `${generatedReport.title}\nDate: ${generatedReport.generatedAt}\n\nSummary:\n${generatedReport.summary}\n\n` +
      generatedReport.sections.map((s: any) => `${s.heading}\n${s.content}\n`).join('\n') +
      `\nRecommendations:\n` + generatedReport.recommendations.map((r: any) => `- ${r}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedReport) return;
    const text = `# ${generatedReport.title}\n**Generated:** ${generatedReport.generatedAt}\n\n## Executive Summary\n${generatedReport.summary}\n\n` +
      `## Key Metrics\n` + generatedReport.metrics.map((m: any) => `- **${m.label}:** ${m.value}`).join('\n') + `\n\n` +
      generatedReport.sections.map((s: any) => `## ${s.heading}\n${s.content}\n`).join('\n\n') +
      `\n\n## Actionable Recommendations\n` + generatedReport.recommendations.map((r: any) => `- ${r}`).join('\n');

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shoonyai_report_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Automated Stakeholder Report Synthesis</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  GEMINI AI
                </span>
              </h3>
              <p className="text-xs text-slate-500">Custom business intelligence & pipeline audit briefings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Controls Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Report Scope & Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="executive">Executive Stakeholder Brief</option>
                  <option value="security">Security & Compliance Audit</option>
                  <option value="financial">Warehouse Spend & FinOps</option>
                  <option value="engineering">Pipeline SLA & Engineering</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Prompt / Focus Instructions
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={focusArea}
                    onChange={(e) => setFocusArea(e.target.value)}
                    placeholder="e.g. Highlight compute cost spikes, SLA breaches, and partition recommendations..."
                    className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isGenerating ? (
                      <>
                        <Cpu className="w-4 h-4 animate-spin" />
                        <span>Writing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Generated Document Card */}
          {generatedReport && (
            <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              
              {/* Report Header */}
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">
                    SHOONYAAI INTELLIGENCE BRIEF
                  </span>
                  <span className="text-xs text-slate-400">{generatedReport.generatedAt}</span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {generatedReport.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {generatedReport.summary}
                </p>
              </div>

              {/* Key Metrics Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {generatedReport.metrics?.map((m: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{m.label}</span>
                    <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">{m.value}</span>
                  </div>
                ))}
              </div>

              {/* Report Sections */}
              <div className="space-y-4 pt-1">
                {generatedReport.sections?.map((sec: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800 dark:text-slate-200">
                      {sec.heading}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {sec.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50">
                <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-950 dark:text-indigo-300 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Actionable Strategic Recommendations</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {generatedReport.recommendations?.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Export guarded by RBAC role: <strong className="text-slate-600 dark:text-slate-300">{currentRole.label}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={!currentRole.canExportReports}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Markdown</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
