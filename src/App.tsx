import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { ArchitectModule } from './components/ArchitectModule';
import { EngineerModule } from './components/EngineerModule';
import { AnalystModule } from './components/AnalystModule';
import { SecurityModule } from './components/SecurityModule';
import { AdminModule } from './components/AdminModule';
import { AuditLogViewer } from './components/AuditLogViewer';
import { AlertsDrawer } from './components/AlertsDrawer';
import { ReportModal } from './components/ReportModal';

import { Pipeline, UserRole, AlertNotification, AuditLog } from './types';
import { INITIAL_PIPELINES, INITIAL_ALERTS, INITIAL_AUDIT_LOGS, ROLE_PERMISSIONS } from './mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('architect');
  const [activeRole, setActiveRole] = useState<UserRole>('architect');
  const [pipelines, setPipelines] = useState<Pipeline[]>(INITIAL_PIPELINES);
  const [activePipelineId, setActivePipelineId] = useState<string>(INITIAL_PIPELINES[0].id);
  const [alerts, setAlerts] = useState<AlertNotification[]>(INITIAL_ALERTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  // Active pipeline reference
  const currentPipeline = pipelines.find(p => p.id === activePipelineId) || pipelines[0];
  const activeAlertsCount = alerts.filter(a => !a.acknowledged).length;
  const totalThroughput = pipelines.reduce((sum, p) => sum + (p.status === 'running' ? p.throughput : 0), 0);

  // Trigger new immutable audit record
  const triggerAuditLog = (action: string, target: string, status: 'ALLOWED' | 'BLOCKED' | 'SUCCESS' | 'WARNING') => {
    const newLog: AuditLog = {
      id: `audit-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actor: `${activeRole}@enterprise.shoonyai.internal`,
      role: activeRole,
      action,
      target,
      ipAddress: '10.240.12.84',
      status,
      metadata: { rolePermissionLabel: ROLE_PERMISSIONS[activeRole].label }
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Trigger automated anomaly alert
  const triggerAlert = (
    title: string, 
    description: string, 
    severity: 'critical' | 'warning' | 'info',
    anomalyContext?: import('./types').AnomalyContext
  ) => {
    const newAlert: AlertNotification = {
      id: `alert-${Date.now().toString().slice(-4)}`,
      timestamp: 'Just now',
      title,
      description,
      severity,
      pipelineId: activePipelineId,
      acknowledged: false,
      anomalyContext,
    };
    setAlerts(prev => [newAlert, ...prev]);
    triggerAuditLog(
      anomalyContext ? 'ANOMALY_OUTLIER_DETECTED' : 'ALERT_TRIGGERED',
      `Title: ${title} | Severity: ${severity}${anomalyContext ? ` | Z-Score: ${anomalyContext.zScore}σ` : ''}`,
      severity === 'critical' ? 'WARNING' : 'SUCCESS'
    );
  };

  // Deploy newly synthesized pipeline
  const handleDeployPipeline = (newPipeline: Pipeline) => {
    setPipelines(prev => [newPipeline, ...prev.filter(p => p.id !== newPipeline.id)]);
    triggerAuditLog('PIPELINE_SYNTHESIS_DEPLOY', `Pipeline: ${newPipeline.name}`, 'SUCCESS');
  };

  // Acknowledge alert
  const handleAcknowledgeAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    triggerAuditLog('ALERT_ACKNOWLEDGE', `Alert ID: ${id}`, 'SUCCESS');
  };

  // Resolve alert
  const handleResolveAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    triggerAuditLog('ALERT_RESOLVE', `Alert ID: ${id}`, 'SUCCESS');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation & Real-time Telemetry Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        activeAlertsCount={activeAlertsCount}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        totalThroughput={totalThroughput}
        isStreaming={isStreaming}
      />

      {/* Main Module Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'architect' && (
          <ArchitectModule
            pipelines={pipelines}
            activePipelineId={activePipelineId}
            setActivePipelineId={setActivePipelineId}
            onDeployPipeline={handleDeployPipeline}
            activeRole={activeRole}
          />
        )}

        {activeTab === 'engineer' && (
          <EngineerModule
            pipeline={currentPipeline}
            isStreaming={isStreaming}
            setIsStreaming={setIsStreaming}
            activeRole={activeRole}
            onTriggerAlert={triggerAlert}
          />
        )}

        {activeTab === 'analyst' && (
          <AnalystModule activeRole={activeRole} />
        )}

        {activeTab === 'security' && (
          <SecurityModule
            activeRole={activeRole}
            onTriggerAuditLog={triggerAuditLog}
          />
        )}

        {activeTab === 'admin' && (
          <AdminModule
            activeRole={activeRole}
            onTriggerAuditLog={triggerAuditLog}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogViewer
            logs={auditLogs}
            activeRole={activeRole}
          />
        )}
      </main>

      {/* Automated Alerts Slide-over Drawer */}
      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onAcknowledge={handleAcknowledgeAlert}
        onResolve={handleResolveAlert}
        onTriggerAlert={triggerAlert}
      />

      {/* AI Stakeholder Report Synthesis Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        activeRole={activeRole}
      />
    </div>
  );
}
