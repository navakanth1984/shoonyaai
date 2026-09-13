import { 
  Pipeline, 
  WarehouseConnection, 
  AuditLog, 
  AlertRule, 
  ActiveAlert, 
  AlertNotification,
  PIIMaskingPolicy, 
  RolePermission,
  WarehouseModelInfo,
  ModelOptimizationAnalysis,
  DataQualityScanResult,
  EmbeddedVisualization
} from './types';

export const ROLE_PERMISSIONS: Record<string, RolePermission> = {
  admin: {
    role: 'admin',
    label: 'Platform Admin',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    canDeployPipelines: true,
    canEditTopology: true,
    canAccessSecurityPolicies: true,
    canViewAuditLogs: true,
    canManageWarehouses: true,
    canRunRawSql: true,
    canExportReports: true,
  },
  architect: {
    role: 'architect',
    label: 'AI Data Architect',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    canDeployPipelines: true,
    canEditTopology: true,
    canAccessSecurityPolicies: false,
    canViewAuditLogs: true,
    canManageWarehouses: true,
    canRunRawSql: true,
    canExportReports: true,
  },
  engineer: {
    role: 'engineer',
    label: 'Data Engineer',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    canDeployPipelines: true,
    canEditTopology: true,
    canAccessSecurityPolicies: false,
    canViewAuditLogs: true,
    canManageWarehouses: false,
    canRunRawSql: true,
    canExportReports: false,
  },
  analyst: {
    role: 'analyst',
    label: 'Business Analyst',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    canDeployPipelines: false,
    canEditTopology: false,
    canAccessSecurityPolicies: false,
    canViewAuditLogs: false,
    canManageWarehouses: false,
    canRunRawSql: false,
    canExportReports: true,
  },
  security_officer: {
    role: 'security_officer',
    label: 'Security & Governance Officer',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    canDeployPipelines: false,
    canEditTopology: false,
    canAccessSecurityPolicies: true,
    canViewAuditLogs: true,
    canManageWarehouses: false,
    canRunRawSql: false,
    canExportReports: true,
  },
  viewer: {
    role: 'viewer',
    label: 'Read-only Viewer',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    canDeployPipelines: false,
    canEditTopology: false,
    canAccessSecurityPolicies: false,
    canViewAuditLogs: false,
    canManageWarehouses: false,
    canRunRawSql: false,
    canExportReports: false,
  }
};

