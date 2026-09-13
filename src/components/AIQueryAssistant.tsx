import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  Code2, 
  BarChart3, 
  TrendingUp, 
  Layers, 
  PieChart as PieIcon, 
  Crosshair, 
  Copy, 
  Check, 
  Clock, 
  Database, 
  ArrowRight, 
  Lightbulb, 
  Filter, 
  Download, 
  Share2, 
  RefreshCw, 
  ChevronRight, 
  Maximize2, 
  Sliders, 
  Terminal, 
  Flame, 
  Cpu, 
  Eye, 
  FileText, 
  History, 
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Zap,
  DollarSign
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  ScatterChart, 
  Scatter, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { 
  AIQueryResult, 
  AIQueryHistoryItem, 
  AIQueryPromptMode, 
  UserRole 
} from '../types';
import { EmbedVisualizationModal } from './EmbedVisualizationModal';

interface AIQueryAssistantProps {
  activeRole?: UserRole;
  onOpenEmbed?: (viz: any) => void;
}

const PIE_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

const PROMPT_STRATEGIES: Array<{ id: AIQueryPromptMode; label: string; icon: any; description: string }> = [
  { 
    id: 'standard', 
    label: 'Standard Analytics', 
    icon: BarChart3, 
    description: 'Balanced metric aggregation & standard dimension grouping' 
  },
  { 
    id: 'finops', 
    label: 'FinOps & Cost Optimization', 
    icon: DollarSign, 
    description: 'Prioritizes compute credit burn, query pruning, and warehouse cost/million' 
  },
  { 
    id: 'root_cause', 
    label: 'Root Cause & Outliers', 
    icon: Flame, 
    description: 'Focuses on error spikes, dropped packets, and latency percentile anomalies' 
  },
  { 
    id: 'executive', 
    label: 'Executive KPI Summary', 
    icon: Zap, 
    description: 'High-level business outcomes, executive takeaways, and strategic recommendations' 
  }
];

const CURATED_PROMPT_CATEGORIES = [
  {
    category: 'FinOps & Compute',
    questions: [
      'Compare compute cost vs event throughput across all warehouse clusters',
      'Which warehouse queries consumed the highest credits in the last 7 days?',
      'Simulate credit savings if auto-suspend window is reduced to 60 seconds'
    ]
  },
  {
    category: 'Ingestion & Latency',
    questions: [
      'Show hourly ingestion latency trends and SLA breaches over last 24h',
      'Identify micro-batch buffering delays across Kafka streaming topics',
      'Correlate peak ingestion throughput with worker CPU utilization'
    ]
  },
  {
    category: 'Quality & Outliers',
    questions: [
      'Which pipelines have the highest error rates and dropped packets?',
      'Show distribution of schema validation failures and malformed records',
      'Detect sudden dips in daily active event streams across regions'
    ]
  }
];

