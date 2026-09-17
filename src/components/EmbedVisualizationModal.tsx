import React, { useState, useMemo } from 'react';
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
  Sliders,
  Boxes,
  Cpu,
  Terminal,
  FileCode,
  BookOpen
} from 'lucide-react';
import { EmbeddedVisualization } from '../types';
import { generatePolyglotSnippets } from '../utils/polyglotCodeGenerators';

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
    xAxisKey?: string;
    warehouseType?: string;
  };
}

export type EmbedTabType = 
  | 'html5' 
  | 'react' 
  | 'pyspark' 
  | 'spark_scala' 
  | 'java' 
  | 'spark_sql' 
  | 'python' 
  | 'iframe' 
  | 'url';

export const EmbedVisualizationModal: React.FC<EmbedVisualizationModalProps> = ({
  isOpen,
  onClose,
  visualization,
}) => {
  const [embedType, setEmbedType] = useState<EmbedTabType>('html5');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [autoRefresh, setAutoRefresh] = useState<'30s' | '1m' | '5m' | 'disabled'>('30s');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const snippets = useMemo(() => {
    return generatePolyglotSnippets({
      title: visualization.title,
      sql: visualization.sql,
      data: visualization.data,
      xAxisKey: visualization.xAxisKey || 'cluster_name',
      metrics: visualization.metrics,
      warehouseType: visualization.warehouseType || 'snowflake'
    });
  }, [visualization]);

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

  const getActiveCode = (): { code: string; language: string; dialect: string; instructions: string; libraries: string[]; manifest?: { filename: string; content: string } } => {
    switch (embedType) {
      case 'html5':
        return {
          code: snippets.html5_standalone.code,
          language: 'HTML5 Standalone + 3D WebGL',
          dialect: 'Three.js & Canvas 3D',
          instructions: snippets.html5_standalone.executionInstructions,
          libraries: snippets.html5_standalone.libraries,
        };
      case 'react':
        return {
          code: snippets.react_vite.code,
          language: 'React 19 + Vite',
          dialect: 'TypeScript JSX (.tsx)',
          instructions: snippets.react_vite.executionInstructions,
          libraries: snippets.react_vite.libraries,
        };
      case 'pyspark':
        return {
          code: snippets.pyspark.code,
          language: 'PySpark',
          dialect: snippets.pyspark.dialect,
          instructions: snippets.pyspark.executionInstructions,
          libraries: snippets.pyspark.libraries,
          manifest: snippets.pyspark.manifestFile,
        };
      case 'spark_scala':
        return {
          code: snippets.spark_scala.code,
          language: 'Spark Scala',
          dialect: snippets.spark_scala.dialect,
          instructions: snippets.spark_scala.executionInstructions,
          libraries: snippets.spark_scala.libraries,
          manifest: snippets.spark_scala.manifestFile,
        };
      case 'java':
        return {
          code: snippets.java_spark.code,
          language: 'Java (Apache Spark)',
          dialect: snippets.java_spark.dialect,
          instructions: snippets.java_spark.executionInstructions,
          libraries: snippets.java_spark.libraries,
          manifest: snippets.java_spark.manifestFile,
        };
      case 'spark_sql':
        return {
          code: snippets.spark_sql.code,
          language: 'Spark SQL',
          dialect: snippets.spark_sql.dialect,
          instructions: snippets.spark_sql.executionInstructions,
          libraries: snippets.spark_sql.libraries,
        };
      case 'python':
        return {
          code: snippets.python_polars.code,
          language: 'Python (DuckDB & Polars)',
          dialect: snippets.python_polars.dialect,
          instructions: snippets.python_polars.executionInstructions,
          libraries: snippets.python_polars.libraries,
        };
      case 'iframe':
        return {
          code: iframeCode,
          language: 'HTML <iframe>',
          dialect: 'Embedded Web Widget',
          instructions: 'Paste inside Notion, Confluence, WordPress, or HTML portals.',
          libraries: ['Standard HTML5 Web Browser'],
        };
      case 'url':
      default:
        return {
          code: embedUrl,
          language: 'Direct URL Link',
          dialect: 'Secure HTTPS Endpoint',
          instructions: 'Share with authorized stakeholders.',
          libraries: ['ShoonyaAI Gateway'],
        };
    }
  };

  const activeSnippet = getActiveCode();

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                <span>Multi-Language Code & Embed Suite</span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {visualization.chartType}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                  Spark &bull; Scala &bull; Java &bull; Python &bull; HTML
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Export and embed this query and visualization across all major big data frameworks, 3D WebGL, and web runtimes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Chart Target Info */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Query & Visualization</span>
              <span className="font-bold text-slate-900 dark:text-white">{visualization.title}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[11px]">
                {visualization.data?.length || 0} Data Points
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                Dialect: {visualization.warehouseType?.toUpperCase() || 'SNOWFLAKE / ANSI'}
              </span>
            </div>
          </div>

          {/* Polyglot Framework Switcher Tabs (Thumb-Friendly on mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setEmbedType('html5')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[38px] cursor-pointer shrink-0 ${
                embedType === 'html5'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-cyan-400" />
                <span>HTML5 + 3D WebGL</span>
              </span>
            </button>

            <button
              onClick={() => setEmbedType('react')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[38px] cursor-pointer shrink-0 ${
                embedType === 'react'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5" />
                <span>React 19 + Vite</span>
              </span>
            </button>

            <button
              onClick={() => setEmbedType('pyspark')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[38px] cursor-pointer shrink-0 ${
                embedType === 'pyspark'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>PySpark (Python)</span>
              </span>
            </button>

            <button
              onClick={() => setEmbedType('spark_scala')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[38px] cursor-pointer shrink-0 ${
                embedType === 'spark_scala'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-red-400" />
                <span>Spark Scala</span>
              </span>
            </button>

            <button
              onClick={() => setEmbedType('java')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[38px] cursor-pointer shrink-0 ${
                embedType === 'java'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-orange-400" />
                <span>Java Spark</span>
              </span>
            </button>

            <button
              onClick={() => setEmbedType('spark_sql')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[38px] cursor-pointer shrink-0 ${
                embedType === 'spark_sql'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Spark SQL</span>
            </button>

            <button
              onClick={() => setEmbedType('python')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[38px] cursor-pointer shrink-0 ${
                embedType === 'python'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>DuckDB & Polars</span>
            </button>

            <button
              onClick={() => setEmbedType('iframe')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[38px] cursor-pointer shrink-0 ${
                embedType === 'iframe'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>&lt;iframe&gt;</span>
            </button>

            <button
              onClick={() => setEmbedType('url')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[38px] cursor-pointer shrink-0 ${
                embedType === 'url'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Direct Link</span>
            </button>
          </div>

          {/* Framework Metadata Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{activeSnippet.language}</span>
                <span className="text-cyan-400 font-mono text-[11px]">({activeSnippet.dialect})</span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">{activeSnippet.instructions}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(activeSnippet.code, embedType)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer min-h-[38px] w-full sm:w-auto"
              >
                {copiedKey === embedType ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Libraries & Package Dependencies */}
          {activeSnippet.libraries && activeSnippet.libraries.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Required Libraries:</span>
              {activeSnippet.libraries.map((lib, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700">
                  {lib}
                </span>
              ))}
            </div>
          )}

          {/* Code Viewer Container */}
          <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-cyan-300 border border-slate-800 max-h-72 overflow-y-auto overflow-x-auto shadow-inner">
            <pre className="whitespace-pre leading-relaxed text-[11px]">
              {activeSnippet.code}
            </pre>
          </div>

          {/* Manifest File Tab (pom.xml / build.sbt / requirements.txt) */}
          {activeSnippet.manifest && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Build Manifest: {activeSnippet.manifest.filename}</span>
                </span>
                <button
                  onClick={() => handleCopy(activeSnippet.manifest!.content, 'manifest')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                >
                  {copiedKey === 'manifest' ? 'Copied Manifest!' : `Copy ${activeSnippet.manifest.filename}`}
                </button>
              </div>
              <div className="rounded-xl bg-slate-900/90 p-3 font-mono text-[11px] text-slate-300 border border-slate-800 max-h-32 overflow-y-auto">
                <pre className="whitespace-pre">{activeSnippet.manifest.content}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <span>All generated code is fully compatible with Apache Spark 3.5+, React 19, Vite, and Three.js 3D WebGL.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold cursor-pointer w-full sm:w-auto min-h-[38px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