export const INITIAL_PIPELINES: Pipeline[] = [
  {
    id: 'pipe-01',
    name: 'Real-time Financial Ingestion & Fraud Vectorizer',
    source: 'Kafka Cluster: fin-transactions',
    destination: 'Snowflake (ANALYTICS_PROD)',
    mode: 'streaming',
    status: 'running',
    throughput: 16420,
    latencyMs: 240,
    eventsProcessedToday: 48920400,
    errorRate: 0.008,
    slaLimitMs: 400,
    partitionStrategy: 'Cluster key: `account_region`, Day bucket: `created_date`',
    dbtSqlSpec: `WITH raw_events AS (
  SELECT 
    event_id,
    user_id,
    TRY_CAST(amount_usd AS FLOAT) as amount_usd,
    currency,
    card_hash,
    merchant_category,
    created_at,
    _loaded_at
  FROM {{ source('kafka_fin', 'transactions_raw') }}
  WHERE _loaded_at >= DATEADD(minute, -15, CURRENT_TIMESTAMP())
)
SELECT 
  event_id,
  user_id,
  amount_usd,
  currency,
  merchant_category,
  CASE 
    WHEN amount_usd > 10000 THEN 'FLAG_LARGE_XFER'
    WHEN merchant_category IN ('CRYPTO', 'CASINO') THEN 'FLAG_HIGH_RISK_MCC'
    ELSE 'STANDARD'
  END as risk_tier,
  created_at
FROM raw_events;`,
    mlOptimizationNotes: [
      'Automatic micro-batch compaction scheduled every 30s to maximize Snowflake cluster credit efficiency.',
      'Card PAN and CVV streams stripped via cryptographic hashing prior to landing in raw ingestion layer.',
      'Dynamically scales Kafka worker partitions when backpressure exceeds 80% watermark.'
    ],
    lastRunTime: 'Continuous (Active)',
    nodes: [
      { id: 'n1', name: 'Kafka Topic (fin-transactions)', type: 'source', status: 'healthy', throughput: '16.4k/s' },
      { id: 'n2', name: 'PII Tokenizer & Masking Gateway', type: 'transform', status: 'healthy', throughput: '16.4k/s' },
      { id: 'n3', name: 'ML Anomaly & Risk Vector Scoring', type: 'enrichment', status: 'healthy', throughput: '16.1k/s' },
      { id: 'n4', name: 'dbt Micro-Batch Aggregator', type: 'aggregate', status: 'healthy', throughput: '16.1k/s' },
      { id: 'n5', name: 'Snowflake (Warehouse Sink)', type: 'sink', status: 'healthy', throughput: '16.1k/s' },
    ],
    edges: [
      { from: 'n1', to: 'n2', description: 'Raw Ingest' },
      { from: 'n2', to: 'n3', description: 'Cleaned Stream' },
      { from: 'n3', to: 'n4', description: 'Scored Records' },
      { from: 'n4', to: 'n5', description: 'Staged COPY INTO' },
    ]
  },
  {
    id: 'pipe-02',
    name: 'Customer Clickstream & Session Analytics',
    source: 'AWS Kinesis Stream (web-events)',
    destination: 'Google BigQuery (cdp_lake)',
    mode: 'streaming',
    status: 'running',
    throughput: 24800,
    latencyMs: 310,
    eventsProcessedToday: 82400190,
    errorRate: 0.015,
    slaLimitMs: 500,
    partitionStrategy: 'Partition by DATE(_PARTITIONTIME), Cluster by user_id, event_name',
    dbtSqlSpec: `SELECT
  session_id,
  user_id,
  page_url,
  referrer,
  device_os,
  geo_country,
  TIMESTAMP_MILLIS(event_timestamp) as event_time
FROM \`bigquery-prod.lake.raw_clickstream\`
WHERE _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR);`,
    mlOptimizationNotes: [
      'Session window clustering aggregates idle sessions over 30 minutes to reduce BigQuery scan bytes.',
      'Adaptive schema reconciliation auto-registers new JSON payload keys without breaking downstream ETL.'
    ],
    lastRunTime: 'Continuous (Active)',
    nodes: [
      { id: 'n201', name: 'AWS Kinesis (web-events)', type: 'source', status: 'healthy', throughput: '24.8k/s' },
      { id: 'n202', name: 'Schema Drift Validator', type: 'transform', status: 'healthy', throughput: '24.8k/s' },
      { id: 'n203', name: 'GeoIP & Device Classifier', type: 'enrichment', status: 'healthy', throughput: '24.5k/s' },
      { id: 'n204', name: 'Google BigQuery Sink', type: 'sink', status: 'healthy', throughput: '24.5k/s' },
    ],
    edges: [
      { from: 'n201', to: 'n202', description: 'JSON Ingest' },
      { from: 'n202', to: 'n203', description: 'Validated Schema' },
      { from: 'n203', to: 'n204', description: 'Streaming Buffer Insert' },
    ]
  },
  {
    id: 'pipe-03',
    name: 'IoT Telemetry & Predictive Maintenance Syncer',
    source: 'MQTT Broker: factory-sensors',
    destination: 'Databricks Delta Lake (iot_telemetry)',
    mode: 'micro-batch',
    status: 'running',
    throughput: 9150,
    latencyMs: 420,
    eventsProcessedToday: 28100500,
    errorRate: 0.002,
    slaLimitMs: 600,
    partitionStrategy: 'Z-Order by machine_id, metric_type; Partition by plant_id',
    dbtSqlSpec: `SELECT 
  sensor_uuid,
  plant_id,
  machine_id,
  temperature_celsius,
  vibration_hz,
  pressure_psi,
  ingest_timestamp
FROM delta_lake.factory_sensors
WHERE ingest_timestamp >= NOW() - INTERVAL 10 MINUTE;`,
    mlOptimizationNotes: [
      'Vectorized time-series compression applied on sensor floats yields 4.2x disk footprint reduction.',
      'Predictive model triggers alert when temperature delta exceeds 3 sigma above running mean.'
    ],
    lastRunTime: 'Continuous (Active)',
    nodes: [
      { id: 'n301', name: 'MQTT Edge Gateway', type: 'source', status: 'healthy', throughput: '9.1k/s' },
      { id: 'n302', name: 'Kalman Filter & Outlier Scrub', type: 'transform', status: 'healthy', throughput: '9.1k/s' },
      { id: 'n303', name: 'ML Remaining Useful Life (RUL)', type: 'enrichment', status: 'healthy', throughput: '9.1k/s' },
      { id: 'n304', name: 'Delta Lake ACID Sink', type: 'sink', status: 'healthy', throughput: '9.1k/s' },
    ],
    edges: [
      { from: 'n301', to: 'n302', description: 'Binary Sensor Stream' },
      { from: 'n302', to: 'n303', description: 'Filtered Readings' },
      { from: 'n303', to: 'n304', description: 'Delta Parquet Commit' },
    ]
  }
];

