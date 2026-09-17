import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  ArrowDownUp, 
  Clock, 
  SlidersHorizontal,
  RefreshCw,
  Shield,
  Layers
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { Pipeline, StreamEvent, IngestionLog, UserRole } from '../types';
import { ROLE_PERMISSIONS } from '../mockData';

interface EngineerModuleProps {
  pipeline: Pipeline;
  isStreaming: boolean;
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  activeRole: UserRole;
  onTriggerAlert: (title: string, desc: string, severity: 'critical' | 'warning' | 'info') => void;
}

export const EngineerModule: React.FC<EngineerModuleProps> = ({
  pipeline,
  isStreaming,
  setIsStreaming,
  activeRole,
  onTriggerAlert,
}) => {
  const currentRole = ROLE_PERMISSIONS[activeRole];

  // Ingestion metrics history for live chart
  const [chartData, setChartData] = useState<Array<{ time: string; throughput: number; latency: number }>>([
    { time: '10:00:00', throughput: 16100, latency: 220 },
    { time: '10:00:05', throughput: 16400, latency: 235 },
    { time: '10:00:10', throughput: 17200, latency: 245 },
    { time: '10:00:15', throughput: 18500, latency: 260 },
    { time: '10:00:20', throughput: 16900, latency: 230 },
    { time: '10:00:25', throughput: 17400, latency: 240 },
  ]);

  // Live log lines
  const [logs, setLogs] = useState<IngestionLog[]>([
    { id: 'l-1', timestamp: new Date(Date.now() - 15000).toISOString().slice(11, 19), level: 'INFO', pipeline: pipeline.name, message: 'CDC partition replica consumer connected to Kafka offset #4892010', latency: 210 },
    { id: 'l-2', timestamp: new Date(Date.now() - 12000).toISOString().slice(11, 19), level: 'SUCCESS', pipeline: pipeline.name, message: 'Micro-batch commit #1042 acknowledged by Snowflake COPY INTO stage (12,400 records)', latency: 235 },
    { id: 'l-3', timestamp: new Date(Date.now() - 8000).toISOString().slice(11, 19), level: 'INFO', pipeline: pipeline.name, message: 'AES-256 PII column tokenization applied to 420 sensitive email/phone payload keys', latency: 190 },
    { id: 'l-4', timestamp: new Date(Date.now() - 4000).toISOString().slice(11, 19), level: 'SUCCESS', pipeline: pipeline.name, message: 'Streaming throughput stable at 16,840 eps, 0 buffer backpressure', latency: 240 },
  ]);

  // Current counter state
  const [currentEps, setCurrentEps] = useState(pipeline.throughput);
  const [currentLatency, setCurrentLatency] = useState(pipeline.latencyMs);
  const [totalEvents, setTotalEvents] = useState(pipeline.eventsProcessedToday);
  const [schemaDriftActive, setSchemaDriftActive] = useState(false);
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'>('ALL');

  // Real-time generator loop
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const jitter = Math.floor(Math.random() * 1200) - 600;
      const newEps = Math.max(8000, currentEps + jitter);
      const newLatency = Math.max(160, Math.min(380, currentLatency + (Math.floor(Math.random() * 30) - 15)));
      
      setCurrentEps(newEps);
      setCurrentLatency(newLatency);
      setTotalEvents(prev => prev + Math.floor(newEps / 2));

      const nowTime = new Date().toISOString().slice(11, 19);

      // Append chart point
      setChartData(prev => {
        const next = [...prev, { time: nowTime, throughput: newEps, latency: newLatency }];
        return next.slice(-15);
      });

      // Periodic stream log
      if (Math.random() > 0.45) {
        const sampleMessages = [
          `Streaming buffer flushed ${newEps.toLocaleString()} events to micro-batch commit.`,
          `Validated schema contract: 0 unmapped attributes in payload stream.`,
          `Sink latency benchmark: ${newLatency}ms (SLA is ${pipeline.slaLimitMs}ms - Optimal).`,
          `Compaction worker checkpointed to S3 bronze Parquet partition.`,
        ];
        const randomMsg = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
        
        setLogs(prev => [
          {
            id: `l-${Date.now()}`,
            timestamp: nowTime,
            level: Math.random() > 0.9 ? 'SUCCESS' : 'INFO',
            pipeline: pipeline.name,
            message: randomMsg,
            latency: newLatency,
          },
          ...prev.slice(0, 40)
        ]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming, currentEps, currentLatency, pipeline]);

  // Inject Simulated Schema Drift
  const handleInjectSchemaDrift = () => {
    setSchemaDriftActive(true);
    const nowTime = new Date().toISOString().slice(11, 19);

    setLogs(prev => [
      {
        id: `l-${Date.now()}`,
        timestamp: nowTime,
        level: 'WARN',
        pipeline: pipeline.name,
        message: 'SCHEMA DRIFT DETECTED: Incoming payload contains unexpected key `device_firmware_v2` [type: STRING]. Auto-reconciliation active.',
        latency: 310
      },
      ...prev
    ]);

    onTriggerAlert(
      'Schema Drift Detected: ' + pipeline.name,
      'Incoming stream payload contained new unregistered field `device_firmware_v2`. AI engine adapted warehouse DDL.',
      'warning'
    );
  };

  // Reconcile Schema
  const handleReconcileSchema = () => {
    setSchemaDriftActive(false);
    const nowTime = new Date().toISOString().slice(11, 19);

    setLogs(prev => [
      {
        id: `l-${Date.now()}`,
        timestamp: nowTime,
        level: 'SUCCESS',
        pipeline: pipeline.name,
        message: 'AI SCHEMA RECONCILER: ALTER TABLE added column `device_firmware_v2` VARCHAR(64) NULL. Stream healthy.',
        latency: 220
      },
      ...prev
    ]);
  };

  // Clear logs
  const handleClearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = filterLevel === 'ALL' ? logs : logs.filter(l => l.level === filterLevel);

  return (
    <div className="space-y-6">
      {/* Top Banner with Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Terminal className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Data Engineering & Ingestion Control</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                Real-Time Streaming Engine
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live event stream controller, telemetry throughput graphs, schema drift self-healing, and execution runtime logs.
            </p>
          </div>

          {/* Action Controls (Guarded by RBAC) */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {currentRole.canDeployPipelines ? (
              <>
                <button
                  onClick={() => setIsStreaming(!isStreaming)}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer w-full sm:w-auto min-h-[42px] ${
                    isStreaming
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isStreaming ? (
                    <>
                      <Pause className="w-4 h-4 fill-current shrink-0" />
                      <span>Pause Ingestion</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current shrink-0" />
                      <span>Resume Stream</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleInjectSchemaDrift}
                  disabled={schemaDriftActive}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer w-full sm:w-auto min-h-[42px]"
                  title="Simulate upstream producer adding unmapped JSON keys"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Simulate Schema Drift</span>
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 w-full sm:w-auto text-center">
                Streaming controls restricted for {currentRole.label}
              </span>
            )}
          </div>
        </div>

        {/* Active Pipeline Card (Properly wrapped for mobile viewports) */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Active Ingestion Pipeline:
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {isStreaming ? '● Ingesting' : '❚❚ Paused'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Partition: {pipeline.partitionStrategy.split(',')[0]}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white break-words text-wrap">
              {pipeline.name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono text-cyan-600 dark:text-cyan-400 text-[11px] break-all">{pipeline.source}</span>
              <span className="text-slate-400">→</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 text-[11px] break-all">{pipeline.destination}</span>
            </div>
          </div>
        </div>

        {/* Live Counters Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Instant Throughput</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {currentEps.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">events/sec</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">End-to-End Latency</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {currentLatency}
              </span>
              <span className="text-xs text-slate-500">ms (SLA &lt; {pipeline.slaLimitMs}ms)</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Today's Ingested Volume</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {(totalEvents / 1000000).toFixed(2)}M
              </span>
              <span className="text-xs text-slate-500">events</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Pipeline Health</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">99.99% Operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schema Drift Warning Alert Box (If Active) */}
      {schemaDriftActive && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs sm:text-sm">Schema Drift Detected: Unexpected JSON Column Detected</h4>
              <p className="text-xs opacity-90 mt-0.5">
                Upstream stream sent key: <code className="font-mono bg-amber-200 dark:bg-amber-950 px-1 py-0.5 rounded text-amber-800 dark:text-amber-300">device_firmware_v2</code>. 
                Downstream warehouse table <code className="font-mono">ANALYTICS_PROD.RAW_EVENTS</code> does not declare this column.
              </p>
            </div>
          </div>
          <button
            onClick={handleReconcileSchema}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow transition-colors shrink-0 cursor-pointer"
          >
            Apply Auto-Reconciliation DDL
          </button>
        </div>
      )}

      {/* Real-time Charts: Throughput & Latency */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Real-Time Ingestion Throughput & SLA Latency</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live telemetry streaming at 500ms intervals across distributed worker threads.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-1 bg-emerald-500 rounded"></span>
              Throughput (eps)
            </span>
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <span className="w-3 h-1 bg-indigo-500 rounded"></span>
              Latency (ms)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 1000', 'dataMax + 1000']} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#334155', 
                  borderRadius: '0.5rem', 
                  fontSize: '12px',
                  color: '#fff' 
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="throughput" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#throughputGrad)" 
                name="Throughput (eps)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Log Terminal */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 shadow-xl text-white flex flex-col h-96">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
          <div className="flex items-center gap-2">
            <div className="flex space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-300 ml-2">
              Ingestion Execution Stream (stdout)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            {(['ALL', 'INFO', 'WARN', 'ERROR', 'SUCCESS'] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer ${
                  filterLevel === lvl 
                    ? 'bg-slate-700 text-cyan-300 font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
            <button
              onClick={handleClearLogs}
              className="text-[10px] text-slate-500 hover:text-slate-300 ml-2 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Terminal Log Lines */}
        <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-xs pr-1">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 italic py-8 text-center">No logs matching filter</div>
          ) : (
            filteredLogs.map(log => {
              const badgeColor = 
                log.level === 'INFO' ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-800/40' :
                log.level === 'WARN' ? 'text-amber-400 bg-amber-950/60 border border-amber-800/40' :
                log.level === 'ERROR' ? 'text-rose-400 bg-rose-950/60 border border-rose-800/40' :
                'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40';

              return (
                <div key={log.id} className="flex items-start gap-2.5 py-0.5 hover:bg-slate-900/60 rounded px-1 transition-colors">
                  <span className="text-slate-500 text-[11px] shrink-0">{log.timestamp}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 uppercase ${badgeColor}`}>
                    {log.level}
                  </span>
                  <span className="text-slate-300 flex-1 leading-relaxed">{log.message}</span>
                  {log.latency && (
                    <span className="text-slate-500 text-[10px] shrink-0 font-mono">
                      {log.latency}ms
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
