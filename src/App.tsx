import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ArchitectModule } from './components/ArchitectModule';
import { EngineerModule } from './components/EngineerModule';
import { AnalystModule } from './components/AnalystModule';
import { SecurityModule } from './components/SecurityModule';
import { AdminModule } from './components/AdminModule';
import { AuditLogViewer } from './components/AuditLogViewer';
import { AlertsDrawer } from './components/AlertsDrawer';
import { ReportModal } from './components/ReportModal';
import { MobileThumbBar } from './components/MobileThumbBar';
import { LoginPage } from './components/LoginPage';
import { SecurityBreachAuditModal } from './components/SecurityBreachAuditModal';
import { FirebaseDiagnosticsModal } from './components/FirebaseDiagnosticsModal';
import { IntelligenceStudio } from './components/IntelligenceStudio';

import { Pipeline, UserRole, AlertNotification, AuditLog, AuthUser } from './types';
import { INITIAL_PIPELINES, INITIAL_ALERTS, INITIAL_AUDIT_LOGS, ROLE_PERMISSIONS } from './mockData';
import { 
  testFirestoreConnection, 
  subscribeToPipelines, 
  savePipelineToFirestore, 
  seedInitialPipelinesIfEmpty, 
  recordAuditLogToFirestore, 
  signOutFirebase 
} from './lib/firebase';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('shoonyai_auth_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const [showLoginPage, setShowLoginPage] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('shoonyai_auth_user');
    } catch {
      return false;
    }
  });

  const [isSecurityAuditOpen, setIsSecurityAuditOpen] = useState<boolean>(false);
  const [isFirebaseDiagnosticsOpen, setIsFirebaseDiagnosticsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('architect');
  const [activeRole, setActiveRole] = useState<UserRole>('architect');
  const [pipelines, setPipelines] = useState<Pipeline[]>(INITIAL_PIPELINES);
  const [activePipelineId, setActivePipelineId] = useState<string>(INITIAL_PIPELINES[0]?.id || 'pipe-01');
  const [alerts, setAlerts] = useState<AlertNotification[]>(INITIAL_ALERTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(false);

  // Firestore Real-Time Lifecycle Sync
  useEffect(() => {
    // 1. Check and validate connection to Firestore as mandated
    testFirestoreConnection().then(res => {
      setFirestoreConnected(res.success);
      if (res.success) {
        // 2. Seed initial pipelines to Firestore if collection is empty
        seedInitialPipelinesIfEmpty(INITIAL_PIPELINES);
      }
    });

    // 3. Real-time subscription to cloud pipelines
    const unsub = subscribeToPipelines((firestorePipelines) => {
      if (firestorePipelines && firestorePipelines.length > 0) {
        setPipelines(firestorePipelines);
        setActivePipelineId(prev => {
          if (firestorePipelines.some(p => p.id === prev)) return prev;
          return firestorePipelines[0].id;
        });
      }
    });

    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setActiveTab('intelligence');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auth Handlers
  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setActiveRole(user.role);
    setShowLoginPage(false);
    try {
      localStorage.setItem('shoonyai_auth_user', JSON.stringify(user));
    } catch {}
    triggerAuditLog(
      'USER_AUTHENTICATION_SUCCESS', 
      `Identity: ${user.email || user.phone} | Method: ${user.loginMethod} | Role: ${user.role}`, 
      'SUCCESS'
    );
  };

  const handleSignOut = () => {
    if (currentUser) {
      triggerAuditLog('USER_SIGNOUT', `User: ${currentUser.email || currentUser.phone}`, 'SUCCESS');
    }
    signOutFirebase().catch(console.warn);
    setCurrentUser(null);
    setShowLoginPage(true);
    try {
      localStorage.removeItem('shoonyai_auth_user');
    } catch {}
  };

  // Active pipeline reference
  const currentPipeline = (pipelines && pipelines.find(p => p.id === activePipelineId)) || pipelines?.[0] || INITIAL_PIPELINES[0];
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
    recordAuditLogToFirestore(newLog);
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
    savePipelineToFirestore(newPipeline);
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
      {/* If Show Login Page is active, display dedicated Login Gateway */}
      {showLoginPage ? (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onContinueAsGuest={() => setShowLoginPage(false)}
          onOpenSecurityAudit={() => setIsSecurityAuditOpen(true)}
          onOpenFirebaseDiagnostics={() => setIsFirebaseDiagnosticsOpen(true)}
          onTriggerAuditLog={triggerAuditLog}
        />
      ) : (
        <>
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
            currentUser={currentUser}
            onSignOut={handleSignOut}
            onOpenLogin={() => setShowLoginPage(true)}
            onOpenSecurityAudit={() => setIsSecurityAuditOpen(true)}
            onOpenFirebaseDiagnostics={() => setIsFirebaseDiagnosticsOpen(true)}
          />

          {/* Main Module Workspace */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
            {activeTab === 'architect' && (
              <ArchitectModule
                pipelines={pipelines}
                activePipelineId={activePipelineId}
                setActivePipelineId={setActivePipelineId}
                onDeployPipeline={handleDeployPipeline}
                activeRole={activeRole}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'intelligence' && (
              <IntelligenceStudio
                activeRole={activeRole}
                pipelines={pipelines}
                activePipelineId={activePipelineId}
                onNavigateToPipeline={(pid) => {
                  setActivePipelineId(pid);
                  setActiveTab('architect');
                }}
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
              <AnalystModule 
                activeRole={activeRole} 
                pipelines={pipelines}
                activePipelineId={activePipelineId}
                setActivePipelineId={setActivePipelineId}
                isStreaming={isStreaming}
              />
            )}

            {activeTab === 'security' && (
              <SecurityModule
                activeRole={activeRole}
                onTriggerAuditLog={triggerAuditLog}
                onOpenSecurityAudit={() => setIsSecurityAuditOpen(true)}
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

          {/* Mobile Ergonomic Bottom Thumb Bar & Action Sheet */}
          <MobileThumbBar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            activeAlertsCount={activeAlertsCount}
            onOpenAlerts={() => setIsAlertsOpen(true)}
            onOpenReport={() => setIsReportOpen(true)}
            isStreaming={isStreaming}
            setIsStreaming={setIsStreaming}
            totalThroughput={totalThroughput}
            onOpenSecurityAudit={() => setIsSecurityAuditOpen(true)}
          />
        </>
      )}

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

      {/* Real-time Security & API Key Breach Audit Inspector Modal */}
      <SecurityBreachAuditModal
        isOpen={isSecurityAuditOpen}
        onClose={() => setIsSecurityAuditOpen(false)}
      />

      {/* Real-time Firebase Cloud Diagnostics & Verification Suite */}
      <FirebaseDiagnosticsModal
        isOpen={isFirebaseDiagnosticsOpen}
        onClose={() => setIsFirebaseDiagnosticsOpen(false)}
        onTriggerAuditLog={triggerAuditLog}
      />
    </div>
  );
}