export const INITIAL_WAREHOUSES: WarehouseConnection[] = [
  {
    id: 'wh-snowflake',
    name: 'Snowflake Enterprise (AWS-US-EAST)',
    type: 'snowflake',
    host: 'xy12345.us-east-1.snowflakecomputing.com',
    database: 'ANALYTICS_PRODUCTION',
    schema: 'PUBLIC / MARTS',
    status: 'connected',
    latencyMs: 38,
    activeQueries: 14,
    storageGb: 4820,
    monthlySpendUsd: 3420,
    lastSynced: '2 mins ago',
  },
  {
    id: 'wh-bigquery',
    name: 'Google BigQuery (US-CENTRAL1)',
    type: 'bigquery',
    host: 'bigquery.googleapis.com/projects/acme-corp-bi',
    database: 'acme_cdp_warehouse',
    schema: 'analytics_views',
    status: 'connected',
    latencyMs: 52,
    activeQueries: 8,
    storageGb: 6150,
    monthlySpendUsd: 2180,
    lastSynced: 'Just now',
  },
  {
    id: 'wh-redshift',
    name: 'AWS Redshift Serverless',
    type: 'redshift',
    host: 'redshift-cluster-01.c29.us-west-2.redshift.amazonaws.com',
    database: 'dev_lakehouse',
    schema: 'reporting',
    status: 'connected',
    latencyMs: 74,
    activeQueries: 5,
    storageGb: 2900,
    monthlySpendUsd: 1850,
    lastSynced: '14 mins ago',
  },
  {
    id: 'wh-databricks',
    name: 'Databricks Delta Lake (Azure-EastUS)',
    type: 'databricks',
    host: 'adb-8491024.12.azuredatabricks.net',
    database: 'feature_store_gold',
    schema: 'ml_models',
    status: 'connected',
    latencyMs: 44,
    activeQueries: 12,
    storageGb: 8400,
    monthlySpendUsd: 4120,
    lastSynced: '5 mins ago',
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-109',
    timestamp: '2026-09-13 08:52:10 UTC',
    actor: 'alex.chen@enterprise.io',
    role: 'architect',
    action: 'PIPELINE_DEPLOY',
    target: 'Pipeline: Real-time Financial Ingestion',
    status: 'SUCCESS',
    ipAddress: '192.0.2.45',
    metadata: { version: '2.4.1', topologyChecksum: '8f9a2b0c', nodes: 5 }
  },
  {
    id: 'aud-108',
    timestamp: '2026-09-13 08:49:33 UTC',
    actor: 'marcus.vance@enterprise.io',
    role: 'security_officer',
    action: 'POLICY_UPDATE',
    target: 'Masking Rule: customer_email (SHA-256 Hash)',
    status: 'SUCCESS',
    ipAddress: '198.51.100.12',
    metadata: { enforcement: 'STRICT', complianceTag: 'GDPR-Art32' }
  },
  {
    id: 'aud-107',
    timestamp: '2026-09-13 08:41:04 UTC',
    actor: 'guest_analyst_03@contractor.net',
    role: 'viewer',
    action: 'UNAUTHORIZED_WRITE_ATTEMPT',
    target: 'Pipeline: Customer Clickstream (Pause)',
    status: 'BLOCKED',
    ipAddress: '203.0.113.88',
    metadata: { reason: 'Insufficient RBAC privilege. Requires [engineer|architect|admin]' }
  },
  {
    id: 'aud-106',
    timestamp: '2026-09-13 08:35:19 UTC',
    actor: 'sarah.lin@enterprise.io',
    role: 'analyst',
    action: 'NLQ_QUERY_EXECUTE',
    target: 'Warehouse: Snowflake (Revenue vs Warehouse Costs)',
    status: 'ALLOWED',
    ipAddress: '192.0.2.78',
    metadata: { queryDurationMs: 310, rowsReturned: 24, piiScanned: 0 }
  },
  {
    id: 'aud-105',
    timestamp: '2026-09-13 08:20:00 UTC',
    actor: 'system.scheduler',
    role: 'admin',
    action: 'SCHEMA_DRIFT_AUTO_RECONCILE',
    target: 'Pipeline: Customer Clickstream (New column: device_os)',
    status: 'SUCCESS',
    ipAddress: '127.0.0.1',
    metadata: { autoAdapted: true, alertId: 'alt-04' }
  }
];

export const INITIAL_ALERT_RULES: AlertRule[] = [
  {
    id: 'rule-01',
    name: 'SLA Latency Threshold Breach (>400ms)',
    metric: 'latency',
    threshold: '> 400 ms for 2 consecutive cycles',
    severity: 'critical',
    enabled: true,
    lastTriggered: '2 hours ago'
  },
  {
    id: 'rule-02',
    name: 'Streaming Error Rate Anomaly (>0.05%)',
    metric: 'error_rate',
    threshold: '> 0.05% dropped packets',
    severity: 'critical',
    enabled: true
  },
  {
    id: 'rule-03',
    name: 'Unmapped Schema Drift Ingestion',
    metric: 'schema_drift',
    threshold: 'New JSON key detected in raw stream',
    severity: 'warning',
    enabled: true,
    lastTriggered: '32 mins ago'
  },
  {
    id: 'rule-04',
    name: 'Throughput Drop Alarm (>30% dip)',
    metric: 'throughput_drop',
    threshold: '< 70% of 1-hour moving average',
    severity: 'warning',
    enabled: true
  },
  {
    id: 'rule-05',
    name: 'Unauthorized PII Query Attempt',
    metric: 'unauthorized_pii',
    threshold: 'Query on unmasked PII without Security role',
    severity: 'critical',
    enabled: true
  }
];

