export type UserRole = 
  | 'admin' 
  | 'architect' 
  | 'engineer' 
  | 'analyst' 
  | 'security_officer' 
  | 'viewer';

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  loginMethod: 'google' | 'mobile_otp' | 'enterprise_email' | 'saml_sso' | 'passkey_webauthn';
  role: UserRole;
  token: string;
  authenticatedAt: string;
  verified: boolean;
  mfaVerified?: boolean;
  sessionDurationMinutes?: number;
  ipAddress?: string;
  complianceAttested?: boolean;
  organization?: string;
}

export interface SecurityAuditItem {
  id: string;
  category: 'API_KEYS' | 'NETWORK' | 'PII_MASKING' | 'AUTH_TOKENS' | 'INJECTION_PREVENTION' | 'FIREBASE_ZERO_TRUST';
  title: string;
  status: 'PASSED' | 'SECURE' | 'VERIFIED';
  description: string;
  mitigation: string;
  riskScore: 'ZERO' | 'LOW';
}

export interface RolePermission {
  role: UserRole;
  label: string;
  badgeColor: string;
  canDeployPipelines: boolean;
  canEditTopology: boolean;
  canAccessSecurityPolicies: boolean;
  canViewAuditLogs: boolean;
  canManageWarehouses: boolean;
  canRunRawSql: boolean;
  canExportReports: boolean;
}

export type PipelineStatus = 'running' | 'paused' | 'failed' | 'optimizing' | 'idle';

export interface DAGNode {
  id: string;
  name: string;
  type: 'source' | 'transform' | 'enrichment' | 'aggregate' | 'sink';
  status: 'healthy' | 'warning' | 'error' | 'optimizing';
  throughput: string;
  details?: string;
  x?: number;
  y?: number;
}

export interface DAGEdge {
  from: string;
  to: string;
  description: string;
}

export interface Pipeline {
  id: string;
  name: string;
  source: string;
  destination: string;
  mode: 'streaming' | 'micro-batch' | 'batch';
  status: PipelineStatus;
  throughput: number; // events/sec
  latencyMs: number;
  eventsProcessedToday: number;
  errorRate: number;
  slaLimitMs: number;
  nodes: DAGNode[];
  edges: DAGEdge[];
  partitionStrategy: string;
  dbtSqlSpec: string;
  mlOptimizationNotes: string[];
  lastRunTime: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PipelineTelemetryPoint {
  timestamp: string;
  timeIso: string;
  latencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number; // in percent (e.g. 0.08)
  requestsPerSec: number;
  slaLimitMs: number;
  isBreach: boolean;
  incidentNote?: string;
}

export type WarehouseType = 'snowflake' | 'bigquery' | 'redshift' | 'databricks' | 'postgres';

export interface WarehouseConnection {
  id: string;
  name: string;
  type: WarehouseType;
  host: string;
  database: string;
  schema: string;
  status: 'connected' | 'testing' | 'disconnected' | 'error';
  latencyMs: number;
  activeQueries: number;
  storageGb: number;
  monthlySpendUsd: number;
  lastSynced: string;
}

export interface StreamEvent {
  id: string;
  timestamp: string;
  pipelineId: string;
  eventType: string;
  payload: Record<string, any>;
  latencyMs: number;
  status: 'SUCCESS' | 'DROPPED' | 'DRIFT_DETECTED' | 'MASKED';
}

export interface IngestionLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  pipeline: string;
  message: string;
  latency?: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: UserRole;
  action: string;
  target: string;
  status: 'ALLOWED' | 'BLOCKED' | 'SUCCESS' | 'WARNING';
  ipAddress: string;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: 'latency' | 'error_rate' | 'throughput_drop' | 'schema_drift' | 'unauthorized_pii';
  threshold: string;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  lastTriggered?: string;
}

export interface ActiveAlert {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  pipelineId?: string;
  resolved: boolean;
}

export interface AlertNotification {
  id: string;
  ruleId?: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  pipelineId?: string;
  acknowledged?: boolean;
  resolved?: boolean;
  anomalyContext?: AnomalyContext;
}

export interface AnomalyContext {
  kpiKey: string;
  kpiLabel: string;
  metricValue: number;
  baselineMean: number;
  standardDeviation: number;
  zScore: number;
  deviationPct: number;
  confidenceLevel: string;
  rootCause: string;
  stakeholders: Array<{ name: string; role: string; channel: string }>;
  remediationAction: string;
  historicalTrend?: Array<{ time: string; value: number; baseline: number; upperThreshold: number; lowerThreshold: number }>;
}

export interface WarehouseModelInfo {
  id: string;
  warehouse: string;
  name: string;
  database: string;
  schema: string;
  rowCount: number;
  sizeGb: number;
  currentPartitioning: string;
  clusteringKey: string;
  queryFrequencyPerDay: number;
  avgExecutionTimeSec: number;
  monthlyCostUsd: number;
  status: 'optimal' | 'needs_optimization' | 'critical_inefficiency';
}

