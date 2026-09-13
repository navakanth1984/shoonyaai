import React, { useState } from 'react';
import { 
  Layers, 
  Sparkles, 
  BrainCircuit, 
  ArrowRight, 
  CheckCircle2, 
  Play, 
  Code2, 
  Copy, 
  Check, 
  Database, 
  Flame, 
  Cpu, 
  Sliders, 
  ShieldAlert, 
  Zap,
  Info,
  FileSearch,
  Gauge
} from 'lucide-react';
import { Pipeline, DAGNode, UserRole } from '../types';
import { ROLE_PERMISSIONS } from '../mockData';
import { ModelOptimizerView } from './ModelOptimizerView';
import { DataQualityScannerView } from './DataQualityScannerView';

interface ArchitectModuleProps {
  pipelines: Pipeline[];
  activePipelineId: string;
  setActivePipelineId: (id: string) => void;
  onDeployPipeline: (pipeline: Pipeline) => void;
  activeRole: UserRole;
}

export const ArchitectModule: React.FC<ArchitectModuleProps> = ({
  pipelines,
  activePipelineId,
  setActivePipelineId,
  onDeployPipeline,
  activeRole,
}) => {
  const currentRole = ROLE_PERMISSIONS[activeRole];
  const activePipeline = pipelines.find(p => p.id === activePipelineId) || pipelines[0];

  const [activeTab, setActiveTab] = useState<'dag' | 'optimizer' | 'quality'>('dag');
  const [prompt, setPrompt] = useState('');
  const [source, setSource] = useState('Apache Kafka (CDC Stream)');
  const [destination, setDestination] = useState('Snowflake (Enterprise Mart)');
  const [ingestionMode, setIngestionMode] = useState('streaming');
  const [latencyTolerance, setLatencyTolerance] = useState('realtime');
  const [useThinking, setUseThinking] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [selectedNode, setSelectedNode] = useState<DAGNode | null>(activePipeline?.nodes[0] || null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleGenerateArchitecture = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setStatusMessage('Consulting Gemini AI Architect & synthesizing topology...');

    try {
      const res = await fetch('/api/gemini/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          source,
          destination,
          ingestionMode,
          latencyTolerance,
          useThinking,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate pipeline architecture');
      }

      const data = await res.json();
      
      const newPipeline: Pipeline = {
        id: `pipe-${Date.now().toString().slice(-4)}`,
        name: data.pipelineName || `Auto_${source}_to_${destination}`,
        source: source,
        destination: destination,
        mode: ingestionMode as any,
        status: 'running',
        throughput: 18200,
        latencyMs: latencyTolerance === 'realtime' ? 260 : 1200,
        eventsProcessedToday: 0,
        errorRate: 0.005,
        slaLimitMs: latencyTolerance === 'realtime' ? 400 : 3000,
        nodes: data.nodes || activePipeline.nodes,
        edges: data.edges || activePipeline.edges,
        partitionStrategy: data.partitionStrategy || 'Partitioned by event_date, Clustered by tenant_id',
        dbtSqlSpec: data.dbtSqlSpec || activePipeline.dbtSqlSpec,
        mlOptimizationNotes: data.mlOptimizationNotes || [
          'Automatic micro-batch sizing tuned for high-throughput ingestion',
          'Dynamic partition pruning reduces warehouse spend'
        ],
        lastRunTime: 'Just now (AI Generated)'
      };

      onDeployPipeline(newPipeline);
      setActivePipelineId(newPipeline.id);
      setSelectedNode(newPipeline.nodes[0] || null);
      setStatusMessage('Pipeline architecture successfully generated and active!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Error generating architecture: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySql = () => {
    if (activePipeline?.dbtSqlSpec) {
      navigator.clipboard.writeText(activePipeline.dbtSqlSpec);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  const samplePrompts = [
    "E-commerce clickstream to BigQuery with bot filtering & session attribution",
    "Healthcare HL7 FHIR stream to Snowflake with automatic HIPAA de-identification",
    "IoT smart meter telemetry to Databricks Delta Lake with anomaly detection",
    "Stripe webhook CDC to Postgres with idempotency deduplication"
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Pipeline Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Layers className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI Data Architect Module</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Machine Learning Topology Engine
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Autonomous ETL design, intelligent DAG partitioning, dbt SQL transformation synthesis, and cloud warehouse schema alignment.
            </p>
          </div>

          {/* Pipeline Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Active Pipeline:</span>
            <select
              value={activePipelineId}
              onChange={(e) => setActivePipelineId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dag')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dag'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>DAG Pipeline Synthesis & Topology</span>
          </button>

          <button
            onClick={() => setActiveTab('optimizer')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'optimizer'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>Warehouse Model Optimizer (Performance & Cost)</span>
          </button>

          <button
            onClick={() => setActiveTab('quality')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'quality'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <FileSearch className="w-4 h-4" />
            <span>Proactive Data Quality Scanner & Cleansing</span>
          </button>
        </div>
      </div>

      {/* Tab: Pipeline DAG Synthesis */}
      {activeTab === 'dag' && (
        <div className="space-y-6">
          {/* AI Pipeline Generator Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-xl border border-indigo-900/60 p-5 text-white shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300">
              Autonomous Pipeline Generation
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseThinking(!useThinking)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                useThinking
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Leverage Gemini 3.1 Pro High Thinking Mode for deep topological DAG optimization"
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>Thinking Mode: {useThinking ? 'HIGH' : 'OFF'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Describe your ingestion and transformation requirements in plain English:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Build an ultra-low latency CDC pipeline from Kafka to Snowflake with automated PII masking and micro-batch deduplication..."
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-950/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateArchitecture()}
              />
              <button
                onClick={handleGenerateArchitecture}
                disabled={isGenerating || !prompt.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin text-white" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Generate DAG</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Prompt Quick Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-medium">Quick Prompts:</span>
            {samplePrompts.map((sp, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(sp)}
                className="text-[11px] px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors text-left"
              >
                {sp}
              </button>
            ))}
          </div>

          {/* Ingestion Parameters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Source Stream</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
              >
                <option value="Apache Kafka (CDC Stream)">Apache Kafka (CDC Stream)</option>
                <option value="AWS Kinesis (web-events)">AWS Kinesis (web-events)</option>
                <option value="PostgreSQL Debezium CDC">PostgreSQL Debezium CDC</option>
                <option value="MQTT IoT Gateway">MQTT IoT Gateway</option>
                <option value="AWS S3 Parquet Bucket">AWS S3 Parquet Bucket</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Warehouse</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
              >
                <option value="Snowflake (Enterprise Mart)">Snowflake (Enterprise Mart)</option>
                <option value="Google BigQuery (CDP Lake)">Google BigQuery (CDP Lake)</option>
                <option value="Databricks Delta Lake">Databricks Delta Lake</option>
                <option value="AWS Redshift Serverless">AWS Redshift Serverless</option>
                <option value="PostgreSQL Analytics Replica">PostgreSQL Analytics Replica</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Ingestion Mode</label>
              <select
                value={ingestionMode}
                onChange={(e) => setIngestionMode(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
              >
                <option value="streaming">Continuous Streaming</option>
                <option value="micro-batch">Micro-batch (5s window)</option>
                <option value="batch">Hourly Compaction Batch</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">SLA Latency</label>
              <select
                value={latencyTolerance}
                onChange={(e) => setLatencyTolerance(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
              >
                <option value="realtime">Sub-second (&lt;400ms)</option>
                <option value="near_realtime">Near Real-time (&lt;5s)</option>
                <option value="standard">Standard SLA (&lt;60s)</option>
              </select>
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-indigo-900/60 border border-indigo-700/60 text-xs text-cyan-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* DAG Visual Topology Canvas */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Interactive Pipeline DAG Topology</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                ({activePipeline.nodes.length} Nodes • {activePipeline.edges.length} Streaming Edges)
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any node to inspect schema contracts, transformations, and live throughput telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {currentRole.canDeployPipelines ? (
              <button
                onClick={() => {
                  setStatusMessage(`Topology deployed to ${activePipeline.destination}! Zero-downtime hot deploy active.`);
                  setTimeout(() => setStatusMessage(null), 3500);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Deploy to Cluster</span>
              </button>
            ) : (
              <span className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded border border-rose-200 dark:border-rose-900/50">
                Read-only: Deployment restricted for {currentRole.label}
              </span>
            )}
          </div>
        </div>

        {/* Visual Graph Layout */}
        <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <div className="min-w-[700px] flex items-center justify-between gap-4 relative">
            {activePipeline.nodes.map((node, index) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <React.Fragment key={node.id}>
                  {/* Node Card */}
                  <div
                    onClick={() => setSelectedNode(node)}
                    className={`relative p-3.5 rounded-xl border transition-all cursor-pointer w-48 shrink-0 shadow-sm ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                        : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        node.type === 'source' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        node.type === 'transform' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                        node.type === 'enrichment' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                        node.type === 'aggregate' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {node.type}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {node.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={node.name}>
                      {node.name}
                    </h4>

                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Rate:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{node.throughput}</span>
                    </div>
                  </div>

                  {/* Connecting Arrow */}
                  {index < activePipeline.nodes.length - 1 && (
                    <div className="flex flex-col items-center justify-center shrink-0 px-1">
                      <ArrowRight className="w-5 h-5 text-indigo-500 animate-pulse" />
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                        {activePipeline.edges[index]?.description || 'Stream'}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Selected Node Inspector */}
        {selectedNode && (
          <div className="mt-4 p-4 rounded-lg bg-indigo-50/50 dark:bg-slate-800/60 border border-indigo-100 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">{selectedNode.name}</span>
                <span className="text-slate-500">({selectedNode.type} stage)</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Processed <strong className="text-slate-800 dark:text-slate-200">{selectedNode.throughput}</strong> with 0 backpressure buffer overflow incidents.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500">Partition Key: <code className="font-mono text-indigo-600 dark:text-indigo-400">tenant_id</code></span>
              <span className="text-slate-500">Encryption: <span className="font-semibold text-emerald-600">AES-256</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Section: dbt SQL Spec & ML Optimizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* dbt SQL Transformation Spec */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Auto-Generated dbt Transformation Spec</h3>
            </div>
            <button
              onClick={handleCopySql}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Synthesized SQL model adhering to ANSI SQL and warehouse dialect standards for zero-loss schema staging:
          </p>
          <div className="flex-1 rounded-lg bg-slate-950 p-3.5 font-mono text-xs text-cyan-300 overflow-x-auto border border-slate-800 leading-relaxed">
            <pre>{activePipeline.dbtSqlSpec}</pre>
          </div>
        </div>

        {/* ML Optimization & Partition Strategy */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">ML Optimization Rationale & Partitioning</h3>
          </div>

          <div className="space-y-4 flex-1">
            {/* Partition Card */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Clustering & Partition Strategy
              </span>
              <p className="text-xs font-mono text-indigo-600 dark:text-indigo-300 font-medium">
                {activePipeline.partitionStrategy}
              </p>
            </div>

            {/* ML Notes */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Automated ML Optimizer Findings
              </span>
              <ul className="space-y-2">
                {activePipeline.mlOptimizationNotes.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Performance KPIs */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block">SLA Target</span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">&lt; {activePipeline.slaLimitMs}ms</span>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block">Current Latency</span>
                <span className="text-xs font-bold text-emerald-600">{activePipeline.latencyMs}ms</span>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block">Error Rate</span>
                <span className="text-xs font-bold text-emerald-600">{(activePipeline.errorRate * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>

      </div>
      </div>
      )}

      {/* Tab: Warehouse Model Optimizer (Performance & Cost) */}
      {activeTab === 'optimizer' && (
        <ModelOptimizerView 
          onApplyOptimization={(modelName, ddl) => {
            setStatusMessage(`Applied DDL optimization to warehouse model ${modelName}!`);
            setTimeout(() => setStatusMessage(null), 4000);
          }}
        />
      )}

      {/* Tab: Proactive Data Quality Scanner & Cleansing */}
      {activeTab === 'quality' && (
        <DataQualityScannerView 
          onApplyCleansingModel={(tableName, dbtModel) => {
            setStatusMessage(`Successfully attached cleansing dbt model to ${tableName}!`);
            setTimeout(() => setStatusMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
};