export const INITIAL_ALERTS: AlertNotification[] = [
  {
    id: 'alt-anom-01',
    ruleId: 'rule-01',
    title: 'Statistical Latency Anomaly: P99 Spiked +3.82σ',
    description: 'P99 streaming ingestion latency surged to 742ms (baseline mean: 238ms, σ: 42ms). Exceeded 3.0σ statistical anomaly threshold with 99.8% confidence.',
    severity: 'critical',
    timestamp: '4m ago',
    pipelineId: 'pipe-01',
    acknowledged: false,
    resolved: false,
    anomalyContext: {
      kpiKey: 'latency_ms',
      kpiLabel: 'P99 Ingestion Latency',
      metricValue: 742,
      baselineMean: 238,
      standardDeviation: 42,
      zScore: 3.82,
      deviationPct: 211.7,
      confidenceLevel: '99.8%',
      rootCause: 'Kafka partition rebalance on broker-04 during micro-batch compaction triggered sudden downstream consumer queue buffering.',
      stakeholders: [
        { name: 'Alex Chen', role: 'Data Platform On-Call', channel: 'PagerDuty #infra-sev1' },
        { name: 'Elena Rostova', role: 'Lead Data Engineer', channel: 'Slack #data-alerts-urgent' },
        { name: 'Warehouse Admin', role: 'FinOps Lead', channel: 'Email: platform-ops@enterprise.io' }
      ],
      remediationAction: 'Trigger autonomous consumer pod scale-out (2 -> 5 replicas) and defer non-critical dbt compaction window.',
      historicalTrend: [
        { time: '10:00', value: 240, baseline: 238, upperThreshold: 364, lowerThreshold: 112 },
        { time: '10:10', value: 245, baseline: 238, upperThreshold: 364, lowerThreshold: 112 },
        { time: '10:20', value: 235, baseline: 238, upperThreshold: 364, lowerThreshold: 112 },
        { time: '10:30', value: 260, baseline: 238, upperThreshold: 364, lowerThreshold: 112 },
        { time: '10:40', value: 310, baseline: 238, upperThreshold: 364, lowerThreshold: 112 },
        { time: '10:50', value: 742, baseline: 238, upperThreshold: 364, lowerThreshold: 112 }
      ]
    }
  },
  {
    id: 'alt-anom-02',
    ruleId: 'rule-04',
    title: 'FinOps Cost Burn Outlier: +4.1σ Credit Spike',
    description: 'Hourly warehouse compute credits consumed reached 68.4 credits/hr vs rolling 7-day average of 14.2 credits/hr (+381.6% deviation).',
    severity: 'critical',
    timestamp: '18m ago',
    pipelineId: 'pipe-02',
    acknowledged: false,
    resolved: false,
    anomalyContext: {
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
      remediationAction: 'Auto-throttle query concurrency on cluster TRANSFORM_DBT_XL and enforce 60-second idle auto-suspend.',
      historicalTrend: [
        { time: '06:00', value: 12.4, baseline: 14.2, upperThreshold: 34.6, lowerThreshold: 0 },
        { time: '07:00', value: 15.1, baseline: 14.2, upperThreshold: 34.6, lowerThreshold: 0 },
        { time: '08:00', value: 14.8, baseline: 14.2, upperThreshold: 34.6, lowerThreshold: 0 },
        { time: '09:00', value: 22.0, baseline: 14.2, upperThreshold: 34.6, lowerThreshold: 0 },
        { time: '10:00', value: 68.4, baseline: 14.2, upperThreshold: 34.6, lowerThreshold: 0 }
      ]
    }
  },
  {
    id: 'alt-01',
    ruleId: 'rule-03',
    title: 'Schema Drift Detected in Clickstream Pipeline',
    description: 'Incoming JSON event contains unregistered attribute `browser_language_subtag`. AI schema reconciler mapped it to STRING null-safe column.',
    severity: 'warning',
    timestamp: '32m ago',
    pipelineId: 'pipe-02',
    acknowledged: true,
    resolved: false
  },
  {
    id: 'alt-anom-03',
    ruleId: 'rule-02',
    title: 'Data Quality Anomaly: Null Rate Spike in Customer Keys',
    description: 'Null value ratio in `customer_uuid` foreign key jumped to 14.2% (historical baseline: 0.04%, z-score: +5.2σ). Proactively flagged before warehouse commit.',
    severity: 'warning',
    timestamp: '46m ago',
    pipelineId: 'pipe-01',
    acknowledged: false,
    resolved: false,
    anomalyContext: {
      kpiKey: 'null_rate',
      kpiLabel: 'ForeignKey Null Ratio',
      metricValue: 14.2,
      baselineMean: 0.04,
      standardDeviation: 0.02,
      zScore: 5.2,
      deviationPct: 35400,
      confidenceLevel: '99.9%',
      rootCause: 'Upstream iOS client app release v4.12.0 omitting user token in guest checkout webhook payloads.',
      stakeholders: [
        { name: 'Data Quality Ops', role: 'Lead Architect', channel: 'Slack #quality-ops' },
        { name: 'Mobile App Lead', role: 'Client Engineering', channel: 'Jira Incident auto-ticket' }
      ],
      remediationAction: 'Route null-key payloads to Dead Letter Queue (DLQ) and invoke COALESCE fallback tokenization.',
      historicalTrend: [
        { time: '07:00', value: 0.03, baseline: 0.04, upperThreshold: 0.10, lowerThreshold: 0 },
        { time: '08:00', value: 0.05, baseline: 0.04, upperThreshold: 0.10, lowerThreshold: 0 },
        { time: '09:00', value: 0.04, baseline: 0.04, upperThreshold: 0.10, lowerThreshold: 0 },
        { time: '10:00', value: 14.20, baseline: 0.04, upperThreshold: 0.10, lowerThreshold: 0 }
      ]
    }
  }
];

export const INITIAL_ACTIVE_ALERTS = INITIAL_ALERTS;

export const INITIAL_PII_POLICIES: PIIMaskingPolicy[] = [
  {
    id: 'pol-1',
    column: 'customer_email',
    table: 'users / transactions_raw',
    classification: 'PII',
    sensitivity: 'HIGH',
    maskingType: 'SHA256_HASH',
    active: true,
  },
  {
    id: 'pol-2',
    column: 'card_pan_number',
    table: 'transactions_raw',
    classification: 'PCI-DSS',
    sensitivity: 'CRITICAL',
    maskingType: 'TOKENIZE',
    active: true,
  },
  {
    id: 'pol-3',
    column: 'ip_address',
    table: 'clickstream_events',
    classification: 'PII',
    sensitivity: 'MEDIUM',
    maskingType: 'PARTIAL_MASK',
    active: true,
  },
  {
    id: 'pol-4',
    column: 'patient_diagnosis_code',
    table: 'clinical_claims_feed',
    classification: 'HIPAA',
    sensitivity: 'CRITICAL',
    maskingType: 'REDACT',
    active: true,
  }
];

