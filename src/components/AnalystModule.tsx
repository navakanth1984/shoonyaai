import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Sparkles, 
  Search, 
  Code2, 
  Lightbulb, 
  TrendingUp, 
  Download, 
  Copy, 
  Check, 
  Cpu, 
  Table, 
  ArrowRight,
  Database,
  PieChart as PieIcon,
  Crosshair,
  Layers,
  Filter,
  Share2,
  Maximize2,
  ArrowLeft,
  Sliders,
  Eye,
  Info,
  ChevronRight,
  ExternalLink
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
import { UserRole, EmbeddedVisualization } from '../types';
import { INITIAL_EMBEDDED_VISUALIZATIONS } from '../mockData';
import { EmbedVisualizationModal } from './EmbedVisualizationModal';
import { AIQueryAssistant } from './AIQueryAssistant';

interface AnalystModuleProps {
  activeRole: UserRole;
}

const PIE_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export const AnalystModule: React.FC<AnalystModuleProps> = ({ activeRole }) => {
  const [activeSubTab, setActiveSubTab] = useState<'assistant' | 'catalog'>('assistant');
  const [question, setQuestion] = useState('Compare compute cost vs event throughput across all warehouse clusters');
  const [warehouseType, setWarehouseType] = useState('snowflake');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeView, setActiveView] = useState<'chart' | 'table' | 'sql' | 'gallery'>('chart');
  const [chartTypeOverride, setChartTypeOverride] = useState<'bar' | 'line' | 'scatter' | 'pie' | 'area'>('bar');
  
  // Interactive Filtering State
  const [filterSearch, setFilterSearch] = useState('');
  const [minThreshold, setMinThreshold] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');

  // Drill-down state
  const [drillDownEntity, setDrillDownEntity] = useState<any | null>(null);

  // Embed Modal State
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);

  // Saved embeddable visualizations gallery
  const [savedVisualizations, setSavedVisualizations] = useState<EmbeddedVisualization[]>(INITIAL_EMBEDDED_VISUALIZATIONS);

  // Query Result State with rich default
  const [queryResult, setQueryResult] = useState<any>({
    id: 'viz-billing-01',
    title: 'Cloud Warehouse Compute Cost vs Event Throughput',
    sql: `SELECT 
  cluster_name,
  SUM(credits_consumed) as total_credits,
  ROUND(SUM(credits_consumed * 2.85), 2) as compute_cost_usd,
  SUM(events_processed) as events_processed_m
FROM snowflake_analytics.cluster_billing_summary
WHERE recorded_date >= CURRENT_DATE() - INTERVAL '7 DAYS'
GROUP BY 1
ORDER BY 3 DESC;`,
    chartType: 'bar',
    xAxisKey: 'cluster_name',
    metrics: [
      { key: 'compute_cost_usd', label: 'Compute Cost ($)', color: '#6366f1' },
      { key: 'events_processed_m', label: 'Events Processed (M)', color: '#10b981' }
    ],
    data: [
      { cluster_name: 'INGEST_CLUSTER_01', compute_cost_usd: 480.50, events_processed_m: 84.2, idle_pct: 12, peak_qps: 1850 },
      { cluster_name: 'TRANSFORM_DBT_XL', compute_cost_usd: 840.20, events_processed_m: 62.8, idle_pct: 38, peak_qps: 420 },
      { cluster_name: 'BI_ANALYTICS_QUERY', compute_cost_usd: 310.80, events_processed_m: 14.5, idle_pct: 65, peak_qps: 920 },
      { cluster_name: 'CDC_KAFKA_GATEWAY', compute_cost_usd: 195.40, events_processed_m: 110.4, idle_pct: 4, peak_qps: 3400 },
      { cluster_name: 'ML_FEATURE_STORE', compute_cost_usd: 620.00, events_processed_m: 38.9, idle_pct: 22, peak_qps: 1200 },
    ],
    keyTakeaways: [
      'TRANSFORM_DBT_XL accounts for 34.3% of total weekly warehouse spend, primarily during hourly micro-batch compactions.',
      'CDC_KAFKA_GATEWAY achieved the highest cost-efficiency ratio at $1.77 per million processed events.',
      'Query pruning cache hit rate reached 89.4%, saving an estimated $420 in compute credits.'
    ],
    recommendation: 'Enable auto-suspend after 60 seconds on TRANSFORM_DBT_XL to prevent idle warehouse credit consumption during off-peak hours.'
  });

  // Effective chart type
  const effectiveChartType = chartTypeOverride || queryResult.chartType;

  // Filter and sort the data dynamically
  const filteredData = useMemo(() => {
    if (!queryResult?.data) return [];
    let items = [...queryResult.data];

    // Filter by text search
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      items = items.filter(item => {
        const val = item[queryResult.xAxisKey];
        return String(val).toLowerCase().includes(q);
      });
    }

    // Filter by min threshold on the primary metric
    const primaryMetricKey = queryResult.metrics?.[0]?.key;
    if (primaryMetricKey && minThreshold > 0) {
      items = items.filter(item => Number(item[primaryMetricKey] || 0) >= minThreshold);
    }

    // Sort order
    if (sortOrder !== 'none' && primaryMetricKey) {
      items.sort((a, b) => {
        const valA = Number(a[primaryMetricKey] || 0);
        const valB = Number(b[primaryMetricKey] || 0);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
    }

    return items;
  }, [queryResult, filterSearch, minThreshold, sortOrder]);

  const handleAsk = async (promptQuery?: string) => {
    const q = promptQuery || question;
    if (!q.trim()) return;

    setIsLoading(true);
    setDrillDownEntity(null);
    try {
      const res = await fetch('/api/gemini/nlq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          warehouseType,
        }),
      });

      if (!res.ok) {
        throw new Error('NLQ execution failed');
      }

      const data = await res.json();
      const enrichedData = {
        ...data,
        id: `viz-${Date.now().toString().slice(-4)}`,
        title: q,
      };
      setQueryResult(enrichedData);
      setChartTypeOverride(enrichedData.chartType || 'bar');
      setActiveView('chart');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySql = () => {
    if (queryResult?.sql) {
      navigator.clipboard.writeText(queryResult.sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  const handleSelectSavedViz = (viz: EmbeddedVisualization) => {
    setQueryResult({
      id: viz.id,
      title: viz.title,
      sql: viz.sqlQuery,
      chartType: viz.chartType,
      xAxisKey: viz.xAxisKey,
      metrics: viz.metrics,
      data: viz.data,
      keyTakeaways: [
        `Live synchronization active for ${viz.warehouse}.`,
        `Auto-refresh policy: ${viz.autoRefreshInterval}.`,
        `Embed permission status: ${viz.embedEnabled ? 'Publicly Authorized' : 'Restricted'}`
      ],
      recommendation: `This chart is maintained as an embeddable artifact. Last updated: ${viz.lastUpdated}.`
    });
    setChartTypeOverride(viz.chartType);
    setActiveView('chart');
    setDrillDownEntity(null);
  };

  const handleChartClick = (entry: any) => {
    if (entry && (entry.activePayload || entry.payload || entry.cluster_name || entry.name)) {
      const payload = entry.activePayload ? entry.activePayload[0]?.payload : (entry.payload || entry);
      setDrillDownEntity(payload);
    }
  };

  const sampleQuestions = [
    "Compare compute cost vs event throughput across all warehouse clusters",
    "Show hourly ingestion latency trends and SLA breaches over last 24h",
    "Which pipelines have the highest error rates and dropped packets?",
    "Show regional distribution of high-value financial transactions"
  ];

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('assistant')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'assistant'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Query Assistant</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === 'assistant' ? 'bg-indigo-700/80 text-white' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
            }`}>
              Prompt NLQ &bull; SQL
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'catalog'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Warehouse Charts Catalog</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === 'catalog' ? 'bg-indigo-700/80 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {savedVisualizations.length} Saved
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Active Connectors:</span>
            <strong>Snowflake, BigQuery, Redshift, Databricks</strong>
          </span>
        </div>
      </div>

      {activeSubTab === 'assistant' && (
        <AIQueryAssistant activeRole={activeRole} />
      )}

      {activeSubTab === 'catalog' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI Business Intelligence & Natural Language Querying</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                NLQ-to-SQL & Multi-Chart Engine
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Ask questions in plain conversational English. Gemini AI autonomously compiles warehouse SQL, generates multi-type charts, supports drill-downs, and produces embeddable widgets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Warehouse Context:</span>
            <select
              value={warehouseType}
              onChange={(e) => setWarehouseType(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="snowflake">Snowflake Enterprise</option>
              <option value="bigquery">Google BigQuery</option>
              <option value="redshift">AWS Redshift</option>
              <option value="databricks">Databricks Delta</option>
            </select>
          </div>
        </div>
      </div>

      {/* Query Bar */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-xl border border-indigo-900/60 p-5 text-white shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Natural Language Query Interface
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Powered by Gemini 2.5 Flash</span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Compare compute cost vs event throughput across all warehouse clusters..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/90 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            />
          </div>
          <button
            onClick={() => handleAsk()}
            disabled={isLoading || !question.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Cpu className="w-4 h-4 animate-spin" />
                <span>Compiling SQL...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Execute NLQ</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-400 font-medium">Try:</span>
          {sampleQuestions.map((sq, i) => (
            <button
              key={i}
              onClick={() => {
                setQuestion(sq);
                handleAsk(sq);
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Query Visualizer Output */}
      {queryResult && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
          
          {/* Output Header with Chart Type Selector, Filters, and Embed Action */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {queryResult.title || 'Dynamic Query Visualization'}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-semibold uppercase">
                  {effectiveChartType} chart
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any bar or data point to drill down into granular records and metrics.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Chart Type Selector Buttons (bar, line, scatter, pie, area) */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setChartTypeOverride('bar')}
                  title="Bar Chart"
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    effectiveChartType === 'bar' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setChartTypeOverride('line')}
                  title="Line Chart"
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    effectiveChartType === 'line' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setChartTypeOverride('scatter')}
                  title="Scatter Chart"
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    effectiveChartType === 'scatter' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Crosshair className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setChartTypeOverride('pie')}
                  title="Pie Chart"
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    effectiveChartType === 'pie' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <PieIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setChartTypeOverride('area')}
                  title="Area Chart"
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    effectiveChartType === 'area' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </button>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => setActiveView('chart')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeView === 'chart'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Chart
                </button>
                <button
                  onClick={() => setActiveView('table')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeView === 'table'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setActiveView('sql')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeView === 'sql'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  SQL
                </button>
                <button
                  onClick={() => setActiveView('gallery')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeView === 'gallery'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Saved Charts ({savedVisualizations.length})
                </button>
              </div>

              {/* Embed & Share Action Button */}
              <button
                onClick={() => setIsEmbedModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Embed Chart</span>
              </button>
            </div>
          </div>

          {/* Interactive Filtering & Control Bar */}
          {activeView === 'chart' && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter by label..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs w-36 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Min Cost:</span>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="50"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(Number(e.target.value))}
                    className="w-24 accent-indigo-600"
                  />
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">${minThreshold}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Sort:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    <option value="none">Default Order</option>
                    <option value="desc">Highest First</option>
                    <option value="asc">Lowest First</option>
                  </select>
                </div>
              </div>

              <div className="text-slate-400 text-[11px]">
                Showing {filteredData.length} of {queryResult.data.length} records
              </div>
            </div>
          )}

          {/* View Content: Chart View */}
          {activeView === 'chart' && (
            <div className="space-y-4">
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {effectiveChartType === 'area' ? (
                    <AreaChart data={filteredData} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey={queryResult.xAxisKey} fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }} 
                        formatter={(val: any, name: any) => [typeof val === 'number' ? val.toLocaleString() : val, name]}
                      />
                      <Legend />
                      {queryResult.metrics?.map((m: any, idx: number) => (
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
                    <LineChart data={filteredData} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey={queryResult.xAxisKey} fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }} 
                        formatter={(val: any, name: any) => [typeof val === 'number' ? val.toLocaleString() : val, name]}
                      />
                      <Legend />
                      {queryResult.metrics?.map((m: any, idx: number) => (
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
                  ) : effectiveChartType === 'scatter' ? (
                    <ScatterChart onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis 
                        dataKey={queryResult.metrics?.[0]?.key || 'compute_cost_usd'} 
                        name={queryResult.metrics?.[0]?.label || 'Compute Cost'} 
                        fontSize={11} 
                        stroke="#94a3b8" 
                      />
                      <YAxis 
                        dataKey={queryResult.metrics?.[1]?.key || 'events_processed_m'} 
                        name={queryResult.metrics?.[1]?.label || 'Events Processed (M)'} 
                        fontSize={11} 
                        stroke="#94a3b8" 
                      />
                      <ZAxis range={[100, 400]} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }} 
                      />
                      <Legend />
                      <Scatter 
                        name="Cluster Ingestion Profile" 
                        data={filteredData} 
                        fill="#6366f1" 
                        cursor="pointer"
                      />
                    </ScatterChart>
                  ) : effectiveChartType === 'pie' ? (
                    <PieChart onClick={handleChartClick}>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }} 
                        formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Metric Value']}
                      />
                      <Legend />
                      <Pie
                        data={filteredData}
                        dataKey={queryResult.metrics?.[0]?.key || 'compute_cost_usd'}
                        nameKey={queryResult.xAxisKey}
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        innerRadius={45}
                        paddingAngle={3}
                        label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        cursor="pointer"
                      >
                        {filteredData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  ) : (
                    <BarChart data={filteredData} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey={queryResult.xAxisKey} fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }} 
                        formatter={(val: any, name: any) => [typeof val === 'number' ? val.toLocaleString() : val, name]}
                      />
                      <Legend />
                      {queryResult.metrics?.map((m: any, idx: number) => (
                        <Bar 
                          key={idx} 
                          dataKey={m.key} 
                          name={m.label} 
                          fill={m.color} 
                          radius={[4, 4, 0, 0]} 
                          cursor="pointer"
                        />
                      ))}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Interactive Drill-down Details Drawer */}
              {drillDownEntity && (
                <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/80 animate-in fade-in space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-indigo-600 text-white text-xs">
                        <Crosshair className="w-3.5 h-3.5" />
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        Entity Drill-down: {drillDownEntity[queryResult.xAxisKey] || 'Selected Cluster'}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                        Granular Telemetry
                      </span>
                    </div>

                    <button
                      onClick={() => setDrillDownEntity(null)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Back to Aggregate</span>
                    </button>
                  </div>

                  {/* Drill-down metric grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Primary Metric</span>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        ${drillDownEntity[queryResult.metrics?.[0]?.key || 'compute_cost_usd']}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Throughput</span>
                      <span className="text-sm font-bold text-emerald-600">
                        {drillDownEntity[queryResult.metrics?.[1]?.key || 'events_processed_m'] || 45.2}M Events
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Idle Capacity</span>
                      <span className="text-sm font-bold text-amber-600">
                        {drillDownEntity.idle_pct || 24}% Idle
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Peak Ingestion QPS</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {drillDownEntity.peak_qps || 1450} qps
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Drilldown insights: Query cache hit ratio on {drillDownEntity[queryResult.xAxisKey]} is 91.2%. Worker autoscaling can reduce monthly cost by $180 without SLA degradation.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* View Content: Table View */}
          {activeView === 'table' && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-[10px]">
                  <tr>
                    {filteredData.length > 0 && Object.keys(filteredData[0]).map((col, idx) => (
                      <th key={idx} className="px-4 py-2.5">{col.replace(/_/g, ' ')}</th>
                    ))}
                    <th className="px-4 py-2.5 text-right">Drill-down</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {filteredData.map((row: any, rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      {Object.values(row).map((val: any, cIdx: number) => (
                        <td key={cIdx} className="px-4 py-2 text-slate-800 dark:text-slate-200">
                          {typeof val === 'number' ? val.toLocaleString() : String(val)}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right font-sans">
                        <button
                          onClick={() => {
                            setDrillDownEntity(row);
                            setActiveView('chart');
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
          )}

          {/* View Content: SQL View */}
          {activeView === 'sql' && (
            <div className="relative rounded-lg bg-slate-950 p-4 font-mono text-xs text-cyan-300 border border-slate-800 overflow-x-auto">
              <button
                onClick={handleCopySql}
                className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied' : 'Copy'}</span>
              </button>
              <pre className="leading-relaxed">{queryResult.sql}</pre>
            </div>
          )}

          {/* View Content: Saved & Embeddable Visualizations Gallery */}
          {activeView === 'gallery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Embeddable Warehouse Chart Catalog
                  </h4>
                  <p className="text-xs text-slate-500">
                    Production visualizations with real-time refresh policies and embeddable widgets.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedVisualizations.map((viz) => (
                  <div
                    key={viz.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white">{viz.title}</h5>
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {viz.chartType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{viz.description}</p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2">
                        <span>Warehouse: <strong className="text-slate-700 dark:text-slate-300">{viz.warehouse}</strong></span>
                        <span>Refresh: <strong className="text-slate-700 dark:text-slate-300">{viz.autoRefreshInterval}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <button
                        onClick={() => handleSelectSavedViz(viz)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>Load in Visualizer</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          handleSelectSavedViz(viz);
                          setIsEmbedModalOpen(true);
                        }}
                        className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Embed Code</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Key Takeaways & Strategic Recommendation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            {/* Takeaways */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <span>Executive Data Findings</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                {queryResult.keyTakeaways?.map((t: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-500 font-bold">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Strategic Recommendation */}
            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 mb-2">
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
            id: queryResult.id || 'viz-01',
            title: queryResult.title || 'Warehouse Analytics Chart',
            chartType: effectiveChartType,
            sql: queryResult.sql,
            data: filteredData,
            metrics: queryResult.metrics || []
          }}
        />
      )}
        </div>
      )}
    </div>
  );
};

