import React, { useState } from 'react';
import { 
  Database, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Gauge, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Code2, 
  Zap, 
  RefreshCw, 
  Layers, 
  ArrowUpRight,
  ShieldCheck,
  Server
} from 'lucide-react';
import { WarehouseModelInfo, ModelOptimizationAnalysis, ModelOptimizationRecommendation } from '../types';
import { INITIAL_WAREHOUSE_MODELS, SAMPLE_MODEL_OPTIMIZATIONS } from '../mockData';

interface ModelOptimizerViewProps {
  onApplyOptimization?: (modelName: string, ddl: string) => void;
}

export const ModelOptimizerView: React.FC<ModelOptimizerViewProps> = ({ onApplyOptimization }) => {
  const [models, setModels] = useState<WarehouseModelInfo[]>(INITIAL_WAREHOUSE_MODELS);
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0].id);
  const [analyses, setAnalyses] = useState<Record<string, ModelOptimizationAnalysis>>(SAMPLE_MODEL_OPTIMIZATIONS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedSql, setCopiedSql] = useState<string | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState<string | null>(null);

  const selectedModel = models.find(m => m.id === selectedModelId) || models[0];
  const currentAnalysis = analyses[selectedModel.id] || null;

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAppliedSuccess(null);

    try {
      const res = await fetch('/api/gemini/analyze-data-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: selectedModel.id,
          modelName: selectedModel.name,
          warehouse: selectedModel.warehouse,
          rowCount: selectedModel.rowCount,
          sizeGb: selectedModel.sizeGb,
          currentPartitioning: selectedModel.currentPartitioning,
          clusteringKey: selectedModel.clusteringKey,
          queryFrequencyPerDay: selectedModel.queryFrequencyPerDay,
          avgExecutionTimeSec: selectedModel.avgExecutionTimeSec,
          monthlyCostUsd: selectedModel.monthlyCostUsd
        }),
      });

      if (!res.ok) throw new Error('Failed to analyze model');
      const data: ModelOptimizationAnalysis = await res.json();

      setAnalyses(prev => ({
        ...prev,
        [selectedModel.id]: data
      }));

      // Update model health status
      setModels(prev => prev.map(m => {
        if (m.id === selectedModel.id) {
          return {
            ...m,
            status: data.healthScore >= 80 ? 'optimal' : data.healthScore >= 60 ? 'needs_optimization' : 'critical_inefficiency'
          };
        }
        return m;
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSql(key);
    setTimeout(() => setCopiedSql(null), 2000);
  };

  const handleApplyToWarehouse = (recommendation: ModelOptimizationRecommendation) => {
    if (onApplyOptimization) {
      onApplyOptimization(selectedModel.name, recommendation.suggestedDdlSql);
    }
    setAppliedSuccess(`Applied optimization "${recommendation.title}" to ${selectedModel.warehouse}!`);
    setTimeout(() => setAppliedSuccess(null), 4000);
  };

  const getStatusBadge = (status: WarehouseModelInfo['status']) => {
    switch (status) {
      case 'optimal':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"><CheckCircle2 className="w-3 h-3" /> Optimal</span>;
      case 'needs_optimization':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"><AlertTriangle className="w-3 h-3" /> Needs Tuning</span>;
      case 'critical_inefficiency':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"><AlertTriangle className="w-3 h-3" /> High Cost Outlier</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Database className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Warehouse Data Model Optimizer & Cost Advisor
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Scans existing table schemas and query scan metrics across connected cloud data warehouses to proactively eliminate costly full-table scans.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Warehouse Model:</span>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.warehouse.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing Schema...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Analyze with AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {appliedSuccess && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{appliedSuccess}</span>
          </div>
        )}
      </div>

      {/* Selected Model Metadata Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Status</span>
          {getStatusBadge(selectedModel.status)}
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Row Count</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{(selectedModel.rowCount / 1e6).toFixed(1)}M Rows</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Table Storage</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedModel.sizeGb} GB</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Daily Queries</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedModel.queryFrequencyPerDay.toLocaleString()} / day</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Avg Query Duration</span>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{selectedModel.avgExecutionTimeSec}s</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Monthly Cost</span>
          <span className="text-sm font-bold text-rose-600 dark:text-rose-400">${selectedModel.monthlyCostUsd.toFixed(2)}/mo</span>
        </div>
      </div>

      {/* Current Configuration Banner */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-slate-400 font-medium">Warehouse:</span>
            <span className="ml-1.5 font-bold text-slate-800 dark:text-slate-200">{selectedModel.warehouse}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Database / Schema:</span>
            <span className="ml-1.5 font-mono text-slate-700 dark:text-slate-300">{selectedModel.database}.{selectedModel.schema}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Current Partitioning:</span>
            <span className="ml-1.5 font-mono text-indigo-600 dark:text-indigo-400">{selectedModel.currentPartitioning}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Clustering Key:</span>
            <span className="ml-1.5 font-mono text-indigo-600 dark:text-indigo-400">{selectedModel.clusteringKey}</span>
          </div>
        </div>
      </div>

      {/* Analysis Output Section */}
      {currentAnalysis ? (
        <div className="space-y-6">
          {/* Executive Impact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-900/90 to-slate-900 border border-indigo-800/80 text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-bold text-indigo-200 tracking-wider">Health & Pruning Score</span>
                <Gauge className="w-5 h-5 text-indigo-300" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">{currentAnalysis.healthScore}</span>
                <span className="text-xs text-indigo-200">/ 100</span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-2">
                {currentAnalysis.healthScore < 60 ? 'Severe full-table scan waste detected' : 'Moderate efficiency with room for query pruning'}
              </p>
            </div>

            <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-950 to-slate-900 border border-emerald-800/80 text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-bold text-emerald-300 tracking-wider">Potential Monthly FinOps Savings</span>
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-400">-{currentAnalysis.potentialCostSavingsPct}%</span>
                <span className="text-xs text-emerald-200">
                  (~${Math.round(selectedModel.monthlyCostUsd * (currentAnalysis.potentialCostSavingsPct / 100))}/mo)
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-2">
                Achieved via micro-partition pruning & auto-suspend window tuning
              </p>
            </div>

            <div className="p-5 rounded-xl bg-gradient-to-br from-cyan-950 to-slate-900 border border-cyan-800/80 text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-bold text-cyan-300 tracking-wider">Estimated Query Acceleration</span>
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-cyan-400">{currentAnalysis.potentialSpeedup}</span>
              </div>
              <p className="text-xs text-cyan-200/80 mt-2">
                Eliminates 85-92% of partition scans for analytical filters
              </p>
            </div>
          </div>

          {/* AI Executive Summary Card */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">AI Architect Diagnostic Rationale</h4>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              {currentAnalysis.summary}
            </p>
          </div>

          {/* Actionable Recommendations List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Optimization Interventions & Generated DDL</span>
              <span className="text-xs font-normal text-slate-500">
                ({currentAnalysis.recommendations.length} action items)
              </span>
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {currentAnalysis.recommendations.map((rec, idx) => (
                <div 
                  key={idx}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mt-0.5">
                        <Zap className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{rec.title}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {rec.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            rec.impactLevel === 'HIGH' 
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' 
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}>
                            {rec.impactLevel} IMPACT
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {rec.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Savings</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          +${rec.estimatedSavingsUsd}/mo ({rec.speedupMultiplier})
                        </span>
                      </div>
                      <button
                        onClick={() => handleApplyToWarehouse(rec)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Server className="w-3.5 h-3.5" />
                        <span>Apply DDL</span>
                      </button>
                    </div>
                  </div>

                  {/* Suggested DDL */}
                  <div className="rounded-lg bg-slate-950 p-3 font-mono text-xs text-cyan-300 border border-slate-800 relative group">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 mb-2 border-b border-slate-800/80">
                      <span>Executable Warehouse DDL:</span>
                      <button
                        onClick={() => handleCopy(rec.suggestedDdlSql, `ddl-${idx}`)}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedSql === `ddl-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSql === `ddl-${idx}` ? 'Copied' : 'Copy DDL'}</span>
                      </button>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap">{rec.suggestedDdlSql}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested dbt Model Specification */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Optimized dbt Model Definition (Production Ready)
                </h3>
              </div>
              <button
                onClick={() => handleCopy(currentAnalysis.suggestedModelDdl, 'dbt-spec')}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {copiedSql === 'dbt-spec' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql === 'dbt-spec' ? 'Copied' : 'Copy Model'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Incorporates incremental materialization, partition strategies, and cluster pruning keys:
            </p>
            <div className="rounded-lg bg-slate-950 p-3.5 font-mono text-xs text-cyan-300 overflow-x-auto border border-slate-800 leading-relaxed">
              <pre>{currentAnalysis.suggestedModelDdl}</pre>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <Database className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Analysis Run Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Click "Analyze with AI" to scan partition clustering, storage sizes, and query frequency for {selectedModel.name}.
          </p>
          <button
            onClick={handleRunAnalysis}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Run Model Optimization Analysis</span>
          </button>
        </div>
      )}
    </div>
  );
};