export const INITIAL_WAREHOUSE_MODELS: WarehouseModelInfo[] = [
  {
    id: 'mdl-01',
    warehouse: 'Snowflake Enterprise (AWS-US-EAST)',
    name: 'orders_fact',
    database: 'ANALYTICS_PRODUCTION',
    schema: 'PUBLIC_MARTS',
    rowCount: 148500000,
    sizeGb: 342.5,
    currentPartitioning: 'None (Default Micro-partitions)',
    clusteringKey: 'None (Unclustered)',
    queryFrequencyPerDay: 4200,
    avgExecutionTimeSec: 8.4,
    monthlyCostUsd: 1420.00,
    status: 'critical_inefficiency'
  },
  {
    id: 'mdl-02',
    warehouse: 'Google BigQuery (US-CENTRAL1)',
    name: 'customer_360_dim',
    database: 'acme_cdp_warehouse',
    schema: 'analytics_views',
    rowCount: 24500000,
    sizeGb: 88.0,
    currentPartitioning: 'None (Full Table Scan on Query)',
    clusteringKey: 'None',
    queryFrequencyPerDay: 6800,
    avgExecutionTimeSec: 4.6,
    monthlyCostUsd: 890.00,
    status: 'needs_optimization'
  },
  {
    id: 'mdl-03',
    warehouse: 'Databricks Delta Lake (Azure-EastUS)',
    name: 'sensor_telemetry_raw',
    database: 'feature_store_gold',
    schema: 'ml_models',
    rowCount: 480000000,
    sizeGb: 1240.0,
    currentPartitioning: 'plant_id',
    clusteringKey: 'None (Missing Z-Order)',
    queryFrequencyPerDay: 1850,
    avgExecutionTimeSec: 14.2,
    monthlyCostUsd: 1680.00,
    status: 'critical_inefficiency'
  },
  {
    id: 'mdl-04',
    warehouse: 'Snowflake Enterprise (AWS-US-EAST)',
    name: 'financial_transactions_daily',
    database: 'ANALYTICS_PRODUCTION',
    schema: 'FINANCE_REPORTING',
    rowCount: 62000000,
    sizeGb: 195.0,
    currentPartitioning: 'created_date (Daily)',
    clusteringKey: 'account_region',
    queryFrequencyPerDay: 3100,
    avgExecutionTimeSec: 1.8,
    monthlyCostUsd: 460.00,
    status: 'optimal'
  }
];

export const SAMPLE_MODEL_OPTIMIZATIONS: Record<string, ModelOptimizationAnalysis> = {
  'mdl-01': {
    modelId: 'mdl-01',
    modelName: 'orders_fact',
    warehouse: 'Snowflake Enterprise',
    healthScore: 48,
    potentialCostSavingsPct: 42.5,
    potentialSpeedup: '5.2x Faster',
    summary: 'The orders_fact table incurs full micro-partition scans on 91% of BI and ETL queries because no cluster key is declared. Query pruning is negligible. Adding clustering on (order_date, customer_region) combined with warehouse auto-suspend tuning will save ~$603/month.',
    recommendations: [
      {
        category: 'clustering',
        title: 'Apply Multi-Column Cluster Key',
        description: 'Cluster micro-partitions by order_date (daily granularity) and customer_region to eliminate 88% of scanned partitions during analytical aggregations.',
        estimatedSavingsUsd: 380,
        speedupMultiplier: '4.8x',
        suggestedDdlSql: `ALTER TABLE ANALYTICS_PRODUCTION.PUBLIC_MARTS.orders_fact \nCLUSTER BY (DATE(order_created_at), customer_region);`,
        impactLevel: 'HIGH'
      },
      {
        category: 'warehouse_sizing',
        title: 'Optimize Auto-Suspend Timeout',
        description: 'The TRANSFORM_DBT_XL cluster currently stays idle for 10 minutes post-execution. Reduce AUTO_SUSPEND from 600s to 60s.',
        estimatedSavingsUsd: 145,
        speedupMultiplier: '1.0x',
        suggestedDdlSql: `ALTER WAREHOUSE TRANSFORM_DBT_XL SET AUTO_SUSPEND = 60;`,
        impactLevel: 'HIGH'
      },
      {
        category: 'materialization',
        title: 'Create Materialized Aggregation View',
        description: 'Pre-aggregate daily revenue by product category and merchant tier into a refreshed materialized view to bypass underlying 148M row table.',
        estimatedSavingsUsd: 78,
        speedupMultiplier: '12.0x',
        suggestedDdlSql: `CREATE OR REPLACE MATERIALIZED VIEW ANALYTICS_PRODUCTION.PUBLIC_MARTS.mv_daily_order_aggregates AS\nSELECT \n  DATE(order_created_at) as order_date,\n  customer_region,\n  COUNT(*) as total_orders,\n  SUM(order_amount_usd) as total_revenue_usd\nFROM ANALYTICS_PRODUCTION.PUBLIC_MARTS.orders_fact\nGROUP BY 1, 2;`,
        impactLevel: 'MEDIUM'
      }
    ],
    suggestedModelDdl: `-- AI Optimized dbt Model Definition: orders_fact.sql\n{{ config(\n    materialized = 'incremental',\n    cluster_by = ['DATE(order_created_at)', 'customer_region'],\n    unique_key = 'order_id',\n    incremental_strategy = 'merge'\n) }}\n\nSELECT \n  order_id,\n  customer_id,\n  customer_region,\n  TRY_CAST(order_amount_usd AS NUMBER(12,2)) as order_amount_usd,\n  payment_method,\n  order_status,\n  order_created_at,\n  CURRENT_TIMESTAMP() as _dbt_updated_at\nFROM {{ source('raw_store', 'orders_cdc') }}\n{% if is_incremental() %}\n  WHERE order_created_at >= (SELECT MAX(order_created_at) FROM {{ this }})\n{% endif %};`
  },
  'mdl-02': {
    modelId: 'mdl-02',
    modelName: 'customer_360_dim',
    warehouse: 'Google BigQuery',
    healthScore: 62,
    potentialCostSavingsPct: 35.0,
    potentialSpeedup: '3.6x Faster',
    summary: 'The customer_360_dim model lacks ingestion-time partitioning and clustering. Queries filtering on customer_id or signup_cohort scan 88 GB unpartitioned columnar storage every single run.',
    recommendations: [
      {
        category: 'partitioning',
        title: 'Partition by Ingestion Timestamp',
        description: 'Partition the BigQuery table by DATE(created_at) and cluster by customer_tier and country_code to reduce query bytes billed by 74%.',
        estimatedSavingsUsd: 220,
        speedupMultiplier: '3.4x',
        suggestedDdlSql: `CREATE OR REPLACE TABLE \`acme_cdp_warehouse.analytics_views.customer_360_dim\`\nPARTITION BY DATE(created_at)\nCLUSTER BY customer_tier, country_code\nAS SELECT * FROM \`acme_cdp_warehouse.analytics_views.customer_360_dim\`;`,
        impactLevel: 'HIGH'
      },
      {
        category: 'compaction',
        title: 'SCD Type 2 Merge Compaction',
        description: 'Deduplicate intermediate customer mutation rows before writing to gold dimension.',
        estimatedSavingsUsd: 91,
        speedupMultiplier: '2.1x',
        suggestedDdlSql: `DELETE FROM \`acme_cdp_warehouse.analytics_views.customer_360_dim\` WHERE _is_current = FALSE AND valid_to < DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY);`,
        impactLevel: 'LOW'
      }
    ],
    suggestedModelDdl: `-- AI Optimized BigQuery dbt Model\n{{ config(\n    materialized = 'table',\n    partition_by = {\n      "field": "created_at",\n      "data_type": "timestamp",\n      "granularity": "day"\n    },\n    cluster_by = ["customer_tier", "country_code"]\n) }}\n\nSELECT \n  customer_id,\n  COALESCE(email, 'ANONYMIZED') as email,\n  customer_tier,\n  country_code,\n  lifetime_value_usd,\n  created_at\nFROM {{ source('cdp', 'customers_raw') }};`
  }
};

