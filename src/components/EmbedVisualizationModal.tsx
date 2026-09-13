import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Code, 
  Share2, 
  ExternalLink, 
  Sparkles, 
  Download, 
  Layers, 
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { EmbeddedVisualization } from '../types';

interface EmbedVisualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  visualization: {
    id: string;
    title: string;
    chartType: string;
    sql: string;
    data: any[];
    metrics: any[];
  };
}

export const EmbedVisualizationModal: React.FC<EmbedVisualizationModalProps> = ({
  isOpen,
  onClose,
  visualization,
}) => {
  const [embedType, setEmbedType] = useState<'iframe' | 'react' | 'url'>('iframe');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [autoRefresh, setAutoRefresh] = useState<'30s' | '1m' | '5m' | 'disabled'>('30s');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const embedUrl = `https://shoonyai-analytics.internal/embed/v1/${visualization.id}?theme=${theme}&refresh=${autoRefresh}`;
  
  const iframeCode = `<iframe 
  src="${embedUrl}" 
  width="100%" 
  height="420" 
  style="border: 1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}; border-radius: 12px;" 
  title="${visualization.title}"
  loading="lazy"
></iframe>`;

  const reactCode = `import { ShoonyaAIEmbeddedChart } from '@shoonyai/react-embed';

export function DashboardWidget() {
  return (
    <ShoonyaAIEmbeddedChart
      chartId="${visualization.id}"
      chartType="${visualization.chartType}"
      theme="${theme}"
      autoRefresh="${autoRefresh}"
      enableDrilldown={true}
      className="w-full h-96 rounded-xl"
    />
  );
}`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Embed & Share Interactive Chart</span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {visualization.chartType}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Embed this live-updating chart directly into Notion, Confluence, React portals, or stakeholder dashboards.
              </p>
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
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Chart Preview Badge */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Visualization</span>
              <span className="font-bold text-slate-900 dark:text-white">{visualization.title}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Dataset Points</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{visualization.data.length} records</span>
            </div>
          </div>

          {/* Config Options */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Color Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="dark">Dark Charcoal Theme</option>
                <option value="light">Light High-Contrast</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Streaming Refresh Sync</label>
              <select
                value={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="30s">Every 30 Seconds (Real-time)</option>
                <option value="1m">Every 1 Minute</option>
                <option value="5m">Every 5 Minutes</option>
                <option value="disabled">Static (Refresh Disabled)</option>
              </select>
            </div>
          </div>

          {/* Embed Format Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setEmbedType('iframe')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                embedType === 'iframe'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              HTML &lt;iframe&gt;
            </button>

            <button
              onClick={() => setEmbedType('react')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                embedType === 'react'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              React Component SDK
            </button>

            <button
              onClick={() => setEmbedType('url')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                embedType === 'url'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Direct URL Link
            </button>
          </div>

          {/* Code Snippet Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {embedType === 'iframe' && 'Standard iframe embed code for web pages:'}
                {embedType === 'react' && 'React component code snippet:'}
                {embedType === 'url' && 'Direct secure view link with token authorization:'}
              </span>
              <button
                onClick={() => {
                  const text = embedType === 'iframe' ? iframeCode : embedType === 'react' ? reactCode : embedUrl;
                  handleCopy(text, embedType);
                }}
                className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                {copiedKey === embedType ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === embedType ? 'Copied to Clipboard!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-cyan-300 border border-slate-800 overflow-x-auto">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {embedType === 'iframe' && iframeCode}
                {embedType === 'react' && reactCode}
                {embedType === 'url' && embedUrl}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500">
          <span>Embed tokens inherit platform RBAC and row-level masking policies</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