export const AIQueryAssistant: React.FC<AIQueryAssistantProps> = ({ activeRole }) => {
  const [question, setQuestion] = useState('Compare compute cost vs event throughput across all warehouse clusters');
  const [warehouseType, setWarehouseType] = useState('snowflake');
  const [promptMode, setPromptMode] = useState<AIQueryPromptMode>('standard');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'results_table' | 'sql_editor' | 'prompt_inspection'>('preview');
  const [chartTypeOverride, setChartTypeOverride] = useState<'bar' | 'line' | 'area' | 'pie' | 'scatter' | null>(null);

  // In-table search and filtering
  const [tableSearch, setTableSearch] = useState('');
  const [tableSortKey, setTableSortKey] = useState<string | null>(null);
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('desc');

  // Drilldown entity
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);

  // Embed modal
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);

  // Query History
  const [history, setHistory] = useState<AIQueryHistoryItem[]>([
    {
      id: 'hist-1',
      question: 'Compare compute cost vs event throughput across all warehouse clusters',
      timestamp: '10 mins ago',
      warehouseType: 'Snowflake',
      promptMode: 'standard',
      chartType: 'bar',
      rowCount: 5
    },
    {
      id: 'hist-2',
      question: 'Show hourly ingestion latency trends and SLA breaches over last 24h',
      timestamp: '1 hour ago',
      warehouseType: 'Snowflake',
      promptMode: 'root_cause',
      chartType: 'line',
      rowCount: 6
    }
  ]);

  // Active Query Result State
  const [queryResult, setQueryResult] = useState<AIQueryResult>({
    id: 'viz-billing-01',
    question: 'Compare compute cost vs event throughput across all warehouse clusters',
    title: 'Warehouse Compute Cost vs Event Throughput',
    warehouseType: 'snowflake',
    promptMode: 'standard',
    sql: `SELECT 
  cluster_name,
  ROUND(SUM(credits_consumed), 1) as credits_consumed,
  ROUND(SUM(credits_consumed * 2.85), 2) as compute_cost_usd,
  ROUND(SUM(events_processed_millions), 1) as events_processed_m,
  ROUND(SUM(credits_consumed * 2.85) / NULLIF(SUM(events_processed_millions), 0), 2) as cost_per_million_events
FROM snowflake_analytics.cluster_billing_summary
WHERE recorded_date >= CURRENT_DATE() - INTERVAL '7 DAYS'
GROUP BY 1
ORDER BY 3 DESC;`,
    sqlExplanation: 'Aggregates cloud warehouse cluster credit burn, applies a $2.85/credit rate factor, and calculates cost efficiency per million events processed.',
    chartType: 'bar',
    xAxisKey: 'cluster_name',
    metrics: [
      { key: 'compute_cost_usd', label: 'Compute Cost ($)', color: '#6366f1', format: 'currency' },
      { key: 'events_processed_m', label: 'Throughput (M Events)', color: '#10b981', format: 'number' }
    ],
    data: [
      { cluster_name: 'INGEST_CLUSTER_01', compute_cost_usd: 480.50, events_processed_m: 84.2, credits_consumed: 168.6, cost_per_million_events: 5.71, idle_pct: 12 },
      { cluster_name: 'TRANSFORM_DBT_XL', compute_cost_usd: 840.20, events_processed_m: 62.8, credits_consumed: 294.8, cost_per_million_events: 13.38, idle_pct: 38 },
      { cluster_name: 'BI_ANALYTICS_QUERY', compute_cost_usd: 310.80, events_processed_m: 14.5, credits_consumed: 109.0, cost_per_million_events: 21.43, idle_pct: 65 },
      { cluster_name: 'CDC_KAFKA_GATEWAY', compute_cost_usd: 195.40, events_processed_m: 110.4, credits_consumed: 68.5, cost_per_million_events: 1.77, idle_pct: 4 },
      { cluster_name: 'ML_FEATURE_STORE', compute_cost_usd: 620.00, events_processed_m: 38.9, credits_consumed: 217.5, cost_per_million_events: 15.94, idle_pct: 22 }
    ],
    keyTakeaways: [
      'TRANSFORM_DBT_XL accounts for 34.3% of total weekly warehouse spend, primarily during hourly micro-batch compactions.',
      'CDC_KAFKA_GATEWAY achieved the highest cost-efficiency ratio at $1.77 per million processed events.',
      'Query pruning cache hit rate reached 89.4%, saving an estimated $420 in compute credits.'
    ],
    recommendation: 'Enable auto-suspend after 60 seconds on TRANSFORM_DBT_XL to prevent idle warehouse credit consumption during off-peak hours.',
    executionStats: {
      executionTimeMs: 52,
      bytesScanned: '210.5 MB',
      partitionPruningPct: 89.4,
      estimatedCostUsd: 0.18,
      warehouseCluster: 'FINOPS_MONITOR_WH',
      cacheHit: true
    },
    autoFormatMeta: {
      suggestedTitle: 'Warehouse Compute Cost vs Event Throughput',
      subtitle: 'Multi-Cluster Cost Efficiency & Throughput Comparison',
      primaryValueFormat: 'currency',
      unit: 'USD ($)'
    },
    followUpQuestions: [
      'Which warehouse queries consumed the most credits in TRANSFORM_DBT_XL?',
      'Simulate cost impact of reducing auto-suspend window from 5m to 1m',
      'Breakdown weekly spend by individual data engineering teams'
    ]
  });

  const effectiveChartType = chartTypeOverride || queryResult.chartType;

  // Execute Natural Language Query with Prompt Approach
  const handleExecuteNLQ = async (queryText?: string, modeOverride?: AIQueryPromptMode) => {
    const q = (queryText || question).trim();
    if (!q) return;

    const currentMode = modeOverride || promptMode;
    setIsLoading(true);
    setSelectedEntity(null);

    try {
      const res = await fetch('/api/gemini/nlq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          warehouseType,
          promptMode: currentMode,
          schemaContext: {
            tables: [
              { name: 'realtime_events', columns: ['event_id', 'event_type', 'user_id', 'amount_usd', 'region', 'latency_ms', 'status', 'created_at'] },
              { name: 'pipeline_telemetry', columns: ['pipeline_id', 'source', 'warehouse', 'throughput_eps', 'error_count', 'cpu_utilization', 'timestamp'] },
              { name: 'warehouse_billing', columns: ['cluster_name', 'credits_used', 'cost_usd', 'query_count', 'recorded_date'] }
            ]
          }
        }),
      });

      if (!res.ok) {
        throw new Error(`NLQ execution failed: ${res.statusText}`);
      }

      const data: AIQueryResult = await res.json();
      setQueryResult(data);
      setChartTypeOverride(data.chartType || 'bar');
      setActiveTab('preview');

      // Add to prompt history
      setHistory(prev => [
        {
          id: `hist-${Date.now()}`,
          question: q,
          timestamp: 'Just now',
          warehouseType: warehouseType.toUpperCase(),
          promptMode: currentMode,
          chartType: data.chartType || 'bar',
          rowCount: data.data?.length || 0
        },
        ...prev.slice(0, 9)
      ]);
    } catch (err) {
      console.error('Failed to execute NLQ:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySql = () => {
    if (queryResult.sql) {
      navigator.clipboard.writeText(queryResult.sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  const handleChartClick = (entry: any) => {
    if (entry && (entry.activePayload || entry.payload || entry.cluster_name || entry.pipeline_name || entry.time_window)) {
      const payload = entry.activePayload ? entry.activePayload[0]?.payload : (entry.payload || entry);
      setSelectedEntity(payload);
    }
  };

  // Filtered & Sorted Tabular Data
  const processedTableData = useMemo(() => {
    if (!queryResult?.data) return [];
    let list = [...queryResult.data];

    if (tableSearch.trim()) {
      const s = tableSearch.toLowerCase();
      list = list.filter(row => 
        Object.values(row).some(v => String(v).toLowerCase().includes(s))
      );
    }

    if (tableSortKey) {
      list.sort((a, b) => {
        const valA = a[tableSortKey];
        const valB = b[tableSortKey];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return tableSortDir === 'asc' ? valA - valB : valB - valA;
        }
        return tableSortDir === 'asc' 
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return list;
  }, [queryResult.data, tableSearch, tableSortKey, tableSortDir]);

  // Metric value formatter helper
  const formatMetricValue = (val: any, format?: string) => {
    if (val === null || val === undefined) return '-';
    if (typeof val !== 'number') return String(val);

    switch (format) {
      case 'currency':
        return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percentage':
        return `${val.toFixed(2)}%`;
      case 'latency':
        return `${val.toLocaleString()} ms`;
      case 'number':
      default:
        return val.toLocaleString();
    }
  };

  // Export results to CSV
  const handleExportCsv = () => {
    if (!queryResult.data || queryResult.data.length === 0) return;
    const headers = Object.keys(queryResult.data[0]);
    const csvRows = [
      headers.join(','),
      ...queryResult.data.map(row => 
        headers.map(h => `"${row[h] !== undefined ? row[h] : ''}"`).join(',')
      )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shoonyai_query_results_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" id="ai-query-assistant-module">
      
      {/* Module Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-xs">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>AI Query Assistant</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                    Prompt-Engineered NLQ
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Translate natural language questions into warehouse-optimized SQL with auto-formatted visualization previews.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
              <Database className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Warehouse:</span>
              <select
                value={warehouseType}
                onChange={(e) => setWarehouseType(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="snowflake">Snowflake Enterprise</option>
                <option value="bigquery">Google BigQuery</option>
                <option value="redshift">AWS Redshift</option>
                <option value="databricks">Databricks Delta</option>
                <option value="postgres">PostgreSQL</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>3 Warehouse Schemas Connected</span>
            </div>
          </div>
        </div>

        {/* Prompt Strategy Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              AI Prompt Strategy & Persona Mode:
            </span>
            <span className="text-[11px] text-slate-500">Tailors query optimization, join depth, and analytics focus</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PROMPT_STRATEGIES.map((strat) => {
              const Icon = strat.icon;
              const isSelected = promptMode === strat.id;
              return (
                <button
                  key={strat.id}
                  onClick={() => {
                    setPromptMode(strat.id);
                    handleExecuteNLQ(question, strat.id);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500/80 text-indigo-950 dark:text-indigo-200 shadow-xs'
                      : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold truncate">{strat.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                    {strat.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Natural Language Prompt Engine Bar */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-indigo-900/60 p-5 text-white shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Terminal className="w-4 h-4" />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Natural Language Prompt & Query Engine
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
              Gemini 3.8 Flash
            </span>
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Compare compute cost vs event throughput across all warehouse clusters..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-cyan-400"
              onKeyDown={(e) => e.key === 'Enter' && handleExecuteNLQ()}
            />
          </div>
          <button
            onClick={() => handleExecuteNLQ()}
            disabled={isLoading || !question.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing SQL & Preview...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Ask Query Assistant</span>
              </>
            )}
          </button>
        </div>

        {/* Curated Prompt Categories & Quick Chips */}
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold">Curated Prompts by Analytical Category:</span>
            <span className="text-[10px] text-slate-500">Click any prompt to compile SQL & auto-format chart</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {CURATED_PROMPT_CATEGORIES.flatMap(c => c.questions).slice(0, 4).map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuestion(q);
                  handleExecuteNLQ(q);
                }}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/70 hover:border-cyan-500/50 transition-all cursor-pointer truncate max-w-xs sm:max-w-md text-left"
              >
                &ldquo;{q}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assistant Output Container */}
      {queryResult && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          
          {/* Output Toolbar & Tab Switcher */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/40">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {queryResult.autoFormatMeta?.suggestedTitle || queryResult.title}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {effectiveChartType} preview
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                  {queryResult.warehouseType?.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {queryResult.autoFormatMeta?.subtitle || queryResult.sqlExplanation || 'Auto-formatted query results and interactive visualization preview.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Chart Type Overrides */}
              {activeTab === 'preview' && (
                <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <button
                    onClick={() => setChartTypeOverride('bar')}
                    title="Bar Chart"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      effectiveChartType === 'bar' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setChartTypeOverride('line')}
                    title="Line Chart"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      effectiveChartType === 'line' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setChartTypeOverride('area')}
                    title="Area Chart"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      effectiveChartType === 'area' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setChartTypeOverride('pie')}
                    title="Pie / Donut Chart"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      effectiveChartType === 'pie' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <PieIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setChartTypeOverride('scatter')}
                    title="Scatter Correlation Plot"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      effectiveChartType === 'scatter' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Crosshair className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* View Switcher Tabs */}
              <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Visualization Preview
                </button>
                <button
                  onClick={() => setActiveTab('results_table')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'results_table'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Results Table ({queryResult.data?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('sql_editor')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'sql_editor'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Generated SQL
                </button>
                <button
                  onClick={() => setActiveTab('prompt_inspection')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'prompt_inspection'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Prompt Strategy
                </button>
              </div>

              {/* Embed & Share Action */}
              <button
                onClick={() => setIsEmbedModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Embed Chart</span>
              </button>
            </div>
          </div>

          {/* Execution Telemetry Stats Bar */}
          {queryResult.executionStats && (
            <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Execution: <strong>{queryResult.executionStats.executionTimeMs} ms</strong></span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Database className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Scanned: <strong>{queryResult.executionStats.bytesScanned}</strong></span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Filter className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Pruned: <strong>{queryResult.executionStats.partitionPruningPct}% partitions</strong></span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                  <span>Estimated Cost: <strong>${queryResult.executionStats.estimatedCostUsd}</strong></span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                  Query Cache Hit
                </span>
                <span>Click data points to drill down</span>
              </div>
            </div>
          )}

          {/* Tab 1: Visualization Preview */}
          {activeTab === 'preview' && (
            <div className="p-5 sm:p-6 space-y-5">
              
              {/* Auto-Formatted Chart Canvas */}
              <div className="h-84 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {effectiveChartType === 'area' ? (
                    <AreaChart data={queryResult.data} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis dataKey={queryResult.xAxisKey} fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                        formatter={(val: any, name: any) => [typeof val === 'number' ? val.toLocaleString() : val, name]}
                      />
                      <Legend />
                      {queryResult.metrics?.map((m, idx) => (
                        <Area 
                          key={idx} 
                          type="monotone" 
                          dataKey={m.key} 
                          name={m.label} 
                          stroke={m.color} 
                          fill={m.color} 
                          fillOpacity={0.25} 
                          cursor="pointer"
                        />
                      ))}
                    </AreaChart>
                  ) : effectiveChartType === 'line' ? (
                    <LineChart data={queryResult.data} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis dataKey={queryResult.xAxisKey} fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                        formatter={(val: any, name: any) => [typeof val === 'number' ? val.toLocaleString() : val, name]}
                      />
                      <Legend />
                      {queryResult.metrics?.map((m, idx) => (
                        <Line 
                          key={idx} 
                          type="monotone" 
                          dataKey={m.key} 
                          name={m.label} 
                          stroke={m.color} 
                          strokeWidth={2.5} 
                          activeDot={{ r: 6 }} 
                          cursor="pointer"
                        />
                      ))}
                    </LineChart>
                  ) : effectiveChartType === 'pie' ? (
                    <PieChart onClick={handleChartClick}>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                        formatter={(val: any) => [typeof val === 'number' ? val.toLocaleString() : val, 'Value']}
                      />
                      <Legend />
                      <Pie
                        data={queryResult.data}
                        dataKey={queryResult.metrics?.[0]?.key}
                        nameKey={queryResult.xAxisKey}
                        cx="50%"
                        cy="50%"
                        outerRadius={105}
                        innerRadius={50}
                        paddingAngle={3}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        cursor="pointer"
                      >
                        {queryResult.data?.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  ) : effectiveChartType === 'scatter' ? (
                    <ScatterChart onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis 
                        dataKey={queryResult.metrics?.[0]?.key} 
                        name={queryResult.metrics?.[0]?.label} 
                        fontSize={11} 
                        stroke="#94a3b8" 
                      />
                      <YAxis 
                        dataKey={queryResult.metrics?.[1]?.key || queryResult.metrics?.[0]?.key} 
                        name={queryResult.metrics?.[1]?.label || queryResult.metrics?.[0]?.label} 
                        fontSize={11} 
                        stroke="#94a3b8" 
                      />
                      <ZAxis range={[120, 500]} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                      />
                      <Legend />
                      <Scatter 
                        name="Cluster Ingestion Profile" 
                        data={queryResult.data} 
                        fill="#6366f1" 
                        cursor="pointer"
                      />
                    </ScatterChart>
                  ) : (
                    <BarChart data={queryResult.data} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis dataKey={queryResult.xAxisKey} fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                        formatter={(val: any, name: any) => [typeof val === 'number' ? val.toLocaleString() : val, name]}
                      />
                      <Legend />
                      {queryResult.metrics?.map((m, idx) => (
                        <Bar 
                          key={idx} 
                          dataKey={m.key} 
                          name={m.label} 
                          fill={m.color} 
                          radius={[6, 6, 0, 0]} 
                          cursor="pointer"
                        />
                      ))}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Selected Entity Drill-Down Inspector */}
              {selectedEntity && (
                <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/80 animate-in fade-in space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold">
                        <Crosshair className="w-4 h-4" />
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Entity Drilldown: {selectedEntity[queryResult.xAxisKey]}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                        Inspected Record
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedEntity(null)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Dismiss Drilldown &times;
                    </button>
                  </div>

                  {/* Metric Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    {Object.entries(selectedEntity).filter(([k]) => k !== queryResult.xAxisKey).slice(0, 4).map(([key, val], idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">{key.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                          {typeof val === 'number' ? val.toLocaleString() : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Drilldown AI prompt suggestion */}
                  <div className="flex items-center gap-2 pt-1 text-xs text-indigo-900 dark:text-indigo-300">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Suggested Next Action:</span>
                    <button
                      onClick={() => {
                        const nextQ = `Why is ${selectedEntity[queryResult.xAxisKey]} consuming elevated credits relative to throughput?`;
                        setQuestion(nextQ);
                        handleExecuteNLQ(nextQ, 'root_cause');
                      }}
                      className="font-bold underline hover:text-indigo-600 dark:hover:text-indigo-200 cursor-pointer"
                    >
                      &ldquo;Deep dive root cause for {selectedEntity[queryResult.xAxisKey]}&rdquo; &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* Follow-up Prompts */}
              {queryResult.followUpQuestions && queryResult.followUpQuestions.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                    Follow-Up Exploratory Prompts:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {queryResult.followUpQuestions.map((fq, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setQuestion(fq);
                          handleExecuteNLQ(fq);
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span>{fq}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Results Table */}
          {activeTab === 'results_table' && (
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search result rows..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs w-48 text-slate-800 dark:text-slate-200"
                  />
                  <span className="text-xs text-slate-400">
                    Showing {processedTableData.length} of {queryResult.data?.length || 0} rows
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      {processedTableData.length > 0 && Object.keys(processedTableData[0]).map((col, idx) => (
                        <th 
                          key={idx} 
                          onClick={() => {
                            if (tableSortKey === col) {
                              setTableSortDir(d => d === 'asc' ? 'desc' : 'asc');
                            } else {
                              setTableSortKey(col);
                              setTableSortDir('desc');
                            }
                          }}
                          className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <div className="flex items-center gap-1">
                            <span>{col.replace(/_/g, ' ')}</span>
                            {tableSortKey === col && (
                              <span className="text-indigo-500 font-bold">{tableSortDir === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right">Drilldown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {processedTableData.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
                        {Object.values(row).map((val: any, cIdx) => (
                          <td key={cIdx} className="px-4 py-2.5 text-slate-800 dark:text-slate-200">
                            {typeof val === 'number' ? val.toLocaleString() : String(val)}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right font-sans">
                          <button
                            onClick={() => {
                              setSelectedEntity(row);
                              setActiveTab('preview');
                            }}
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                          >
                            Inspect &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Generated SQL Editor */}
          {activeTab === 'sql_editor' && (
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Warehouse-Optimized SQL Query
                  </h4>
                  <p className="text-xs text-slate-500">
                    Compiled dynamically for {queryResult.warehouseType?.toUpperCase()} with partition pruning and FinOps cost guards.
                  </p>
                </div>

                <button
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL'}</span>
                </button>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-cyan-300 border border-slate-800 overflow-x-auto shadow-inner">
                <pre className="leading-relaxed whitespace-pre-wrap">{queryResult.sql}</pre>
              </div>

              {queryResult.sqlExplanation && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">Execution Logic & Pruning Explanation:</span>
                  <p className="text-slate-600 dark:text-slate-300">{queryResult.sqlExplanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Prompt Strategy & Context Inspection */}
          {activeTab === 'prompt_inspection' && (
            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Prompt Engineering & Schema Context
                </h4>
                <p className="text-xs text-slate-500">
                  Inspect the structured prompt instructions and warehouse schema mappings injected into Gemini 3.8 Flash.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">Active Persona Strategy</span>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                      Mode: {queryResult.promptMode?.toUpperCase()}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      {PROMPT_STRATEGIES.find(s => s.id === queryResult.promptMode)?.description || 'Standard analytics evaluation.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">Injected Schema Tables</span>
                  <ul className="space-y-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    <li>• <strong className="text-indigo-600">realtime_events</strong>: (event_id, event_type, amount_usd, region, latency_ms)</li>
                    <li>• <strong className="text-indigo-600">pipeline_telemetry</strong>: (pipeline_id, warehouse, throughput_eps, error_count)</li>
                    <li>• <strong className="text-indigo-600">warehouse_billing</strong>: (cluster_name, credits_used, cost_usd, query_count)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* AI Insights & Prescriptive Recommendation Footer */}
          <div className="p-5 sm:p-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/40 dark:bg-slate-900/30">
            {/* Key Findings */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <span>Executive Data Findings</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                {queryResult.keyTakeaways?.map((t, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-500 font-bold">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Prescriptive Optimization */}
            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>AI Prescriptive Optimization</span>
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {queryResult.recommendation}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Embed Visualization Modal */}
      {queryResult && (
        <EmbedVisualizationModal
          isOpen={isEmbedModalOpen}
          onClose={() => setIsEmbedModalOpen(false)}
          visualization={{
            id: queryResult.id || 'viz-assistant-01',
            title: queryResult.autoFormatMeta?.suggestedTitle || queryResult.title || 'AI Warehouse Chart',
            chartType: effectiveChartType,
            sql: queryResult.sql,
            data: queryResult.data || [],
            metrics: queryResult.metrics || []
          }}
        />
      )}

    </div>
  );
};