export const SAMPLE_DATA_QUALITY_SCANS: Record<string, DataQualityScanResult> = {
  'mdl-01': {
    table: 'orders_fact',
    warehouse: 'Snowflake Enterprise',
    scannedRows: 10000,
    overallQualityScore: 78,
    cleanRowsPct: 76.4,
    scanTimestamp: 'Just now',
    issues: [
      {
        id: 'dq-01',
        column: 'customer_uuid',
        issueType: 'missing_value',
        severity: 'critical',
        affectedRowsCount: 1420,
        affectedRowsPct: 14.2,
        sampleDefect: 'NULL / empty string',
        recommendation: 'Synthesize surrogate guest customer token using sha256(ip_address + user_agent) to preserve analytical referential integrity.',
        cleansingSql: `COALESCE(customer_uuid, MD5(CONCAT_WS(':', ip_address, user_agent, 'GUEST')))`
      },
      {
        id: 'dq-02',
        column: 'order_created_at',
        issueType: 'inconsistent_format',
        severity: 'warning',
        affectedRowsCount: 580,
        affectedRowsPct: 5.8,
        sampleDefect: 'Mixed format: "2026-09-13T08:12:00Z" vs "09/13/2026 08:12 AM"',
        recommendation: 'Standardize using TRY_TO_TIMESTAMP_TZ to coerce mixed ISO-8601 and US standard strings into uniform UTC timestamp.',
        cleansingSql: `COALESCE(TRY_TO_TIMESTAMP_TZ(order_created_at, 'YYYY-MM-DDTHH24:MI:SSZ'), TRY_TO_TIMESTAMP_TZ(order_created_at, 'MM/DD/YYYY HH12:MI AM'))`
      },
      {
        id: 'dq-03',
        column: 'order_amount_usd',
        issueType: 'out_of_range',
        severity: 'critical',
        affectedRowsCount: 120,
        affectedRowsPct: 1.2,
        sampleDefect: 'Negative currency value: -$124.50 (Refund not marked)',
        recommendation: 'Separate chargeback/refund adjustments from gross order volume via ABS() with negative indicator flag.',
        cleansingSql: `CASE WHEN order_amount_usd < 0 THEN ABS(order_amount_usd) ELSE order_amount_usd END`
      },
      {
        id: 'dq-04',
        column: 'order_id',
        issueType: 'duplicate_key',
        severity: 'warning',
        affectedRowsCount: 240,
        affectedRowsPct: 2.4,
        sampleDefect: 'Duplicate transaction IDs due to at-least-once streaming delivery',
        recommendation: 'Apply QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingested_at DESC) = 1 window deduplication.',
        cleansingSql: `QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingested_at DESC) = 1`
      }
    ],
    sampleDataPreview: [
      { order_id: 'ord-90112', customer_uuid: 'usr-928410', order_amount_usd: 145.20, order_created_at: '2026-09-13T08:12:00Z', status: 'VALID' },
      { order_id: 'ord-90113', customer_uuid: null, order_amount_usd: 89.00, order_created_at: '2026-09-13T08:14:22Z', status: 'NULL_KEY' },
      { order_id: 'ord-90114', customer_uuid: 'usr-194021', order_amount_usd: -42.50, order_created_at: '09/13/2026 08:15 AM', status: 'OUT_OF_RANGE' },
      { order_id: 'ord-90115', customer_uuid: 'usr-839120', order_amount_usd: 320.00, order_created_at: '09/13/2026 08:18 AM', status: 'FORMAT_MISMATCH' },
      { order_id: 'ord-90112', customer_uuid: 'usr-928410', order_amount_usd: 145.20, order_created_at: '2026-09-13T08:12:00Z', status: 'DUPLICATE' },
      { order_id: 'ord-90116', customer_uuid: 'usr-441209', order_amount_usd: 210.50, order_created_at: '2026-09-13T08:20:01Z', status: 'VALID' },
      { order_id: 'ord-90117', customer_uuid: null, order_amount_usd: 64.00, order_created_at: '2026-09-13T08:22:15Z', status: 'NULL_KEY' }
    ],
    cleansingDbtModel: `-- AI Generated Proactive Cleansing Model: stg_orders_cleansed.sql\nWITH source_raw AS (\n  SELECT * FROM {{ source('warehouse_marts', 'orders_fact') }}\n),\nsnitized AS (\n  SELECT\n    order_id,\n    -- 1. Cleansed Null Foreign Key with deterministic guest fallback hash\n    COALESCE(customer_uuid, MD5(CONCAT_WS(':', COALESCE(ip_address, '0.0.0.0'), 'GUEST'))) as customer_uuid,\n    -- 2. Format Normalization: standardize multiple date patterns into clean UTC\n    COALESCE(\n      TRY_TO_TIMESTAMP_TZ(order_created_at, 'YYYY-MM-DDTHH24:MI:SSZ'),\n      TRY_TO_TIMESTAMP_TZ(order_created_at, 'MM/DD/YYYY HH12:MI AM')\n    ) as order_timestamp_utc,\n    -- 3. Out of Range Anomaly correction\n    CASE \n      WHEN order_amount_usd < 0 THEN ABS(order_amount_usd)\n      ELSE order_amount_usd \n    END as gross_order_amount_usd,\n    CASE WHEN order_amount_usd < 0 THEN TRUE ELSE FALSE END as is_refund_adjustment,\n    order_status,\n    _ingested_at\n  FROM source_raw\n)\n-- 4. Deduplicate primary key from streaming delivery duplicate packets\nSELECT * FROM snitized\nQUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY _ingested_at DESC) = 1;`
  }
};

