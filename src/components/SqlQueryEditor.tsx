import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Database,
  Search,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Download,
  Table as TableIcon,
  BarChart2,
  Clock,
  Zap,
  ChevronRight,
  ChevronDown,
  Cpu,
  DollarSign,
  AlertCircle,
  FileCode,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Terminal,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  WarehouseType,
  WarehouseConnection,
  WarehouseTableMeta,
  SqlQueryExecutionResult,
  SqlQueryHistoryEntry,
  SqlColumnDef
} from '../types';
import { INITIAL_WAREHOUSES } from '../mockData';

interface SqlQueryEditorProps {
  initialSql?: string;
  defaultWarehouse?: WarehouseType;
  onSendToVizAssistant?: (sql: string, title?: string) => void;
}

const PRESET_QUERIES = [
  {
    title: 'Cluster Compute Billing & Credit Burn',
    category: 'FinOps',
    sql: `SELECT
  cluster_name,
  credits_consumed,
  compute_cost_usd,
  events_processed_millions,
  ROUND(compute_cost_usd / NULLIF(events_processed_millions, 0), 2) as cost_per_million,
  idle_percentage
FROM snowflake_analytics.cluster_billing_summary
ORDER BY compute_cost_usd DESC;`
  },
  {
    title: 'P95 & P99 Latency SLA Attainment',
    category: 'Telemetry',
    sql: `SELECT
  time_window,
  pipeline_id,
  avg_latency_ms,
  p95_latency_ms,
  p99_latency_ms,
  sla_limit_ms,
  sla_breach_count
FROM SYSTEM_TELEMETRY.pipeline_latency_log
WHERE recorded_at >= CURRENT_TIMESTAMP() - INTERVAL '24 HOURS'
ORDER BY time_window DESC;`
  },
  {
    title: 'Recent High-Value Settled Transactions',
    category: 'Financial',
    sql: `SELECT
  transaction_id,
  account_id,
  account_region,
  amount_usd,
  fee_usd,
  currency,
  fraud_risk_score,
  settled_at
FROM FINANCE_REPORTING.financial_transactions_daily
WHERE amount_usd >= 2000.00
ORDER BY amount_usd DESC
LIMIT 25;`
  },
  {
    title: 'Orders Fact Regional Revenue & Payments',
    category: 'Core Mart',
    sql: `SELECT
  order_id,
  customer_id,
  customer_region,
  order_amount_usd,
  payment_method,
  order_status,
  order_created_at
FROM PUBLIC_MARTS.orders_fact
ORDER BY order_created_at DESC
LIMIT 20;`
  },
  {
    title: 'Customer 360 LTV & Churn Cohort Breakdown',
    category: 'CDP',
    sql: `SELECT
  customer_id,
  customer_tier,
  country_code,
  lifetime_value_usd,
  orders_count,
  churn_risk_pct,
  created_at
FROM CDP_DIMENSIONS.customer_360_dim
WHERE lifetime_value_usd > 10000
ORDER BY lifetime_value_usd DESC;`
  },
  {
    title: 'Pipeline Stream Ingestion Errors & Packet Drops',
    category: 'Telemetry',
    sql: `SELECT
  pipeline_name,
  total_records,
  dropped_records,
  ROUND((dropped_records * 100.0) / total_records, 3) as error_rate_pct,
  top_error_code,
  status
FROM SYSTEM_TELEMETRY.pipeline_error_stream
ORDER BY dropped_records DESC;`
  }
];

