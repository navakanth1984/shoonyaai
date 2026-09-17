import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  Brush
} from 'recharts';
import { 
  Activity, 
  Play, 
  Pause, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Zap, 
  RotateCcw, 
  Clock, 
  Sliders, 
  TrendingUp, 
  TrendingDown, 
  Server,
  Layers,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';
import { Pipeline, PipelineTelemetryPoint } from '../types';
import { INITIAL_PIPELINES } from '../mockData';

interface PipelineTelemetryChartProps {
  pipelines?: Pipeline[];
  selectedPipelineId?: string;
  onSelectPipelineId?: (id: string) => void;
  isStreamingExternal?: boolean;
}

type TimeRangeOption = '15m' | '1h' | '6h' | '24h';

// Helper to generate initial realistic telemetry points for a given pipeline
function generateHistoricalTelemetry(pipeline: Pipeline, range: TimeRangeOption): PipelineTelemetryPoint[] {
  const points: PipelineTelemetryPoint[] = [];
  const baseLatency = pipeline.latencyMs || 240;
  const baseErrorRate = (pipeline.errorRate || 0.008) * 100; // to percentage e.g. 0.8%
  const slaLimit = pipeline.slaLimitMs || 400;
  const baseRps = Math.round(pipeline.throughput / 10) || 1600;

  const now = Date.now();
  let pointCount = 30;
  let stepMs = 30 * 1000; // 30s per step

  if (range === '15m') {
    pointCount = 30;
    stepMs = 30 * 1000;
  } else if (range === '1h') {
    pointCount = 40;
    stepMs = 90 * 1000;
  } else if (range === '6h') {
    pointCount = 48;
    stepMs = 450 * 1000;
  } else if (range === '24h') {
    pointCount = 48;
    stepMs = 1800 * 1000;
  }

  for (let i = pointCount - 1; i >= 0; i--) {
    const timeMs = now - (i * stepMs);
    const dateObj = new Date(timeMs);
    
    // Format timestamp based on range
    const timeStr = range === '24h' || range === '6h'
      ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Deterministic organic variation with wave + noise
    const cycle = Math.sin(i / 3.5) * 0.25;
    const jitter = ((Math.random() - 0.48) * 0.2);
    const variance = 1 + cycle + jitter;

    // Inject an occasional realistic spike in the history (around index 12 or 22)
    const isSpikePoint = i === Math.floor(pointCount * 0.4);
    const spikeMultiplier = isSpikePoint ? 1.65 : 1;

    const latency = Math.max(12, Math.round((baseLatency * variance * spikeMultiplier) * 10) / 10);
    const p95 = Math.round((latency * 1.22 + 8) * 10) / 10;
    const p99 = Math.round((latency * 1.45 + 18) * 10) / 10;

    let errorRate = Math.max(0.01, Math.round((baseErrorRate * (isSpikePoint ? 2.8 : variance)) * 100) / 100);
    const isBreach = latency > slaLimit || errorRate > 1.0;
    
    const rps = Math.round(baseRps * (1 + cycle * 0.5) * (isSpikePoint ? 1.3 : 1));

    points.push({
      timestamp: timeStr,
      timeIso: dateObj.toISOString(),
      latencyMs: latency,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      errorRate: errorRate,
      requestsPerSec: rps,
      slaLimitMs: slaLimit,
      isBreach,
      incidentNote: isSpikePoint ? 'Micro-batch flush memory saturation' : undefined
    });
  }

  return points;
}

export const PipelineTelemetryChart: React.FC<PipelineTelemetryChartProps> = ({
  pipelines = INITIAL_PIPELINES,
  selectedPipelineId,
  onSelectPipelineId,
  isStreamingExternal = true
}) => {
  const availablePipelines = pipelines && pipelines.length > 0 ? pipelines : INITIAL_PIPELINES;
  const [internalPipelineId, setInternalPipelineId] = useState<string>(
    selectedPipelineId || availablePipelines[0]?.id || 'pipe-01'
  );

  // Sync external selection if provided
  useEffect(() => {
    if (selectedPipelineId && selectedPipelineId !== internalPipelineId) {
      setInternalPipelineId(selectedPipelineId);
    }
  }, [selectedPipelineId]);

  const activePipeline = useMemo(() => {
    return availablePipelines.find(p => p.id === internalPipelineId) || availablePipelines[0];
  }, [availablePipelines, internalPipelineId]);

  const handlePipelineChange = (newId: string) => {
    setInternalPipelineId(newId);
    if (onSelectPipelineId) {
      onSelectPipelineId(newId);
    }
  };

  // Time Range & Controls
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('15m');
  const [isLive, setIsLive] = useState<boolean>(isStreamingExternal);
  const [showP95, setShowP95] = useState<boolean>(true);
  const [showSlaRef, setShowSlaRef] = useState<boolean>(true);
  const [showBrush, setShowBrush] = useState<boolean>(false);
  const [visibleLines, setVisibleLines] = useState<{ latency: boolean; errorRate: boolean }>({
    latency: true,
    errorRate: true
  });

  // Telemetry Time Series State
  const [telemetryData, setTelemetryData] = useState<PipelineTelemetryPoint[]>(() => 
    generateHistoricalTelemetry(activePipeline, '15m')
  );

  // Regenerate dataset when pipeline or time range changes
  useEffect(() => {
    setTelemetryData(generateHistoricalTelemetry(activePipeline, timeRange));
  }, [activePipeline.id, timeRange]);

  // Real-time live interval stream simulation
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setTelemetryData(prev => {
        if (!prev || prev.length === 0) return prev;

        const baseLatency = activePipeline.latencyMs || 240;
        const baseErrorRate = (activePipeline.errorRate || 0.008) * 100;
        const slaLimit = activePipeline.slaLimitMs || 400;
        const baseRps = Math.round((activePipeline.throughput || 16000) / 10);

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Natural random walk jitter
        const jitter = (Math.random() - 0.49) * 0.18;
        const newLatency = Math.max(15, Math.round((baseLatency * (1 + jitter)) * 10) / 10);
        const p95 = Math.round((newLatency * 1.2 + 6) * 10) / 10;
        const p99 = Math.round((newLatency * 1.42 + 15) * 10) / 10;
        const newErrorRate = Math.max(0.01, Math.round((baseErrorRate * (1 + jitter * 1.5)) * 100) / 100);
        const isBreach = newLatency > slaLimit || newErrorRate > 1.0;
        const newRps = Math.round(baseRps * (1 + jitter * 0.5));

        const newPoint: PipelineTelemetryPoint = {
          timestamp: timeStr,
          timeIso: now.toISOString(),
          latencyMs: newLatency,
          p95LatencyMs: p95,
          p99LatencyMs: p99,
          errorRate: newErrorRate,
          requestsPerSec: newRps,
          slaLimitMs: slaLimit,
          isBreach,
        };

        // Sliding window: discard oldest point, add newest
        const maxWindow = timeRange === '15m' ? 30 : 40;
        const updated = [...prev.slice(1), newPoint];
        return updated;
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [isLive, activePipeline, timeRange]);

  // Trigger Anomaly Simulation (Spike)
  const [spikeActive, setSpikeActive] = useState<boolean>(false);
  const handleSimulateSpike = () => {
    setSpikeActive(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setTelemetryData(prev => {
      const spikeLatency = Math.round((activePipeline.slaLimitMs * 1.25) * 10) / 10;
      const spikeErrorRate = 1.95;
      const spikePoint: PipelineTelemetryPoint = {
        timestamp: timeStr,
        timeIso: now.toISOString(),
        latencyMs: spikeLatency,
        p95LatencyMs: Math.round(spikeLatency * 1.3),
        p99LatencyMs: Math.round(spikeLatency * 1.6),
        errorRate: spikeErrorRate,
        requestsPerSec: Math.round((activePipeline.throughput / 10) * 1.8),
        slaLimitMs: activePipeline.slaLimitMs,
        isBreach: true,
        incidentNote: 'Synthetic Load Spike (Simulated Stress Test)'
      };
      return [...prev.slice(1), spikePoint];
    });

    setTimeout(() => setSpikeActive(false), 3000);
  };

  // Calculated KPI Stats across the current time-series
  const stats = useMemo(() => {
    if (!telemetryData || telemetryData.length === 0) {
      return {
        currentLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        currentErrorRate: 0,
        avgLatency: 0,
        slaBreaches: 0,
        compliancePct: 100,
        currentRps: 0
      };
    }

    const latest = telemetryData[telemetryData.length - 1];
    const latencies = telemetryData.map(d => d.latencyMs).sort((a, b) => a - b);
    const p95Idx = Math.floor(latencies.length * 0.95);
    const p99Idx = Math.floor(latencies.length * 0.99);

    const sumLatency = telemetryData.reduce((acc, d) => acc + d.latencyMs, 0);
    const breaches = telemetryData.filter(d => d.isBreach).length;
    const compliance = Math.round(((telemetryData.length - breaches) / telemetryData.length) * 1000) / 10;

    return {
      currentLatency: latest.latencyMs,
      p95Latency: latencies[p95Idx] || latest.p95LatencyMs,
      p99Latency: latencies[p99Idx] || latest.p99LatencyMs,
      currentErrorRate: latest.errorRate,
      avgLatency: Math.round((sumLatency / telemetryData.length) * 10) / 10,
      slaBreaches: breaches,
      compliancePct: compliance,
      currentRps: latest.requestsPerSec
    };
  }, [telemetryData]);

  // CSV Export for historical telemetry
  const handleExportCsv = () => {
    const headers = ['Timestamp', 'ISO Time', 'Latency (ms)', 'P95 Latency (ms)', 'Error Rate (%)', 'Throughput (req/s)', 'SLA Limit (ms)', 'SLA Breach'];
    const rows = telemetryData.map(d => [
      d.timestamp,
      d.timeIso,
      d.latencyMs,
      d.p95LatencyMs,
      d.errorRate,
      d.requestsPerSec,
      d.slaLimitMs,
      d.isBreach ? 'TRUE' : 'FALSE'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activePipeline.id}_telemetry_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: PipelineTelemetryPoint = payload[0].payload;
      const isBreach = dataPoint.isBreach;

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl border border-slate-700 shadow-xl text-xs space-y-2 min-w-[220px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-mono text-slate-300 font-semibold">{dataPoint.timestamp}</span>
            {isBreach ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Breach
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Nominal
              </span>
            )}
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-indigo-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                API Latency:
              </span>
              <span className="font-mono font-bold">{dataPoint.latencyMs} ms</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-purple-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>
                P95 Latency:
              </span>
              <span className="font-mono text-slate-300">{dataPoint.p95LatencyMs} ms</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-rose-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                Error Rate:
              </span>
              <span className="font-mono font-bold text-rose-300">{dataPoint.errorRate.toFixed(2)}%</span>
            </div>

            <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/80">
              <span>Traffic Load:</span>
              <span className="font-mono text-slate-200">{dataPoint.requestsPerSec.toLocaleString()} req/s</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>SLA Target:</span>
              <span className="font-mono text-amber-400">&lt; {dataPoint.slaLimitMs} ms</span>
            </div>
          </div>

          {dataPoint.incidentNote && (
            <div className="p-1.5 rounded bg-rose-950/60 border border-rose-800/60 text-[11px] text-rose-300 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>{dataPoint.incidentNote}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="pipeline-telemetry-container" className="space-y-4">
      {/* Top Header & Pipeline Selector Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Real-time Pipeline Telemetry & SLA Tracking
                  </h3>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isLive 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' 
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                    {isLive ? 'Live Stream Active' : 'Stream Paused'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Continuous millisecond-resolution telemetry monitoring API latency jitter, P95 SLAs, and ingestion error rates.
                </p>
              </div>
            </div>
          </div>

          {/* Pipeline Selector and Live Stream Controls */}
          <div className="flex items-center gap-2.5 flex-wrap justify-start lg:justify-end">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
              <Server className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
              <select
                id="telemetry-pipeline-selector"
                value={internalPipelineId}
                onChange={(e) => handlePipelineChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 py-1.5 pr-3 pl-1 focus:outline-hidden cursor-pointer"
              >
                {availablePipelines.map(p => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900">
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Live Streaming Toggle */}
            <button
              id="telemetry-live-stream-toggle"
              onClick={() => setIsLive(!isLive)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                isLive
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isLive ? 'Pause Stream' : 'Resume Stream'}</span>
            </button>

            {/* Spike Simulator Button for verification */}
            <button
              id="telemetry-spike-test-button"
              onClick={handleSimulateSpike}
              disabled={spikeActive}
              title="Inject a realistic latency & error rate surge into the stream"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{spikeActive ? 'Spike Injected!' : 'Test Spike'}</span>
            </button>

            {/* CSV Export */}
            <button
              id="telemetry-export-csv-button"
              onClick={handleExportCsv}
              title="Export historical telemetry points as CSV"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selected Pipeline Meta Banner */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Source:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{activePipeline.source}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Destination:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{activePipeline.destination}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Mode:</span>
              <span className="font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400">{activePipeline.mode}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">Baseline SLA:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-white">&lt; {activePipeline.slaLimitMs}ms</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Latency Current */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Current Latency</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-xl font-black font-mono ${
              stats.currentLatency > activePipeline.slaLimitMs ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'
            }`}>
              {stats.currentLatency}
            </span>
            <span className="text-xs text-slate-400 font-medium">ms</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            Target &lt; {activePipeline.slaLimitMs}ms
          </span>
        </div>

        {/* P95 Latency */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">P95 Tail Latency</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">
              {stats.p95Latency}
            </span>
            <span className="text-xs text-slate-400 font-medium">ms</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">95th percentile</span>
        </div>

        {/* P99 Latency */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">P99 Latency</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black font-mono text-slate-800 dark:text-slate-200">
              {stats.p99Latency}
            </span>
            <span className="text-xs text-slate-400 font-medium">ms</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Extreme tail bound</span>
        </div>

        {/* Current Error Rate */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Error Rate</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-xl font-black font-mono ${
              stats.currentErrorRate > 1.0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {stats.currentErrorRate.toFixed(2)}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            Max budget 1.00%
          </span>
        </div>

        {/* SLA Compliance */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">SLA Compliance</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {stats.compliancePct}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {stats.slaBreaches === 0 ? 'Zero breaches recorded' : `${stats.slaBreaches} breaches in window`}
          </span>
        </div>

        {/* Ingestion RPS */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Throughput Load</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
              {stats.currentRps.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">req/s</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Live ingestion rate</span>
        </div>
      </div>

      {/* Main Real-Time Recharts Line Chart Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4">
        {/* Chart Toolbars: Time Range & Metric Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          {/* Time Range Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['15m', '1h', '6h', '24h'] as TimeRangeOption[]).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range === '15m' ? '15m (Live)' : range.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Metric Visibility Controls */}
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {/* Latency toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={visibleLines.latency}
                onChange={(e) => setVisibleLines(prev => ({ ...prev, latency: e.target.checked }))}
                className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
              />
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                API Latency (ms)
              </span>
            </label>

            {/* P95 Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showP95}
                onChange={(e) => setShowP95(e.target.checked)}
                className="w-3.5 h-3.5 accent-purple-600 rounded cursor-pointer"
              />
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                <span className="w-2.5 h-1 border-t-2 border-dashed border-purple-500 inline-block"></span>
                P95 Tail
              </span>
            </label>

            {/* Error Rate Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={visibleLines.errorRate}
                onChange={(e) => setVisibleLines(prev => ({ ...prev, errorRate: e.target.checked }))}
                className="w-3.5 h-3.5 accent-rose-600 rounded cursor-pointer"
              />
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                Error Rate (%)
              </span>
            </label>

            {/* SLA Reference Line Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSlaRef}
                onChange={(e) => setShowSlaRef(e.target.checked)}
                className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
              />
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                <span className="w-2.5 h-1 border-t-2 border-dashed border-amber-500 inline-block"></span>
                SLA Threshold
              </span>
            </label>

            {/* Zoom / Brush Toggle */}
            <button
              onClick={() => setShowBrush(!showBrush)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                showBrush 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300'
                  : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              Scrubber {showBrush ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="w-full h-[380px] sm:h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={telemetryData}
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />
              
              <XAxis 
                dataKey="timestamp" 
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#cbd5e1"
                minTickGap={25}
              />
              
              {/* Left Y Axis for API Latency */}
              <YAxis 
                yAxisId="latency"
                orientation="left"
                tick={{ fontSize: 11, fill: '#6366f1' }}
                stroke="#6366f1"
                tickFormatter={(val) => `${val}ms`}
                domain={['dataMin - 10', (dataMax: number) => Math.max(dataMax + 20, activePipeline.slaLimitMs + 30)]}
              />

              {/* Right Y Axis for Error Rate */}
              <YAxis 
                yAxisId="errorRate"
                orientation="right"
                tick={{ fontSize: 11, fill: '#f43f5e' }}
                stroke="#f43f5e"
                tickFormatter={(val) => `${val.toFixed(1)}%`}
                domain={[0, (dataMax: number) => Math.max(1.5, Math.ceil(dataMax * 1.4 * 10) / 10)]}
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} 
              />

              {/* SLA Target Reference Line */}
              {showSlaRef && (
                <ReferenceLine 
                  yAxisId="latency"
                  y={activePipeline.slaLimitMs} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5}
                  label={{
                    value: `SLA Limit: ${activePipeline.slaLimitMs}ms`,
                    position: 'insideTopRight',
                    fill: '#ef4444',
                    fontSize: 11,
                    fontWeight: 600
                  }} 
                />
              )}

              {/* Critical Error Rate Reference Line */}
              {showSlaRef && (
                <ReferenceLine 
                  yAxisId="errorRate"
                  y={1.0} 
                  stroke="#fb7185" 
                  strokeDasharray="3 3" 
                  strokeWidth={1}
                  label={{
                    value: 'Max Error: 1.0%',
                    position: 'insideBottomRight',
                    fill: '#fb7185',
                    fontSize: 10
                  }} 
                />
              )}

              {/* Line 1: Primary API Latency */}
              {visibleLines.latency && (
                <Line
                  yAxisId="latency"
                  type="monotone"
                  dataKey="latencyMs"
                  name="API Latency (ms)"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                  isAnimationActive={!isLive}
                />
              )}

              {/* Line 2: P95 Tail Latency */}
              {showP95 && visibleLines.latency && (
                <Line
                  yAxisId="latency"
                  type="monotone"
                  dataKey="p95LatencyMs"
                  name="P95 Latency (ms)"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={{ r: 4, fill: '#a855f7' }}
                  isAnimationActive={!isLive}
                />
              )}

              {/* Line 3: Ingestion Error Rate */}
              {visibleLines.errorRate && (
                <Line
                  yAxisId="errorRate"
                  type="monotone"
                  dataKey="errorRate"
                  name="Error Rate (%)"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload && payload.isBreach) {
                      return (
                        <circle
                          key={`dot-${payload.timestamp}`}
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      );
                    }
                    return null;
                  }}
                  activeDot={{ r: 6, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 2 }}
                  isAnimationActive={!isLive}
                />
              )}

              {/* Time Scrubber Brush */}
              {showBrush && (
                <Brush 
                  dataKey="timestamp" 
                  height={30} 
                  stroke="#6366f1" 
                  fill="#f1f5f9"
                  tickFormatter={(val) => val}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend & Health Indicator Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Left Y-Axis:</span>
              <span>API Latency (milliseconds)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Right Y-Axis:</span>
              <span>Error Rate (percentage of failed API calls)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white"></span>
              <span>Red markers denote SLA breaches or incident spikes</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <span>Sample Interval:</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {timeRange === '15m' ? '2.8s Live Sliding Window' : 'Aggregated Time Buckets'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