export const INITIAL_KPI_MONITORS = [
  {
    key: 'ingestion_eps',
    name: 'Ingestion Throughput',
    unit: 'eps',
    currentValue: 18450,
    mean: 18200,
    stdDev: 950,
    currentZScore: 0.26,
    thresholdZScore: 2.8,
    status: 'nominal',
    category: 'Ingestion'
  },
  {
    key: 'latency_ms',
    name: 'P99 Ingestion Latency',
    unit: 'ms',
    currentValue: 742,
    mean: 238,
    stdDev: 42,
    currentZScore: 3.82,
    thresholdZScore: 2.5,
    status: 'anomaly_critical',
    category: 'Performance'
  },
  {
    key: 'compute_credits',
    name: 'Warehouse Credit Burn',
    unit: 'credits/hr',
    currentValue: 68.4,
    mean: 14.2,
    stdDev: 6.8,
    currentZScore: 4.10,
    thresholdZScore: 3.0,
    status: 'anomaly_critical',
    category: 'FinOps'
  },
  {
    key: 'null_rate',
    name: 'Critical Key Null Ratio',
    unit: '%',
    currentValue: 14.2,
    mean: 0.04,
    stdDev: 0.02,
    currentZScore: 5.20,
    thresholdZScore: 2.5,
    status: 'anomaly_warning',
    category: 'Quality'
  },
  {
    key: 'error_packet_rate',
    name: 'Stream Packet Drop Rate',
    unit: '%',
    currentValue: 0.008,
    mean: 0.007,
    stdDev: 0.003,
    currentZScore: 0.33,
    thresholdZScore: 2.5,
    status: 'nominal',
    category: 'Reliability'
  }
];