export interface ModelOptimizationRecommendation {
  category: 'partitioning' | 'clustering' | 'materialization' | 'compaction' | 'warehouse_sizing';
  title: string;
  description: string;
  estimatedSavingsUsd: number;
  speedupMultiplier: string;
  suggestedDdlSql: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ModelOptimizationAnalysis {
  modelId: string;
  modelName: string;
  warehouse: string;
  healthScore: number;
  potentialCostSavingsPct: number;
  potentialSpeedup: string;
  recommendations: ModelOptimizationRecommendation[];
  suggestedModelDdl: string;
  summary: string;
}

export interface DataQualityIssue {
  id: string;
  column: string;
  issueType: 'missing_value' | 'inconsistent_format' | 'duplicate_key' | 'out_of_range';
  severity: 'critical' | 'warning' | 'info';
  affectedRowsCount: number;
  affectedRowsPct: number;
  sampleDefect: string;
  recommendation: string;
  cleansingSql: string;
}

export interface DataQualityScanResult {
  table: string;
  warehouse: string;
  scannedRows: number;
  overallQualityScore: number;
  cleanRowsPct: number;
  issues: DataQualityIssue[];
  cleansingDbtModel: string;
  sampleDataPreview: Array<Record<string, any>>;
  scanTimestamp: string;
}

export interface EmbeddedVisualization {
  id: string;
  title: string;
  description?: string;
  chartType: 'bar' | 'line' | 'scatter' | 'pie' | 'area';
  xAxisKey: string;
  yAxisKey?: string;
  metrics: Array<{ key: string; label: string; color: string }>;
  data: any[];
  sqlQuery?: string;
  warehouse?: string;
  autoRefreshInterval?: string;
  embedEnabled?: boolean;
  lastUpdated?: string;
  drillDownLevels?: {
    currentLevel: string;
    parentFilter?: string;
    hierarchy: string[];
    subData?: Record<string, any[]>;
  };
  filters: {
    dateRange?: string;
    category?: string;
    minThreshold?: number;
  };
  pinnedAt: string;
  category: string;
}

export interface PIIMaskingPolicy {
  id: string;
  column: string;
  table: string;
  classification: 'PII' | 'PCI-DSS' | 'HIPAA' | 'INTERNAL';
  sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  maskingType: 'SHA256_HASH' | 'REDACT' | 'TOKENIZE' | 'PARTIAL_MASK';
  active: boolean;
}

export interface GeneratedReport {
  title: string;
  generatedAt: string;
  executiveSummary: string;
  kpiHighlights: { label: string; value: string; trend: string }[];
  sections: { heading: string; content: string }[];
}

export type AIQueryPromptMode = 'standard' | 'finops' | 'root_cause' | 'executive';

export interface AIQueryExecutionStats {
  executionTimeMs: number;
  bytesScanned: string;
  partitionPruningPct: number;
  estimatedCostUsd: number;
  warehouseCluster?: string;
  cacheHit?: boolean;
}

export interface AIQueryResult {
  id: string;
  question: string;
  title: string;
  sql: string;
  sqlExplanation?: string;
  chartType: 'bar' | 'line' | 'scatter' | 'pie' | 'area';
  xAxisKey: string;
  metrics: Array<{ key: string; label: string; color: string; format?: 'currency' | 'number' | 'percentage' | 'latency' }>;
  data: any[];
  keyTakeaways: string[];
  recommendation: string;
  executionStats?: AIQueryExecutionStats;
  followUpQuestions?: string[];
  promptMode?: AIQueryPromptMode;
  warehouseType?: string;
  autoFormatMeta?: {
    suggestedTitle?: string;
    subtitle?: string;
    primaryValueFormat?: string;
    unit?: string;
  };
}

export interface AIQueryHistoryItem {
  id: string;
  question: string;
  timestamp: string;
  warehouseType: string;
  promptMode: AIQueryPromptMode;
  chartType: string;
  rowCount: number;
}

export interface SqlColumnDef {
  name: string;
  type: 'string' | 'number' | 'timestamp' | 'boolean' | 'json';
  nullable?: boolean;
}

export interface WarehouseTableMeta {
  name: string;
  schema: string;
  warehouse: WarehouseType;
  rowCount: number;
  sizeGb: number;
  description: string;
  columns: Array<{
    name: string;
    type: 'string' | 'number' | 'timestamp' | 'boolean' | 'json';
    isPrimaryKey?: boolean;
    isClusterKey?: boolean;
  }>;
}

export interface SqlQueryExecutionResult {
  queryId: string;
  sql: string;
  warehouse: WarehouseType;
  columns: SqlColumnDef[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  bytesScanned: string;
  warehouseCluster: string;
  costUsd: number;
  cacheHit: boolean;
  executedAt: string;
  explainPlan?: Array<{
    step: number;
    operation: string;
    details: string;
    costPct: number;
  }>;
}

export interface SqlQueryHistoryEntry {
  id: string;
  sql: string;
  warehouse: WarehouseType;
  status: 'success' | 'error';
  rowCount?: number;
  executionTimeMs?: number;
  timestamp: string;
  errorMessage?: string;
}

export type VoiceMemoCategory = 
  | 'Partitioning' 
  | 'FinOps & Cost' 
  | 'SLA & Latency' 
  | 'Security & PII' 
  | 'Scale & Topology' 
  | 'Governance' 
  | 'General';

export interface ArchitecturalVoiceMemo {
  id: string;
  title: string;
  category: VoiceMemoCategory;
  pipelineId?: string;
  pipelineName?: string;
  audioUrl: string; // Base64 data URI or Object URL
  durationSeconds: number;
  recordedAt: string;
  architectName: string;
  architectRole: UserRole;
  transcript: string;
  keyDecisions: string[];
  audioFormat?: string;
  fileSizeBytes?: number;
}