export const SqlQueryEditor: React.FC<SqlQueryEditorProps> = ({
  initialSql,
  defaultWarehouse = 'snowflake',
  onSendToVizAssistant
}) => {
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType>(defaultWarehouse);
  const [sql, setSql] = useState<string>(
    initialSql || PRESET_QUERIES[0].sql
  );
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<SqlQueryExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tables, setTables] = useState<WarehouseTableMeta[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(false);
  const [schemaSearch, setSchemaSearch] = useState<string>('');
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({
    'orders_fact': true,
    'cluster_billing_summary': true
  });
  const [activeResultView, setActiveResultView] = useState<'table' | 'explain' | 'chart'>('table');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [copiedData, setCopiedData] = useState<boolean>(false);
  const [history, setHistory] = useState<SqlQueryHistoryEntry[]>([]);
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initialSql prop when provided
  useEffect(() => {
    if (initialSql && initialSql !== sql) {
      setSql(initialSql);
    }
  }, [initialSql]);

  // Fetch Warehouse Table Catalog
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      setIsLoadingTables(true);
      try {
        const res = await fetch(`/api/warehouse/tables?warehouse=${selectedWarehouse}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.tables) {
            setTables(data.tables);
          }
        }
      } catch (err) {
        console.error('Failed to load warehouse tables:', err);
      } finally {
        if (isMounted) setIsLoadingTables(false);
      }
    };
    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, [selectedWarehouse]);

  // Auto-run initial query on mount so user sees instant results
  useEffect(() => {
    handleExecuteQuery(sql);
  }, []);

  const handleExecuteQuery = async (queryToRun?: string) => {
    const q = (queryToRun !== undefined ? queryToRun : sql).trim();
    if (!q) {
      setErrorMessage('Please enter an SQL query to execute.');
      return;
    }

    setIsExecuting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/warehouse/execute-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: q,
          warehouse: selectedWarehouse,
          maxRows: 50
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'SQL execution failed on cloud warehouse');
      }

      setExecutionResult(data);
      setCurrentPage(1);
      setSortColumn(null);

      // Add to query history
      const newHistoryItem: SqlQueryHistoryEntry = {
        id: data.queryId || `h-${Date.now()}`,
        sql: q,
        warehouse: selectedWarehouse,
        status: 'success',
        rowCount: data.rowCount,
        executionTimeMs: data.executionTimeMs,
        timestamp: new Date().toLocaleTimeString()
      };
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing SQL query.');
      const failedHistoryItem: SqlQueryHistoryEntry = {
        id: `h-err-${Date.now()}`,
        sql: q,
        warehouse: selectedWarehouse,
        status: 'error',
        errorMessage: err.message,
        timestamp: new Date().toLocaleTimeString()
      };
      setHistory(prev => [failedHistoryItem, ...prev.slice(0, 9)]);
    } finally {
      setIsExecuting(false);
    }
  };

  // Keyboard shortcut handler (Ctrl+Enter / Cmd+Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecuteQuery();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newSql = sql.substring(0, start) + '  ' + sql.substring(end);
      setSql(newSql);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Quick SQL Formatter
  const handleFormatSql = () => {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'JOIN', 'LEFT JOIN',
      'RIGHT JOIN', 'INNER JOIN', 'ON', 'AND', 'OR', 'HAVING', 'AS', 'WITH', 'UNION ALL',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DESC', 'ASC', 'INTERVAL', 'NULLIF', 'ROUND', 'SUM', 'AVG', 'COUNT'
    ];

    let formatted = sql;
    keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      formatted = formatted.replace(regex, kw);
    });

    setSql(formatted);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleExportCsv = () => {
    if (!executionResult || !executionResult.rows.length) return;
    const cols = executionResult.columns.map(c => c.name);
    const header = cols.join(',');
    const rows = executionResult.rows.map(row =>
      cols.map(c => {
        const val = row[c];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      }).join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `warehouse_query_${selectedWarehouse}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyJson = () => {
    if (!executionResult?.rows) return;
    navigator.clipboard.writeText(JSON.stringify(executionResult.rows, null, 2));
    setCopiedData(true);
    setTimeout(() => setCopiedData(false), 2000);
  };

  const handleInsertTableSelect = (tableName: string) => {
    const template = `SELECT * FROM ${tableName} LIMIT 20;`;
    setSql(template);
    handleExecuteQuery(template);
  };

  const handleInsertColumnName = (colName: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newSql = sql.substring(0, start) + colName + sql.substring(end);
      setSql(newSql);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + colName.length;
        }
      }, 0);
    } else {
      setSql(prev => `${prev} ${colName}`);
    }
  };

  const toggleTableExpand = (name: string) => {
    setExpandedTables(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Filtered Schema Tables
  const filteredTables = useMemo(() => {
    if (!schemaSearch.trim()) return tables;
    const q = schemaSearch.toLowerCase();
    return tables.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.schema.toLowerCase().includes(q) ||
      t.columns.some(c => c.name.toLowerCase().includes(q))
    );
  }, [tables, schemaSearch]);

  // Filter & Sort Result Rows
  const filteredRows = useMemo(() => {
    if (!executionResult?.rows) return [];
    let list = [...executionResult.rows];

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
      );
    }

    if (sortColumn) {
      list.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return list;
  }, [executionResult, tableSearch, sortColumn, sortDirection]);

  // Paginated Rows
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
  };

  // Find suitable columns for Quick Chart Preview
  const chartPreviewConfig = useMemo(() => {
    if (!executionResult || !executionResult.columns.length || !executionResult.rows.length) {
      return null;
    }
    const stringCol = executionResult.columns.find(c => c.type === 'string' || c.type === 'timestamp') || executionResult.columns[0];
    const numCols = executionResult.columns.filter(c => c.type === 'number');

    if (!numCols.length) return null;

    return {
      xKey: stringCol.name,
      metrics: numCols.slice(0, 3).map((nc, idx) => ({
        key: nc.name,
        color: idx === 0 ? '#6366f1' : idx === 1 ? '#06b6d4' : '#10b981'
      }))
    };
  }, [executionResult]);

  const activeWarehouseInfo = INITIAL_WAREHOUSES.find(w => w.type === selectedWarehouse) || INITIAL_WAREHOUSES[0];

  return (
    <div className="space-y-4">
      {/* Top Banner & Warehouse Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Cloud Warehouse SQL Query Editor
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Synced &amp; Live
                </span>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                  Read-Only Analytical Safe
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Directly write and execute analytical SQL against your synchronized enterprise data warehouse clusters.
              </p>
            </div>
          </div>

          {/* Right Controls: Warehouse Selector & Presets */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Database className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Warehouse</span>
                <select
                  id="warehouse-target-select"
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value as WarehouseType)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="snowflake">Snowflake Enterprise (AWS-US-EAST)</option>
                  <option value="bigquery">Google BigQuery (US-CENTRAL1)</option>
                  <option value="redshift">AWS Redshift Serverless</option>
                  <option value="databricks">Databricks Delta Lake (Azure-EastUS)</option>
                </select>
              </div>
            </div>

            <button
              id="btn-toggle-catalog"
              onClick={() => setIsCatalogOpen(!isCatalogOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isCatalogOpen
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>{isCatalogOpen ? 'Hide Schema' : 'Show Schema'}</span>
            </button>
          </div>
        </div>

        {/* Warehouse Cluster Specs Pill Banner */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Host:</span>
              <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-600 dark:text-slate-300">
                {activeWarehouseInfo.host}
              </code>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Database:</span>
              <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">{activeWarehouseInfo.database}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Latency:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{activeWarehouseInfo.latencyMs}ms</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Quick Templates:</span>
            <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
              {PRESET_QUERIES.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSql(preset.sql);
                    handleExecuteQuery(preset.sql);
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 transition-colors shrink-0 cursor-pointer border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                >
                  {preset.title.split(' ')[0]} {preset.title.split(' ')[1]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Schema Sidebar + Query Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Schema & Table Explorer Sidebar */}
        {isCatalogOpen && (
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Warehouse Tables
                </span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {tables.length} Synced
              </span>
            </div>

            {/* Search schema */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={schemaSearch}
                onChange={(e) => setSchemaSearch(e.target.value)}
                placeholder="Search tables & columns..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Tables List */}
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              {isLoadingTables ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-indigo-500" />
                  Loading warehouse catalog...
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No matching tables or columns found.
                </div>
              ) : (
                filteredTables.map((table) => {
                  const isExpanded = !!expandedTables[table.name];
                  return (
                    <div
                      key={table.name}
                      className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 overflow-hidden"
                    >
                      {/* Table Header Row */}
                      <div
                        onClick={() => toggleTableExpand(table.name)}
                        className="flex items-center justify-between p-2 hover:bg-slate-100/70 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <TableIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {table.name}
                          </span>
                        </div>
                        <button
                          title="Generate SELECT * query"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInsertTableSelect(table.name);
                          }}
                          className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 transition-colors"
                        >
                          SELECT
                        </button>
                      </div>

                      {/* Expanded Columns List */}
                      {isExpanded && (
                        <div className="px-2.5 pb-2 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1 bg-white/60 dark:bg-slate-900/60">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1">
                            <span>{table.schema}</span>
                            <span>{(table.rowCount / 1000000).toFixed(1)}M rows</span>
                          </div>
                          {table.columns.map((col) => (
                            <div
                              key={col.name}
                              onClick={() => handleInsertColumnName(col.name)}
                              className="group flex items-center justify-between text-[11px] py-0.5 px-1.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                            >
                              <span className="font-mono truncate">{col.name}</span>
                              <span
                                className={`text-[9px] font-bold px-1 rounded uppercase tracking-wider ${
                                  col.type === 'number'
                                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                    : col.type === 'timestamp'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    : col.type === 'boolean'
                                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {col.type === 'number' ? 'num' : col.type === 'timestamp' ? 'time' : col.type === 'boolean' ? 'bool' : 'str'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Helper Note */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              Tip: Click any column to insert its identifier into the SQL editor canvas.
            </div>
          </div>
        )}

        {/* SQL Code Canvas & Actions */}
        <div className={`${isCatalogOpen ? 'lg:col-span-9' : 'lg:col-span-12'} space-y-4`}>
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                <span className="text-xs font-mono text-slate-400 ml-2 font-medium">
                  warehouse_query.sql &bull; {selectedWarehouse.toUpperCase()}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  id="btn-format-sql"
                  onClick={handleFormatSql}
                  title="Auto-format SQL keywords"
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Format</span>
                </button>

                <button
                  id="btn-copy-sql"
                  onClick={handleCopySql}
                  title="Copy SQL to clipboard"
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-clear-sql"
                  onClick={() => setSql('')}
                  title="Clear SQL editor"
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>

                <button
                  id="btn-run-sql"
                  onClick={() => handleExecuteQuery()}
                  disabled={isExecuting}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm hover:shadow-indigo-500/20 cursor-pointer ml-1"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run Query</span>
                      <span className="hidden sm:inline text-[10px] bg-indigo-700 px-1 py-0.2 rounded font-mono">
                        ⌘↵
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Input Canvas */}
            <div className="relative p-3 bg-slate-900">
              <textarea
                ref={textareaRef}
                id="sql-query-canvas"
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={7}
                spellCheck={false}
                placeholder="-- Write SQL against your synced warehouse tables (SELECT, WITH, EXPLAIN)...&#10;SELECT * FROM orders_fact LIMIT 20;"
                className="w-full bg-transparent text-emerald-300 font-mono text-xs sm:text-sm leading-relaxed focus:outline-none resize-y min-h-[140px] selection:bg-indigo-500/30 selection:text-white placeholder:text-slate-600"
              />
            </div>

            {/* Bottom Editor Status Bar */}
            <div className="px-4 py-1.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-3">
                <span>Lines: {sql.split('\n').length}</span>
                <span>Characters: {sql.length}</span>
                <span className="hidden sm:inline">Shortcut: [Cmd/Ctrl + Enter] to run</span>
              </div>

              {history.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>Recent:</span>
                  <button
                    onClick={() => {
                      setSql(history[0].sql);
                      handleExecuteQuery(history[0].sql);
                    }}
                    className="text-indigo-400 hover:underline truncate max-w-[120px]"
                  >
                    {history[0].sql.substring(0, 20)}...
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Error Message Card */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">SQL Execution Diagnostics:</div>
                <div className="font-mono text-[11px]">{errorMessage}</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Ensure queries follow analytical syntax (`SELECT ... FROM ... WHERE ...`). Write and mutation statements are guarded for role security.
                </div>
              </div>
            </div>
          )}

          {/* Query Results Section */}
          {executionResult && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-0">
              {/* Telemetry Stats Ribbon */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {executionResult.rowCount} rows
                    </span>
                    <span className="text-slate-400">returned</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Duration:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {executionResult.executionTimeMs}ms
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <Database className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Scanned:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {executionResult.bytesScanned}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <Cpu className="w-3.5 h-3.5 text-amber-500" />
                    <span>Cluster:</span>
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {executionResult.warehouseCluster}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Cost:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      ${executionResult.costUsd.toFixed(3)}
                    </span>
                  </div>
                </div>

                {/* View Switcher: Table / Explain / Chart */}
                <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    id="btn-view-table"
                    onClick={() => setActiveResultView('table')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeResultView === 'table'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>

                  <button
                    id="btn-view-explain"
                    onClick={() => setActiveResultView('explain')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeResultView === 'explain'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Explain Plan</span>
                  </button>

                  {chartPreviewConfig && (
                    <button
                      id="btn-view-chart"
                      onClick={() => setActiveResultView('chart')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeResultView === 'chart'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Chart Preview</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Table Action Toolbar */}
              {activeResultView === 'table' && (
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={(e) => {
                        setTableSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Filter returned rows..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span>Rows:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleExportCsv}
                        title="Download CSV"
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-500" />
                        <span>CSV</span>
                      </button>

                      <button
                        onClick={handleCopyJson}
                        title="Copy rows as JSON"
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedData ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>JSON</span>
                          </>
                        )}
                      </button>

                      {onSendToVizAssistant && (
                        <button
                          onClick={() => onSendToVizAssistant(sql, 'Custom Warehouse SQL Query')}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Send to AI Assistant</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* View 1: Formatted Tabular Results */}
              {activeResultView === 'table' && (
                <div>
                  <div className="overflow-x-auto max-h-[460px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center text-slate-400 font-mono text-[10px]">#</th>
                          {executionResult.columns.map((col) => {
                            const isSorted = sortColumn === col.name;
                            return (
                              <th
                                key={col.name}
                                onClick={() => handleSort(col.name)}
                                className="py-2.5 px-3 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none whitespace-nowrap"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span>{col.name}</span>
                                  <span className="text-[9px] font-bold px-1 rounded uppercase tracking-wider bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                    {col.type === 'number' ? 'num' : col.type === 'timestamp' ? 'time' : col.type === 'boolean' ? 'bool' : 'str'}
                                  </span>
                                  {isSorted ? (
                                    sortDirection === 'asc' ? (
                                      <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                    ) : (
                                      <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                    )
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 shrink-0" />
                                  )}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={executionResult.columns.length + 1}
                              className="py-8 text-center text-slate-400 text-xs"
                            >
                              No records match the current filter.
                            </td>
                          </tr>
                        ) : (
                          paginatedRows.map((row, rIdx) => {
                            const absoluteIdx = (currentPage - 1) * pageSize + rIdx + 1;
                            return (
                              <tr
                                key={rIdx}
                                className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors"
                              >
                                <td className="py-2 px-3 text-center text-[10px] font-mono text-slate-400">
                                  {absoluteIdx}
                                </td>
                                {executionResult.columns.map((col) => {
                                  const val = row[col.name];
                                  return (
                                    <td
                                      key={col.name}
                                      className="py-2 px-3 whitespace-nowrap text-slate-800 dark:text-slate-200 font-mono text-xs"
                                    >
                                      {val === null || val === undefined ? (
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 italic bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                          NULL
                                        </span>
                                      ) : typeof val === 'boolean' ? (
                                        <span
                                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            val
                                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                          }`}
                                        >
                                          {val ? 'TRUE' : 'FALSE'}
                                        </span>
                                      ) : col.type === 'number' ? (
                                        <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                                          {typeof val === 'number'
                                            ? col.name.includes('cost') || col.name.includes('amount') || col.name.includes('usd') || col.name.includes('spend')
                                              ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                              : val.toLocaleString()
                                            : val}
                                        </span>
                                      ) : (
                                        <span>{String(val)}</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(filteredRows.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(filteredRows.length, currentPage * pageSize)}</span> of{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredRows.length}</span> rows
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="px-2 text-xs font-mono">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* View 2: Explain Execution Plan */}
              {activeResultView === 'explain' && (
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        Warehouse Physical Execution &amp; Pruning Plan
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Breakdown of SIMD vectorized scans, predicate pushdowns, partition pruning, and operator cost weights.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                      Micro-Partition Pruned 94.2%
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {(executionResult.explainPlan || [
                      { step: 1, operation: 'TABLE_SCAN (Micro-partition Pruned)', details: 'Pruned 92% of non-matching date partitions', costPct: 20 },
                      { step: 2, operation: 'FILTER & PREDICATE PUSH DOWN', details: 'Applied WHERE conditions prior to network shuffle', costPct: 25 },
                      { step: 3, operation: 'HASH AGGREGATE / GROUP BY', details: 'Computed parallel multi-column aggregates', costPct: 40 },
                      { step: 4, operation: 'ORDER BY & RESULT BUFFER', details: 'Sorted and streamed to client output channel', costPct: 15 }
                    ]).map((planStep) => (
                      <div
                        key={planStep.step}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {planStep.step}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                              {planStep.operation}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {planStep.details}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{ width: `${planStep.costPct}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 w-10 text-right">
                            {planStep.costPct}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* View 3: Quick Chart Preview */}
              {activeResultView === 'chart' && chartPreviewConfig && (
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-indigo-500" />
                        Quick Analytical Visualizer
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Automatic visualization generated from numerical result columns.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {chartPreviewConfig.metrics.map(m => (
                        <span key={m.key} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }}></span>
                          <span className="font-mono text-[11px]">{m.key}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredRows.slice(0, 15)} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                        <XAxis
                          dataKey={chartPreviewConfig.xKey}
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                            color: '#fff'
                          }}
                        />
                        {chartPreviewConfig.metrics.map(m => (
                          <Bar
                            key={m.key}
                            dataKey={m.key}
                            fill={m.color}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default SqlQueryEditor;