export const INITIAL_EMBEDDED_VISUALIZATIONS: EmbeddedVisualization[] = [
  {
    id: 'viz-01',
    title: 'Multi-Cloud Warehouse Monthly Spend Breakdown',
    description: 'Direct comparison of monthly compute expenditure and active queries across Snowflake, BigQuery, Redshift, and Databricks.',
    chartType: 'bar',
    xAxisKey: 'name',
    metrics: [
      { key: 'monthlySpendUsd', label: 'Monthly Spend ($)', color: '#3b82f6' },
      { key: 'activeQueries', label: 'Active Queries', color: '#10b981' }
    ],
    data: [
      { name: 'Snowflake Enterprise', monthlySpendUsd: 3420, activeQueries: 14, region: 'us-east-1' },
      { name: 'Google BigQuery', monthlySpendUsd: 2180, activeQueries: 8, region: 'us-central1' },
      { name: 'AWS Redshift', monthlySpendUsd: 1850, activeQueries: 5, region: 'us-west-2' },
      { name: 'Databricks Delta', monthlySpendUsd: 4120, activeQueries: 12, region: 'eastus' }
    ],
    drillDownLevels: {
      currentLevel: 'warehouse',
      hierarchy: ['warehouse', 'cluster', 'query_type'],
      subData: {
        'Snowflake Enterprise': [
          { name: 'TRANSFORM_DBT_XL', monthlySpendUsd: 1420, activeQueries: 6 },
          { name: 'INGEST_WORKER_01', monthlySpendUsd: 980, activeQueries: 4 },
          { name: 'BI_ANALYTICS_QUERY', monthlySpendUsd: 680, activeQueries: 3 },
          { name: 'DEV_SANDBOX', monthlySpendUsd: 340, activeQueries: 1 }
        ],
        'Google BigQuery': [
          { name: 'CDP_LAKE_SYNC', monthlySpendUsd: 1120, activeQueries: 4 },
          { name: 'ANALYTICS_VIEWS', monthlySpendUsd: 740, activeQueries: 3 },
          { name: 'AD_HOC_EXPLORATION', monthlySpendUsd: 320, activeQueries: 1 }
        ],
        'Databricks Delta': [
          { name: 'ML_FEATURE_STORE', monthlySpendUsd: 1980, activeQueries: 5 },
          { name: 'IOT_STREAMING_CLUSTER', monthlySpendUsd: 1350, activeQueries: 4 },
          { name: 'ETL_MERGE_WORKERS', monthlySpendUsd: 790, activeQueries: 3 }
        ],
        'AWS Redshift': [
          { name: 'REPORTING_NODE_01', monthlySpendUsd: 1100, activeQueries: 3 },
          { name: 'AUDIT_STAGE', monthlySpendUsd: 750, activeQueries: 2 }
        ]
      }
    },
    filters: { dateRange: 'Last 30 Days' },
    pinnedAt: '2026-09-13 08:30 UTC',
    category: 'FinOps & Infrastructure'
  },
  {
    id: 'viz-02',
    title: 'Streaming Latency vs Throughput Correlation',
    description: 'Scatter plot correlating micro-batch ingestion throughput (eps) against P99 end-to-end latency (ms).',
    chartType: 'scatter',
    xAxisKey: 'throughput_eps',
    yAxisKey: 'latency_ms',
    metrics: [
      { key: 'latency_ms', label: 'P99 Latency (ms)', color: '#ec4899' }
    ],
    data: [
      { throughput_eps: 8200, latency_ms: 180, pipeline: 'Kafka Fin Ingest', error_pct: 0.001 },
      { throughput_eps: 11400, latency_ms: 210, pipeline: 'Kafka Fin Ingest', error_pct: 0.002 },
      { throughput_eps: 14500, latency_ms: 235, pipeline: 'Clickstream Stream', error_pct: 0.004 },
      { throughput_eps: 18200, latency_ms: 260, pipeline: 'Clickstream Stream', error_pct: 0.005 },
      { throughput_eps: 22000, latency_ms: 310, pipeline: 'IoT Factory Sensors', error_pct: 0.008 },
      { throughput_eps: 24800, latency_ms: 345, pipeline: 'IoT Factory Sensors', error_pct: 0.012 },
      { throughput_eps: 28500, latency_ms: 480, pipeline: 'IoT Factory Sensors (Spike)', error_pct: 0.024 },
      { throughput_eps: 32000, latency_ms: 742, pipeline: 'Kafka Fin Ingest (Outlier)', error_pct: 0.045 }
    ],
    filters: { dateRange: 'Last 24 Hours' },
    pinnedAt: '2026-09-13 08:45 UTC',
    category: 'Pipeline Performance'
  },
  {
    id: 'viz-03',
    title: 'Warehouse Compute Credit Distribution',
    description: 'Proportional breakdown of cloud credits consumed by analytical workload type.',
    chartType: 'pie',
    xAxisKey: 'workload',
    metrics: [
      { key: 'credits', label: 'Credits Consumed', color: '#6366f1' }
    ],
    data: [
      { workload: 'dbt Micro-Batch Transformation', credits: 420, percentage: 38 },
      { workload: 'CDC Streaming Ingestion Stages', credits: 285, percentage: 26 },
      { workload: 'Executive BI & NLQ Queries', credits: 195, percentage: 18 },
      { workload: 'ML Feature Vector Calculations', credits: 140, percentage: 13 },
      { workload: 'Schema Drift & Audit Scans', credits: 60, percentage: 5 }
    ],
    drillDownLevels: {
      currentLevel: 'workload',
      hierarchy: ['workload', 'sub_task'],
      subData: {
        'dbt Micro-Batch Transformation': [
          { workload: 'orders_fact incremental merge', credits: 210, percentage: 50 },
          { workload: 'customer_360_dim SCD rebuild', credits: 130, percentage: 31 },
          { workload: 'hourly session compaction', credits: 80, percentage: 19 }
        ],
        'CDC Streaming Ingestion Stages': [
          { workload: 'Kafka broker deserialization', credits: 150, percentage: 53 },
          { workload: 'PII masking pipeline filter', credits: 95, percentage: 33 },
          { workload: 'Stage copy into table', credits: 40, percentage: 14 }
        ]
      }
    },
    filters: { dateRange: 'Last 7 Days' },
    pinnedAt: '2026-09-13 08:50 UTC',
    category: 'FinOps & Infrastructure'
  },
  {
    id: 'viz-04',
    title: 'Hourly Event Ingestion & SLA Boundary Trend',
    description: 'Time series monitoring incoming streaming volume and SLA compliance margins over 12 hours.',
    chartType: 'line',
    xAxisKey: 'hour',
    metrics: [
      { key: 'events_m', label: 'Ingested Events (M)', color: '#06b6d4' },
      { key: 'sla_attainment_pct', label: 'SLA Attainment (%)', color: '#10b981' }
    ],
    data: [
      { hour: '00:00', events_m: 4.2, sla_attainment_pct: 100 },
      { hour: '02:00', events_m: 3.8, sla_attainment_pct: 100 },
      { hour: '04:00', events_m: 5.1, sla_attainment_pct: 100 },
      { hour: '06:00', events_m: 8.4, sla_attainment_pct: 99.9 },
      { hour: '08:00', events_m: 14.8, sla_attainment_pct: 99.8 },
      { hour: '10:00', events_m: 19.5, sla_attainment_pct: 98.6 },
      { hour: '12:00', events_m: 17.2, sla_attainment_pct: 99.4 },
      { hour: '14:00', events_m: 16.4, sla_attainment_pct: 99.7 }
    ],
    filters: { dateRange: 'Last 12 Hours' },
    pinnedAt: '2026-09-13 08:55 UTC',
    category: 'Pipeline Performance'
  }
];

