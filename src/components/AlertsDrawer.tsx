import React, { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  CheckCircle2, 
  X, 
  Check, 
  Clock, 
  Sparkles, 
  Activity, 
  Send, 
  TrendingUp, 
  ShieldAlert, 
  Zap, 
  RefreshCw, 
  Sliders,
  Users,
  Terminal,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { AlertNotification, AnomalyContext } from '../types';
import { INITIAL_KPI_MONITORS } from '../mockData';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertNotification[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onTriggerAlert?: (
    title: string, 
    description: string, 
    severity: 'critical' | 'warning' | 'info',
    anomalyContext?: AnomalyContext
  ) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onAcknowledge,
  onResolve,
  onTriggerAlert,
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'monitors'>('alerts');
  const [kpiMonitors, setKpiMonitors] = useState(INITIAL_KPI_MONITORS);
  const [anomalyThresholdZ, setAnomalyThresholdZ] = useState<number>(2.5);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(alerts[0]?.id || null);
  const [remediatedAlerts, setRemediatedAlerts] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  // Run Real-Time Anomaly Scan across all monitored KPIs
  const handleRunRealTimeScan = async () => {
    setIsScanning(true);

    try {
      // Pick a metric that exceeds threshold or simulate detection
      const outlierKpi = kpiMonitors.find(k => k.currentZScore >= anomalyThresholdZ) || kpiMonitors[1];

      const res = await fetch('/api/gemini/detect-anomaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpiKey: outlierKpi.key,
          kpiLabel: outlierKpi.name,
          currentValue: outlierKpi.currentValue,
          mean: outlierKpi.mean,
          stdDev: outlierKpi.stdDev,
          thresholdZScore: anomalyThresholdZ
        }),
      });

      if (!res.ok) throw new Error('Anomaly scan failed');
      const anomData = await res.json();

      if (anomData.isAnomaly && onTriggerAlert) {
        const severity = anomData.zScore >= 3.5 ? 'critical' : 'warning';
        onTriggerAlert(
          `Statistical Anomaly: ${anomData.kpiLabel} Outlier (+${anomData.zScore}σ)`,
          `Observed ${anomData.metricValue} vs baseline mean ${anomData.baselineMean} (deviation: +${anomData.deviationPct}%). ${anomData.rootCause}`,
          severity,
          {
            kpiKey: anomData.kpiKey,
            kpiLabel: anomData.kpiLabel,
            metricValue: anomData.metricValue,
            baselineMean: anomData.baselineMean,
            standardDeviation: anomData.standardDeviation,
            zScore: anomData.zScore,
            deviationPct: anomData.deviationPct,
            confidenceLevel: anomData.confidenceLevel,
            rootCause: anomData.rootCause,
            stakeholders: anomData.stakeholders || [
              { name: 'Data Platform On-Call', role: 'Infrastructure Operations', channel: 'PagerDuty' },
              { name: 'Lead Architect', role: 'Data Engineering', channel: 'Slack #data-alerts' }
            ],
            remediationAction: anomData.remediationAction,
            historicalTrend: [
              { time: 'T-50m', value: anomData.baselineMean * 0.98, baseline: anomData.baselineMean, upperThreshold: anomData.baselineMean + 2 * anomData.standardDeviation, lowerThreshold: Math.max(0, anomData.baselineMean - 2 * anomData.standardDeviation) },
              { time: 'T-40m', value: anomData.baselineMean * 1.02, baseline: anomData.baselineMean, upperThreshold: anomData.baselineMean + 2 * anomData.standardDeviation, lowerThreshold: Math.max(0, anomData.baselineMean - 2 * anomData.standardDeviation) },
              { time: 'T-30m', value: anomData.baselineMean * 1.05, baseline: anomData.baselineMean, upperThreshold: anomData.baselineMean + 2 * anomData.standardDeviation, lowerThreshold: Math.max(0, anomData.baselineMean - 2 * anomData.standardDeviation) },
              { time: 'T-20m', value: anomData.baselineMean * 1.20, baseline: anomData.baselineMean, upperThreshold: anomData.baselineMean + 2 * anomData.standardDeviation, lowerThreshold: Math.max(0, anomData.baselineMean - 2 * anomData.standardDeviation) },
              { time: 'T-10m', value: anomData.baselineMean * 1.60, baseline: anomData.baselineMean, upperThreshold: anomData.baselineMean + 2 * anomData.standardDeviation, lowerThreshold: Math.max(0, anomData.baselineMean - 2 * anomData.standardDeviation) },
              { time: 'Now', value: anomData.metricValue, baseline: anomData.baselineMean, upperThreshold: anomData.baselineMean + 2 * anomData.standardDeviation, lowerThreshold: Math.max(0, anomData.baselineMean - 2 * anomData.standardDeviation) }
            ]
          }
        );
        setActiveTab('alerts');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  // Simulate specific anomaly injection
  const handleSimulateAnomaly = (type: 'latency' | 'credits' | 'nulls') => {
    if (!onTriggerAlert) return;

    if (type === 'latency') {
      onTriggerAlert(
        'Simulated Outlier: Ingestion Latency Surge (+3.82σ)',
        'P99 streaming ingestion latency jumped from 238ms to 742ms (+211.7% deviation). Exceeded statistical threshold.',
        'critical',
        {
          kpiKey: 'latency_ms',
          kpiLabel: 'P99 Ingestion Latency',
          metricValue: 742,
          baselineMean: 238,
          standardDeviation: 42,
          zScore: 3.82,
          deviationPct: 211.7,
          confidenceLevel: '99.8%',
          rootCause: 'Kafka partition rebalance on broker-04 during micro-batch compaction caused consumer queue buffering.',
          stakeholders: [
            { name: 'Alex Chen', role: 'Platform On-Call', channel: 'PagerDuty #infra-sev1' },
            { name: 'Elena Rostova', role: 'Lead Data Engineer', channel: 'Slack #data-alerts-urgent' }
          ],
          remediationAction: 'Trigger autonomous consumer pod scale-out (2 -> 5 replicas) and defer non-critical dbt compaction window.'
        }
      );
    } else if (type === 'credits') {
      onTriggerAlert(
        'Simulated Outlier: FinOps Credit Burn Spike (+4.10σ)',
        'Virtual warehouse consumed 68.4 credits/hr vs rolling 7-day baseline of 14.2 credits/hr (+381.6%).',
        'critical',
        {
          kpiKey: 'compute_credits',
          kpiLabel: 'Hourly Compute Spend Rate',
          metricValue: 68.4,
          baselineMean: 14.2,
          standardDeviation: 6.8,
          zScore: 4.10,
          deviationPct: 381.6,
          confidenceLevel: '99.9%',
          rootCause: 'Unoptimized Cartesian join in ad-hoc query on TRANSFORM_DBT_XL cluster preventing automatic virtual warehouse suspension.',
          stakeholders: [
            { name: 'David Miller', role: 'FinOps Lead', channel: 'Slack #finops-anomalies' },
            { name: 'Platform Admin', role: 'Warehouse Administrator', channel: 'PagerDuty' }
          ],
          remediationAction: 'Auto-throttle query concurrency on cluster TRANSFORM_DBT_XL and enforce 60-second idle auto-suspend.'
        }
      );
    } else if (type === 'nulls') {
      onTriggerAlert(
        'Simulated Outlier: ForeignKey Null Ratio Surge (+5.20σ)',
        'Null values in `customer_uuid` surged to 14.2% (baseline: 0.04%). Proactively caught before committing.',
        'warning',
        {
          kpiKey: 'null_rate',
          kpiLabel: 'ForeignKey Null Ratio',
          metricValue: 14.2,
          baselineMean: 0.04,
          standardDeviation: 0.02,
          zScore: 5.20,
          deviationPct: 35400,
          confidenceLevel: '99.9%',
          rootCause: 'Upstream client app release omitting user tokens in guest checkout payloads.',
          stakeholders: [
            { name: 'Data Quality Ops', role: 'Lead Architect', channel: 'Slack #quality-ops' },
            { name: 'Mobile App Lead', role: 'Client Engineering', channel: 'Jira Incident auto-ticket' }
          ],
          remediationAction: 'Route null-key payloads to Dead Letter Queue (DLQ) and invoke COALESCE fallback tokenization.'
        }
      );
    }

    setActiveTab('alerts');
  };

  const handleRemediate = (alertId: string, alert: AlertNotification) => {
    setRemediatedAlerts(prev => ({ ...prev, [alertId]: true }));
    onAcknowledge(alertId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Automated Anomaly & Alerts Center
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  {alerts.length} Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time statistical outlier detection across KPIs, pipelines, and warehouse spend
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

        {/* Tab Switcher */}
        <div className="flex items-center px-4 sm:px-5 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'alerts'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Active Anomaly Alerts ({alerts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('monitors')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'monitors'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Real-Time KPI Deviation Monitors ({kpiMonitors.length})</span>
          </button>
        </div>

        {/* Tab 1: Alerts List with Anomaly Context */}
        {activeTab === 'alerts' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Simulation / Action Bar */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Simulate Real-Time Metric Outlier:</span>
                </span>
                <button
                  onClick={handleRunRealTimeScan}
                  disabled={isScanning}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Scanning KPIs...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-cyan-300" />
                      <span>Scan Anomaly Engine</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleSimulateAnomaly('latency')}
                  className="text-[11px] px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-700 dark:hover:text-rose-300 text-slate-700 dark:text-slate-300 transition-colors font-medium cursor-pointer"
                >
                  + Ingestion Latency (+3.82σ)
                </button>
                <button
                  onClick={() => handleSimulateAnomaly('credits')}
                  className="text-[11px] px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-700 dark:hover:text-rose-300 text-slate-700 dark:text-slate-300 transition-colors font-medium cursor-pointer"
                >
                  + Credit Burn Spike (+4.10σ)
                </button>
                <button
                  onClick={() => handleSimulateAnomaly('nulls')}
                  className="text-[11px] px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-amber-100 dark:hover:bg-amber-950 hover:text-amber-700 dark:hover:text-amber-300 text-slate-700 dark:text-slate-300 transition-colors font-medium cursor-pointer"
                >
                  + Key Null Surge (+5.20σ)
                </button>
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">All Metrics Within Normal Variance</p>
                <p className="text-xs text-slate-500 mt-1">
                  Statistical Z-Scores are within ±2.5σ baseline confidence limits.
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                const isCrit = alert.severity === 'critical';
                const isWarn = alert.severity === 'warning';
                const anom = alert.anomalyContext;
                const isRemediated = remediatedAlerts[alert.id];

                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl border transition-all p-4 space-y-3 ${
                      isRemediated
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80'
                        : alert.acknowledged
                        ? 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75'
                        : isCrit
                        ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 shadow-sm'
                        : isWarn
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 shadow-sm'
                        : 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 shadow-sm'
                    }`}
                  >
                    {/* Top Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className={`p-1.5 rounded-lg mt-0.5 ${
                          isCrit ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300' :
                          isWarn ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                        }`}>
                          {isCrit ? <AlertOctagon className="w-4 h-4" /> : isWarn ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {alert.title}
                            </h4>
                            {anom && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                +{anom.zScore}σ Outlier ({anom.confidenceLevel})
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>Triggered {alert.timestamp}</span>
                            {alert.pipelineId && <span>• Pipeline: {alert.pipelineId}</span>}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded shrink-0 ${
                        isCrit ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                        isWarn ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {alert.description}
                    </p>

                    {/* Rich Anomaly Context Block */}
                    {anom && (
                      <div className="rounded-lg bg-slate-900 text-slate-200 p-3.5 text-xs space-y-3 border border-slate-800">
                        {/* Statistical Metric Comparison */}
                        <div className="grid grid-cols-3 gap-2 pb-2.5 border-b border-slate-800 text-center">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Observed Value</span>
                            <span className="text-xs font-bold text-rose-400">{anom.metricValue}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Rolling Mean (μ)</span>
                            <span className="text-xs font-bold text-slate-300">{anom.baselineMean}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Deviation</span>
                            <span className="text-xs font-bold text-amber-400">+{anom.deviationPct}%</span>
                          </div>
                        </div>

                        {/* Root Cause Context */}
                        <div>
                          <span className="text-[10px] uppercase font-bold text-cyan-300 block mb-1">
                            Probable Root Cause Context:
                          </span>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {anom.rootCause}
                          </p>
                        </div>

                        {/* Impacted Stakeholders */}
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 flex items-center gap-1">
                            <Users className="w-3 h-3 text-indigo-400" />
                            <span>Automatically Dispatched Stakeholders:</span>
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {anom.stakeholders.map((stk, sIdx) => (
                              <div 
                                key={sIdx}
                                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] flex items-center gap-1"
                              >
                                <span className="font-bold text-slate-200">{stk.name}</span>
                                <span className="text-slate-400">({stk.channel})</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Recommended Remediation Action */}
                        <div className="pt-2 border-t border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            <span>Recommended Remediation:</span>
                          </span>
                          <p className="text-slate-300 text-[11px]">
                            {anom.remediationAction}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                      <div className="text-[11px] text-slate-500">
                        {isRemediated ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Remediation Dispatched</span>
                          </span>
                        ) : alert.acknowledged ? (
                          <span className="text-slate-400 font-medium">Acknowledged by On-Call</span>
                        ) : (
                          <span className="text-rose-500 font-medium">Action Required</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {anom && !isRemediated && (
                          <button
                            onClick={() => handleRemediate(alert.id, alert)}
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Execute Remediation</span>
                          </button>
                        )}
                        {!alert.acknowledged && !isRemediated && (
                          <button
                            onClick={() => onAcknowledge(alert.id)}
                            className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
                          >
                            Ack
                          </button>
                        )}
                        <button
                          onClick={() => onResolve(alert.id)}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Resolve</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Real-Time KPI Deviation Monitors */}
        {activeTab === 'monitors' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Sensitivity Threshold Controller */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Statistical Outlier Sensitivity Tuning
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  Threshold: {anomalyThresholdZ}σ (3-Sigma standard: 3.0σ)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400">2.0σ (Sensitive)</span>
                <input
                  type="range"
                  min="2.0"
                  max="3.5"
                  step="0.1"
                  value={anomalyThresholdZ}
                  onChange={(e) => setAnomalyThresholdZ(parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-600"
                />
                <span className="text-[11px] text-slate-400">3.5σ (Strict)</span>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="space-y-3">
              {kpiMonitors.map((kpi) => {
                const isOutlier = kpi.currentZScore >= anomalyThresholdZ;

                return (
                  <div
                    key={kpi.key}
                    className={`p-4 rounded-xl border transition-all ${
                      isOutlier
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/80'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {kpi.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {kpi.category}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isOutlier 
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse' 
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {isOutlier ? `ANOMALY: +${kpi.currentZScore}σ` : `NOMINAL (+${kpi.currentZScore}σ)`}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Current</span>
                        <span className={`font-bold ${isOutlier ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {kpi.currentValue} {kpi.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Baseline (μ)</span>
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {kpi.mean} {kpi.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Std Dev (σ)</span>
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          ±{kpi.stdDev}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Threshold</span>
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          &gt; {kpi.thresholdZScore}σ
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center flex items-center justify-between">
          <span>Continuous real-time statistical anomaly detection</span>
          <span className="font-mono text-[11px] text-indigo-500">Z = |X - μ| / σ</span>
        </div>
      </div>
    </div>
  );
};
