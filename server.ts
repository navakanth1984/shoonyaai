import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to get Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}

// 1. Health check
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({ status: 'ok', hasGeminiKey: hasKey, timestamp: new Date().toISOString() });
});

// 2. AI Architect endpoint - Auto-design & optimize complex pipeline topology
app.post('/api/gemini/architect', async (req, res) => {
  const { prompt, source, destination, ingestionMode, latencyTolerance, useThinking } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    // High-fidelity fallback topology if API key is not configured
    return res.json({
      pipelineName: `Pipeline_${source || 'Kafka'}_to_${destination || 'Snowflake'}_AutoML`,
      summary: `Automated ML-optimized ${ingestionMode || 'micro-batch'} pipeline routing streaming events from ${source || 'Apache Kafka'} with adaptive schema reconciliation into ${destination || 'Snowflake'}.`,
      optimizationScore: 94,
      estimatedThroughput: '18,500 events/sec',
      slaLatency: latencyTolerance === 'realtime' ? '< 350ms' : '< 4.2s',
      nodes: [
        { id: 'src-1', name: source || 'Kafka Cluster (Events)', type: 'source', status: 'healthy', throughput: '18.5k/s' },
        { id: 'tf-1', name: 'Schema Drift Detection & PII Redactor', type: 'transform', status: 'healthy', throughput: '18.5k/s' },
        { id: 'tf-2', name: 'ML Anomaly Filter & Session Enrichment', type: 'enrichment', status: 'healthy', throughput: '18.2k/s' },
        { id: 'tf-3', name: 'dbt Micro-batch Aggregator & Deduplication', type: 'aggregate', status: 'healthy', throughput: '18.2k/s' },
        { id: 'dst-1', name: `${destination || 'Snowflake'} Warehouse (Analytics)`, type: 'sink', status: 'healthy', throughput: '18.2k/s' }
      ],
      edges: [
        { from: 'src-1', to: 'tf-1', description: 'Raw JSON Ingest via CDC' },
        { from: 'tf-1', to: 'tf-2', description: 'Cleaned Schema Stream' },
        { from: 'tf-2', to: 'tf-3', description: 'Enriched Feature Vectors' },
        { from: 'tf-3', to: 'dst-1', description: 'COPY INTO Stage Load' }
      ],
      partitionStrategy: 'Clustered by `tenant_id`, partitioned by `event_date` (Daily Bucketing)',
      dbtSqlSpec: `-- Auto-generated ML Pipeline Transformation Model\nWITH deduplicated AS (\n  SELECT \n    event_id,\n    user_id,\n    event_type,\n    payload,\n    ingested_at,\n    ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY ingested_at DESC) as rn\n  FROM {{ source('${source?.toLowerCase() || 'kafka'}', 'raw_stream') }}\n  WHERE ingested_at >= DATEADD(hour, -2, CURRENT_TIMESTAMP())\n)\nSELECT \n  event_id,\n  user_id,\n  event_type,\n  PARSE_JSON(payload):amount::FLOAT as transaction_value,\n  PARSE_JSON(payload):currency::STRING as currency,\n  ingested_at\nFROM deduplicated\nWHERE rn = 1;`,
      mlOptimizationNotes: [
        'Dynamic buffer sizing prevents backpressure spikes during 3x peak load bursts.',
        'Adaptive column-level encryption handles GDPR/CCPA PII automatically before staging.',
        'Automated query pruning minimizes warehouse compute credits by up to 34%.'
      ]
    });
  }

  try {
    const systemPrompt = `You are a Principal AI Data Architect specializing in enterprise streaming ETL, data warehousing, dbt, Apache Kafka, Apache Iceberg, and cloud data warehouses (Snowflake, BigQuery, Redshift, Databricks).
Output a detailed, production-grade JSON architecture plan for the pipeline requested by the user.

Format strictly as valid JSON matching this schema:
{
  "pipelineName": string,
  "summary": string,
  "optimizationScore": number (1-100),
  "estimatedThroughput": string,
  "slaLatency": string,
  "nodes": [{"id": string, "name": string, "type": "source" | "transform" | "enrichment" | "aggregate" | "sink", "status": "healthy" | "optimal", "throughput": string}],
  "edges": [{"from": string, "to": string, "description": string}],
  "partitionStrategy": string,
  "dbtSqlSpec": string (valid SQL transformation code),
  "mlOptimizationNotes": string[]
}`;

    // Use gemini-3.5-flash for fast reliable structured output or gemini-3.1-pro-preview with thinking if requested
    const model = useThinking ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash';
    const config: any = {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      temperature: 0.3,
    };

    if (useThinking) {
      // Per instructions: thinkingLevel to HIGH, do not set maxOutputTokens
      config.thinkingConfig = { thinkingLevel: 'HIGH' };
    }

    const response = await ai.models.generateContent({
      model,
      contents: `Design an enterprise ETL pipeline for this requirement: "${prompt}".
Source: ${source || 'Kafka Stream'}
Destination: ${destination || 'Snowflake Warehouse'}
Ingestion Mode: ${ingestionMode || 'Continuous Streaming'}
Latency Tolerance: ${latencyTolerance || 'Sub-second real-time'}`,
      config,
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/gemini/architect:', err);
    res.status(500).json({ error: err.message || 'Pipeline architecture generation failed' });
  }
});

// 3. AI NLQ (Natural Language Querying) endpoint - Translates natural language to SQL & analytics
app.post('/api/gemini/nlq', async (req, res) => {
  const { question, warehouseType, schemaContext, promptMode = 'standard' } = req.body;
  const ai = getGeminiClient();

  const qLower = (question || '').toLowerCase();
  const isCostQuery = qLower.includes('cost') || qLower.includes('spend') || qLower.includes('credit') || qLower.includes('billing');
  const isLatencyQuery = qLower.includes('latency') || qLower.includes('speed') || qLower.includes('delay') || qLower.includes('p99');
  const isErrorQuery = qLower.includes('error') || qLower.includes('drop') || qLower.includes('fail') || qLower.includes('anomaly');
  const isUserQuery = qLower.includes('user') || qLower.includes('customer') || qLower.includes('account') || qLower.includes('volume');
  const isRegionQuery = qLower.includes('region') || qLower.includes('geographic') || qLower.includes('country');

  if (!ai) {
    // High-fidelity fallback response with mock visual data
    let fallbackResult;

    if (isLatencyQuery) {
      fallbackResult = {
        sql: `SELECT 
  DATE_TRUNC('hour', recorded_at) as time_window,
  pipeline_id,
  ROUND(AVG(ingestion_latency_ms), 1) as avg_latency_ms,
  ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ingestion_latency_ms), 1) as p99_latency_ms,
  SUM(CASE WHEN ingestion_latency_ms > 350 THEN 1 ELSE 0 END) as sla_breach_count
FROM ${warehouseType || 'snowflake'}_analytics.pipeline_latency_log
WHERE recorded_at >= CURRENT_TIMESTAMP() - INTERVAL '24 HOURS'
GROUP BY 1, 2
ORDER BY 1 ASC
LIMIT 24;`,
        sqlExplanation: `Aggregates streaming telemetry across 1-hour tumbling windows, computing average and P99 latency percentiles with a conditional count of SLA threshold violations (>350ms).`,
        chartType: 'line',
        xAxisKey: 'time_window',
        metrics: [
          { key: 'avg_latency_ms', label: 'Avg Latency (ms)', color: '#38bdf8', format: 'latency' },
          { key: 'p99_latency_ms', label: 'P99 Latency (ms)', color: '#f43f5e', format: 'latency' },
          { key: 'sla_breach_count', label: 'SLA Breaches', color: '#f59e0b', format: 'number' }
        ],
        data: [
          { time_window: '00:00', avg_latency_ms: 142, p99_latency_ms: 220, sla_breach_count: 0 },
          { time_window: '04:00', avg_latency_ms: 158, p99_latency_ms: 245, sla_breach_count: 0 },
          { time_window: '08:00', avg_latency_ms: 215, p99_latency_ms: 310, sla_breach_count: 2 },
          { time_window: '12:00', avg_latency_ms: 285, p99_latency_ms: 395, sla_breach_count: 6 },
          { time_window: '16:00', avg_latency_ms: 340, p99_latency_ms: 480, sla_breach_count: 14 },
          { time_window: '20:00', avg_latency_ms: 195, p99_latency_ms: 280, sla_breach_count: 1 }
        ],
        keyTakeaways: [
          'P99 latency surged above the 350ms SLA boundary between 14:00 and 17:00 UTC due to compaction micro-batches.',
          'Total daily SLA violations capped at 23 out of 1.2M micro-batches (99.98% SLA achievement rate).',
          'Off-peak baseline latency remained steady at a healthy 142ms.'
        ],
        recommendation: 'Increase Kafka consumer thread pool concurrency from 8 to 16 during peak hours (12:00-18:00 UTC) to eliminate ingest buffering.',
        executionStats: {
          executionTimeMs: 38,
          bytesScanned: '142.6 MB',
          partitionPruningPct: 96.2,
          estimatedCostUsd: 0.12,
          warehouseCluster: 'ANALYTICS_QUERY_WH',
          cacheHit: true
        },
        autoFormatMeta: {
          suggestedTitle: 'Hourly Streaming Ingestion Latency & SLA Trends',
          subtitle: 'P99 Latency and SLA Breach Frequency over Last 24 Hours',
          primaryValueFormat: 'ms',
          unit: 'Milliseconds'
        },
        followUpQuestions: [
          'Which specific pipeline caused the highest SLA breach count at 16:00 UTC?',
          'Correlate P99 latency spikes with memory buffer usage',
          'Forecast latency trends for the next 48 hours under 2x volume'
        ]
      };
    } else if (isErrorQuery) {
      fallbackResult = {
        sql: `SELECT 
  pipeline_name,
  SUM(total_records) as total_ingested,
  SUM(dropped_records) as dropped_records,
  ROUND(SUM(dropped_records) * 100.0 / NULLIF(SUM(total_records), 0), 3) as error_rate_pct,
  COUNT(DISTINCT error_code) as unique_error_types
FROM ${warehouseType || 'snowflake'}_analytics.pipeline_error_stream
WHERE logged_at >= CURRENT_DATE() - INTERVAL '7 DAYS'
GROUP BY 1
ORDER BY 4 DESC
LIMIT 6;`,
        sqlExplanation: `Calculates packet drop and transformation error percentages grouped by ingestion pipeline, using NULLIF protection against division by zero.`,
        chartType: 'bar',
        xAxisKey: 'pipeline_name',
        metrics: [
          { key: 'error_rate_pct', label: 'Error Rate (%)', color: '#ef4444', format: 'percentage' },
          { key: 'dropped_records', label: 'Dropped Records', color: '#f97316', format: 'number' }
        ],
        data: [
          { pipeline_name: 'CLICKSTREAM_CDC', total_ingested: 1420000, dropped_records: 12400, error_rate_pct: 0.873 },
          { pipeline_name: 'PAYMENT_AUTH_STREAM', total_ingested: 850000, dropped_records: 2150, error_rate_pct: 0.253 },
          { pipeline_name: 'LOGISTICS_IOT_MQTT', total_ingested: 3200000, dropped_records: 4800, error_rate_pct: 0.150 },
          { pipeline_name: 'USER_PROFILE_SYNC', total_ingested: 490000, dropped_records: 410, error_rate_pct: 0.084 },
          { pipeline_name: 'INVENTORY_DELTA_LAKE', total_ingested: 920000, dropped_records: 180, error_rate_pct: 0.020 }
        ],
        keyTakeaways: [
          'CLICKSTREAM_CDC pipeline accounts for 62% of all dropped records, triggered by unregistered nested JSON schema variants.',
          'PAYMENT_AUTH_STREAM experienced brief 0.25% drop surges during automated SSL certificate renewal.',
          'Overall enterprise data pipeline error rate remains low at 0.18% across 6.88M weekly events.'
        ],
        recommendation: 'Deploy dynamic JSON schema evolution filter on CLICKSTREAM_CDC staging topic to route unmapped fields into a dead-letter queue.',
        executionStats: {
          executionTimeMs: 44,
          bytesScanned: '88.4 MB',
          partitionPruningPct: 91.8,
          estimatedCostUsd: 0.08,
          warehouseCluster: 'SECURITY_AUDIT_WH',
          cacheHit: false
        },
        autoFormatMeta: {
          suggestedTitle: 'Ingestion Pipeline Error Rates & Packet Drops',
          subtitle: 'Ranked by Error Percentage over 7-Day Window',
          primaryValueFormat: 'percentage',
          unit: 'Percentage (%)'
        },
        followUpQuestions: [
          'What are the most frequent error codes in CLICKSTREAM_CDC?',
          'Show sample dead-letter queue records for schema validation errors',
          'Generate automated dbt test rule to assert error_rate < 0.1%'
        ]
      };
    } else {
      // Default: Cost / Throughput / General query
      fallbackResult = {
        sql: `SELECT 
  cluster_name,
  ROUND(SUM(credits_consumed), 1) as credits_consumed,
  ROUND(SUM(credits_consumed * 2.85), 2) as compute_cost_usd,
  ROUND(SUM(events_processed_millions), 1) as events_processed_m,
  ROUND(SUM(credits_consumed * 2.85) / NULLIF(SUM(events_processed_millions), 0), 2) as cost_per_million_events
FROM ${warehouseType || 'snowflake'}_analytics.cluster_billing_summary
WHERE recorded_date >= CURRENT_DATE() - INTERVAL '7 DAYS'
GROUP BY 1
ORDER BY 3 DESC;`,
        sqlExplanation: `Aggregates cloud warehouse cluster credit burn, applies a $2.85/credit rate factor, and calculates cost efficiency per million events processed.`,
        chartType: 'bar',
        xAxisKey: 'cluster_name',
        metrics: [
          { key: 'compute_cost_usd', label: 'Compute Cost ($)', color: '#6366f1', format: 'currency' },
          { key: 'events_processed_m', label: 'Throughput (M Events)', color: '#10b981', format: 'number' }
        ],
        data: [
          { cluster_name: 'INGEST_CLUSTER_01', compute_cost_usd: 480.50, events_processed_m: 84.2, credits_consumed: 168.6, cost_per_million_events: 5.71 },
          { cluster_name: 'TRANSFORM_DBT_XL', compute_cost_usd: 840.20, events_processed_m: 62.8, credits_consumed: 294.8, cost_per_million_events: 13.38 },
          { cluster_name: 'BI_ANALYTICS_QUERY', compute_cost_usd: 310.80, events_processed_m: 14.5, credits_consumed: 109.0, cost_per_million_events: 21.43 },
          { cluster_name: 'CDC_KAFKA_GATEWAY', compute_cost_usd: 195.40, events_processed_m: 110.4, credits_consumed: 68.5, cost_per_million_events: 1.77 },
          { cluster_name: 'ML_FEATURE_STORE', compute_cost_usd: 620.00, events_processed_m: 38.9, credits_consumed: 217.5, cost_per_million_events: 15.94 }
        ],
        keyTakeaways: [
          'TRANSFORM_DBT_XL accounts for 34.3% of total weekly warehouse spend, primarily during hourly micro-batch compactions.',
          'CDC_KAFKA_GATEWAY achieved the highest cost-efficiency ratio at $1.77 per million processed events.',
          'Query pruning cache hit rate reached 89.4%, saving an estimated $420 in compute credits.'
        ],
        recommendation: 'Enable auto-suspend after 60 seconds on TRANSFORM_DBT_XL to prevent idle warehouse credit consumption during off-peak hours.',
        executionStats: {
          executionTimeMs: 52,
          bytesScanned: '210.5 MB',
          partitionPruningPct: 89.4,
          estimatedCostUsd: 0.18,
          warehouseCluster: 'FINOPS_MONITOR_WH',
          cacheHit: true
        },
        autoFormatMeta: {
          suggestedTitle: 'Warehouse Compute Cost vs Event Throughput',
          subtitle: 'Multi-Cluster Cost Efficiency & Throughput Comparison',
          primaryValueFormat: 'currency',
          unit: 'USD ($)'
        },
        followUpQuestions: [
          'Which warehouse queries consumed the most credits in TRANSFORM_DBT_XL?',
          'Simulate cost impact of reducing auto-suspend window from 5m to 1m',
          'Breakdown weekly spend by individual data engineering teams'
        ]
      };
    }

    return res.json({
      id: `viz-${Date.now().toString().slice(-4)}`,
      question: question || 'Warehouse analytics summary',
      title: fallbackResult.autoFormatMeta.suggestedTitle,
      warehouseType: warehouseType || 'snowflake',
      promptMode,
      ...fallbackResult
    });
  }

  try {
    const promptStrategyDirectives = {
      standard: 'Provide standard production SQL with accurate aggregations and balanced metrics.',
      finops: 'Prioritize compute cost, credit burn, scan size reduction, query pruning efficiency, and FinOps ROI.',
      root_cause: 'Focus on anomaly detection, error code distribution, outliers, drop rates, and latency bottlenecks.',
      executive: 'Produce executive-level KPI summaries, high-level trends, clear business metrics, and strategic recommendations.'
    }[promptMode as 'standard' | 'finops' | 'root_cause' | 'executive'] || 'Standard warehouse analysis';

    const prompt = `You are a Principal AI Business Intelligence Analyst and Senior SQL Architect for ${warehouseType || 'Snowflake/BigQuery/Databricks/Redshift'}.
The user asks this analytical question: "${question}".

Strategy / Mode Directive: ${promptStrategyDirectives}

Available Schema Context: ${JSON.stringify(schemaContext || {
      tables: [
        { name: 'realtime_events', columns: ['event_id', 'event_type', 'user_id', 'amount_usd', 'region', 'latency_ms', 'status', 'created_at'] },
        { name: 'pipeline_telemetry', columns: ['pipeline_id', 'source', 'warehouse', 'throughput_eps', 'error_count', 'cpu_utilization', 'timestamp'] },
        { name: 'warehouse_billing', columns: ['cluster_name', 'credits_used', 'cost_usd', 'query_count', 'recorded_date'] }
      ]
    })}

Generate a comprehensive JSON response matching this exact schema:
{
  "sql": string (clean, production-ready SQL formatted with proper indentation),
  "sqlExplanation": string (1-2 sentences explaining what the SQL query does and optimization techniques used),
  "chartType": "bar" | "line" | "area" | "pie" | "scatter",
  "xAxisKey": string (the primary dimension or time key in the data objects),
  "metrics": [
    { "key": string, "label": string, "color": string, "format": "currency" | "number" | "percentage" | "latency" }
  ],
  "data": array of 5 to 7 realistic result objects containing the xAxisKey and numeric values for each metric key,
  "keyTakeaways": array of 3 crisp, insightful bullet points,
  "recommendation": string (actionable optimization recommendation),
  "executionStats": {
    "executionTimeMs": number (e.g. 42),
    "bytesScanned": string (e.g. "124 MB"),
    "partitionPruningPct": number (e.g. 94.5),
    "estimatedCostUsd": number (e.g. 0.12)
  },
  "autoFormatMeta": {
    "suggestedTitle": string,
    "subtitle": string,
    "primaryValueFormat": "currency" | "number" | "percentage" | "latency",
    "unit": string
  },
  "followUpQuestions": array of 3 relevant follow-up questions
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Translate business questions into executable warehouse SQL, dynamic visualization metadata, auto-formatting rules, and crisp executive insights.',
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const result = {
      id: `viz-${Date.now().toString().slice(-4)}`,
      question,
      title: parsed.autoFormatMeta?.suggestedTitle || parsed.title || question,
      warehouseType: warehouseType || 'snowflake',
      promptMode,
      ...parsed,
    };
    res.json(result);
  } catch (err: any) {
    console.error('Error in /api/gemini/nlq:', err);
    res.status(500).json({ error: err.message || 'NLQ query translation failed' });
  }
});


// 4. AI Security & Governance Scanner
app.post('/api/gemini/security-scan', async (req, res) => {
  const { fields, datasetName } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      overallRiskScore: 'LOW',
      complianceReadiness: {
        gdpr: '94% Compliant',
        hipaa: '100% Compliant',
        soc2: '96% Compliant'
      },
      piiFindings: [
        { column: 'customer_email', classification: 'PII / Identifier', sensitivity: 'HIGH', recommendedMask: 'SHA-256 Hash + Salt', rule: 'GDPR Art. 6' },
        { column: 'credit_card_token', classification: 'PCI-DSS Tier 1', sensitivity: 'CRITICAL', recommendedMask: 'Format Preserving Encryption (FPE)', rule: 'PCI DSS v4.0' },
        { column: 'ip_address', classification: 'Network Identifier', sensitivity: 'MEDIUM', recommendedMask: 'Anonymize /24 Subnet Prefix', rule: 'CCPA Sec. 1798' },
        { column: 'device_fingerprint', classification: 'Pseudonymous ID', sensitivity: 'LOW', recommendedMask: 'None Required (Access Logged)', rule: 'SOC2 Trust Criteria' }
      ],
      governanceRecommendations: [
        'Enforce dynamic row-level security (RLS) so Analyst roles only observe unmasked data for their respective assigned geography.',
        'Rotate KMS column-encryption keys every 90 days with automated envelope encryption.',
        'Activate real-time audit triggers on queries exporting more than 10,000 unmasked customer records.'
      ]
    });
  }

  try {
    const prompt = `Perform an enterprise data security, PII, and governance compliance audit for dataset: "${datasetName || 'Customer Streaming Analytics'}".
Columns to analyze: ${JSON.stringify(fields || ['user_id', 'email', 'ip_address', 'ssn_last4', 'order_total', 'geo_location', 'payment_token'])}.

Evaluate compliance against GDPR, HIPAA, SOC2, and PCI-DSS.
Return valid JSON matching this schema:
{
  "overallRiskScore": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "complianceReadiness": { "gdpr": string, "hipaa": string, "soc2": string },
  "piiFindings": [
    { "column": string, "classification": string, "sensitivity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", "recommendedMask": string, "rule": string }
  ],
  "governanceRecommendations": string[]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (err: any) {
    console.error('Error in /api/gemini/security-scan:', err);
    res.status(500).json({ error: err.message || 'Security scan failed' });
  }
});

// 5. Automated Custom Report Generator
app.post('/api/gemini/generate-report', async (req, res) => {
  const { title, reportType, modulesIncluded, timeframe, targetAudience } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      title: title || 'Executive Data Engineering & Warehouse Health Audit',
      generatedAt: new Date().toISOString(),
      executiveSummary: `Over the past ${timeframe || '30 days'}, the ShoonyaAI platform processed 428.6 million streaming events across 14 pipelines with a 99.98% SLA attainment rate. Compute resource optimization reduced monthly data warehouse expenditure by 22.4% while maintaining sub-400ms ingestion latency.`,
      kpiHighlights: [
        { label: 'Total Ingested Events', value: '428.6M', trend: '+18.4% vs last period' },
        { label: 'Pipeline SLA Attainment', value: '99.98%', trend: '+0.12%' },
        { label: 'Avg Ingestion Latency', value: '285 ms', trend: '-42 ms improvement' },
        { label: 'Estimated Warehouse Savings', value: '$14,820', trend: '-22.4% cost' }
      ],
      sections: [
        {
          heading: '1. Streaming Pipeline Performance & Throughput',
          content: 'Continuous Kafka-to-Snowflake and BigQuery sync workers maintained steady throughput with zero unhandled backpressure incidents. Automated micro-batch dynamic sizing handled 3 surge events during product drop intervals seamlessly.'
        },
        {
          heading: '2. Security, PII Masking & Compliance Posture',
          content: '100% of incoming sensitive attributes (email, IP, tokenized cards) were sanitized via automated column-masking policies. Zero unauthorized PII access attempts were detected in the immutable audit log.'
        },
        {
          heading: '3. Strategic Recommendations for Next Sprint',
          content: '1) Expand Databricks Delta Lake ingestion for predictive ML feature store. 2) Schedule automated schema compaction during low-traffic UTC windows. 3) Enable Slack alert notifications for schema drift warnings.'
        }
      ]
    });
  }

  try {
    const prompt = `Generate a high-level enterprise report for a data platform.
Title: ${title}
Report Type: ${reportType || 'Executive Summary'}
Modules Included: ${JSON.stringify(modulesIncluded || ['Architect', 'Engineer', 'Analyst', 'Security', 'Admin'])}
Timeframe: ${timeframe || 'Past 30 Days'}
Target Audience: ${targetAudience || 'C-Suite, VP of Data & Lead Architects'}

Return valid JSON adhering to:
{
  "title": string,
  "generatedAt": string,
  "executiveSummary": string,
  "kpiHighlights": [{"label": string, "value": string, "trend": string}],
  "sections": [{"heading": string, "content": string}]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (err: any) {
    console.error('Error in /api/gemini/generate-report:', err);
    res.status(500).json({ error: err.message || 'Report generation failed' });
  }
});

// 6. AI Architect: Existing Data Model Analyzer (Performance & Cost Optimization)
app.post('/api/gemini/analyze-data-model', async (req, res) => {
  const { modelName, warehouse, rowCount, sizeGb, currentPartitioning, clusteringKey, queryFrequencyPerDay, avgExecutionTimeSec, monthlyCostUsd } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    const isBigQuery = (warehouse || '').toLowerCase().includes('bigquery');
    const isDelta = (warehouse || '').toLowerCase().includes('databricks') || (warehouse || '').toLowerCase().includes('delta');

    return res.json({
      modelId: `mdl-${Date.now().toString().slice(-4)}`,
      modelName: modelName || 'orders_fact',
      warehouse: warehouse || 'Snowflake Enterprise',
      healthScore: 52,
      potentialCostSavingsPct: 38.5,
      potentialSpeedup: '4.6x Faster',
      summary: `The data model \`${modelName || 'orders_fact'}\` lacks optimal query pruning and partition alignment for ${warehouse || 'Snowflake'}. Analytical queries scan ~${sizeGb || 340} GB without pruning, causing excessive warehouse compute credit consumption. Recommended clustering and auto-suspend will yield ~$${Math.round((monthlyCostUsd || 1200) * 0.385)}/month in direct FinOps savings.`,
      recommendations: [
        {
          category: isBigQuery ? 'partitioning' : 'clustering',
          title: isBigQuery ? 'Apply Ingestion Timestamp Partitioning' : 'Cluster Micro-Partitions by High-Cardinality Filter Key',
          description: isBigQuery 
            ? 'Partition table by DATE(created_at) and cluster by tenant_id to reduce query scan bytes by 72%.'
            : 'Apply multi-column cluster key on (DATE(created_at), region_code) to prune 85% of scanned micro-partitions.',
          estimatedSavingsUsd: Math.round((monthlyCostUsd || 1200) * 0.26),
          speedupMultiplier: '4.2x',
          suggestedDdlSql: isBigQuery
            ? `CREATE OR REPLACE TABLE \`${modelName}\`\nPARTITION BY DATE(created_at)\nCLUSTER BY region, user_id\nAS SELECT * FROM \`${modelName}\`;`
            : `ALTER TABLE ${modelName} CLUSTER BY (DATE(created_at), region);`,
          impactLevel: 'HIGH'
        },
        {
          category: 'warehouse_sizing',
          title: 'Warehouse Auto-Suspend & Concurrency Scaling',
          description: 'Reduce warehouse idle timeout from 600 seconds to 60 seconds to eliminate credit drain between micro-batch transformation runs.',
          estimatedSavingsUsd: Math.round((monthlyCostUsd || 1200) * 0.12),
          speedupMultiplier: '1.0x',
          suggestedDdlSql: `ALTER WAREHOUSE TRANSFORM_CLUSTER SET AUTO_SUSPEND = 60, AUTO_RESUME = TRUE;`,
          impactLevel: 'HIGH'
        },
        {
          category: 'materialization',
          title: 'Create Materialized Incremental View',
          description: 'Materialize high-frequency hourly aggregate rollups to completely bypass raw table scan on executive dashboards.',
          estimatedSavingsUsd: Math.round((monthlyCostUsd || 1200) * 0.08),
          speedupMultiplier: '9.5x',
          suggestedDdlSql: `CREATE OR REPLACE MATERIALIZED VIEW mv_${modelName}_daily_summary AS\nSELECT DATE(created_at) as event_date, COUNT(*) as total_events\nFROM ${modelName}\nGROUP BY 1;`,
          impactLevel: 'MEDIUM'
        }
      ],
      suggestedModelDdl: `-- AI Optimized dbt Transformation Specification for ${modelName || 'orders_fact'}\n{{\n  config(\n    materialized = 'incremental',\n    cluster_by = ['DATE(created_at)', 'region'],\n    unique_key = 'record_id',\n    incremental_strategy = 'merge'\n  )\n}}\n\nSELECT\n  record_id,\n  user_id,\n  region,\n  TRY_CAST(amount AS NUMBER(12,2)) as amount,\n  created_at,\n  CURRENT_TIMESTAMP() as _dbt_updated_at\nFROM {{ source('raw_store', '${modelName || 'orders_fact'}_cdc') }}\n{% if is_incremental() %}\n  WHERE created_at >= (SELECT MAX(created_at) FROM {{ this }})\n{% endif %};`
    });
  }

  try {
    const prompt = `You are a Principal Cloud Data Warehouse Architect specializing in Snowflake, Google BigQuery, Databricks Delta Lake, and Redshift.
Analyze this existing warehouse data model and return a comprehensive performance and cost optimization report.

Model: ${modelName}
Connected Warehouse: ${warehouse}
Row Count: ${rowCount || '100,000,000'}
Storage Size: ${sizeGb || '250'} GB
Current Partitioning: ${currentPartitioning || 'None'}
Current Clustering: ${clusteringKey || 'None'}
Query Frequency: ${queryFrequencyPerDay || 3000} queries/day
Average Execution Time: ${avgExecutionTimeSec || 6.5} seconds
Monthly Compute Spend: $${monthlyCostUsd || 1200}

Provide specific recommendations covering partitioning, clustering, compaction, materialization, and warehouse sizing.
Return valid JSON adhering strictly to:
{
  "modelId": string,
  "modelName": string,
  "warehouse": string,
  "healthScore": number (1-100),
  "potentialCostSavingsPct": number,
  "potentialSpeedup": string,
  "summary": string,
  "recommendations": [
    {
      "category": "partitioning" | "clustering" | "materialization" | "compaction" | "warehouse_sizing",
      "title": string,
      "description": string,
      "estimatedSavingsUsd": number,
      "speedupMultiplier": string,
      "suggestedDdlSql": string,
      "impactLevel": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "suggestedModelDdl": string (valid dbt SQL configuration)
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (err: any) {
    console.error('Error in /api/gemini/analyze-data-model:', err);
    res.status(500).json({ error: err.message || 'Model analysis failed' });
  }
});

// 7. AI Architect: Proactive Data Quality Scanner & Cleansing Advisor
app.post('/api/gemini/scan-data-quality', async (req, res) => {
  const { table, warehouse, sampleRows } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      table: table || 'orders_fact',
      warehouse: warehouse || 'Snowflake Enterprise',
      scannedRows: 10000,
      overallQualityScore: 79,
      cleanRowsPct: 77.2,
      scanTimestamp: new Date().toISOString(),
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
          sampleDefect: 'Negative currency value: -$124.50',
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
      cleansingDbtModel: `-- AI Generated Proactive Cleansing Model: stg_${table || 'orders'}_cleansed.sql\nWITH source_raw AS (\n  SELECT * FROM {{ source('warehouse_marts', '${table || 'orders_fact'}') }}\n),\nsanitized AS (\n  SELECT\n    order_id,\n    -- 1. Cleansed Null Foreign Key with deterministic guest fallback hash\n    COALESCE(customer_uuid, MD5(CONCAT_WS(':', COALESCE(ip_address, '0.0.0.0'), 'GUEST'))) as customer_uuid,\n    -- 2. Format Normalization: standardize multiple date patterns into clean UTC\n    COALESCE(\n      TRY_TO_TIMESTAMP_TZ(order_created_at, 'YYYY-MM-DDTHH24:MI:SSZ'),\n      TRY_TO_TIMESTAMP_TZ(order_created_at, 'MM/DD/YYYY HH12:MI AM')\n    ) as order_timestamp_utc,\n    -- 3. Out of Range Anomaly correction\n    CASE \n      WHEN order_amount_usd < 0 THEN ABS(order_amount_usd)\n      ELSE order_amount_usd \n    END as gross_order_amount_usd,\n    CASE WHEN order_amount_usd < 0 THEN TRUE ELSE FALSE END as is_refund_adjustment,\n    order_status,\n    _ingested_at\n  FROM source_raw\n)\n-- 4. Deduplicate primary key from streaming delivery duplicate packets\nSELECT * FROM sanitized\nQUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY _ingested_at DESC) = 1;`,
      sampleDataPreview: sampleRows || [
        { order_id: 'ord-90112', customer_uuid: 'usr-928410', order_amount_usd: 145.20, order_created_at: '2026-09-13T08:12:00Z', status: 'VALID' },
        { order_id: 'ord-90113', customer_uuid: null, order_amount_usd: 89.00, order_created_at: '2026-09-13T08:14:22Z', status: 'NULL_KEY' },
        { order_id: 'ord-90114', customer_uuid: 'usr-194021', order_amount_usd: -42.50, order_created_at: '09/13/2026 08:15 AM', status: 'OUT_OF_RANGE' },
        { order_id: 'ord-90115', customer_uuid: 'usr-839120', order_amount_usd: 320.00, order_created_at: '09/13/2026 08:18 AM', status: 'FORMAT_MISMATCH' },
        { order_id: 'ord-90112', customer_uuid: 'usr-928410', order_amount_usd: 145.20, order_created_at: '2026-09-13T08:12:00Z', status: 'DUPLICATE' },
        { order_id: 'ord-90116', customer_uuid: 'usr-441209', order_amount_usd: 210.50, order_created_at: '2026-09-13T08:20:01Z', status: 'VALID' },
        { order_id: 'ord-90117', customer_uuid: null, order_amount_usd: 64.00, order_created_at: '2026-09-13T08:22:15Z', status: 'NULL_KEY' }
      ]
    });
  }

  try {
    const prompt = `You are an AI Data Quality & Cleansing Architect.
Perform a deep proactive data quality scan on the sample data for table: "${table || 'orders_fact'}".
Warehouse: ${warehouse || 'Snowflake'}
Sample Data: ${JSON.stringify(sampleRows || [])}

Detect:
1. Missing / NULL values in critical keys
2. Inconsistent date, currency, or string formats
3. Duplicate primary or composite keys
4. Out-of-range numerical values or anomalies

Provide actionable preliminary recommendations and SQL / dbt transformation expressions for automated cleansing.
Return valid JSON adhering to:
{
  "table": string,
  "warehouse": string,
  "scannedRows": number,
  "overallQualityScore": number (0-100),
  "cleanRowsPct": number,
  "scanTimestamp": string,
  "issues": [
    {
      "id": string,
      "column": string,
      "issueType": "missing_value" | "inconsistent_format" | "duplicate_key" | "out_of_range",
      "severity": "critical" | "warning" | "info",
      "affectedRowsCount": number,
      "affectedRowsPct": number,
      "sampleDefect": string,
      "recommendation": string,
      "cleansingSql": string
    }
  ],
  "cleansingDbtModel": string (complete dbt SQL model with CTEs addressing the issues),
  "sampleDataPreview": array of row objects with quality indicators
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (err: any) {
    console.error('Error in /api/gemini/scan-data-quality:', err);
    res.status(500).json({ error: err.message || 'Quality scan failed' });
  }
});

// 8. Automated Alerts: Statistical KPI Anomaly Detection
app.post('/api/gemini/detect-anomaly', async (req, res) => {
  const { kpiKey, kpiLabel, currentValue, mean, stdDev, thresholdZScore } = req.body;
  const val = Number(currentValue) || 0;
  const avg = Number(mean) || 1;
  const sd = Number(stdDev) || 1;
  const z = Number((Math.abs(val - avg) / sd).toFixed(2));
  const isAnomaly = z >= (thresholdZScore || 2.5);
  const deviationPct = Number((((val - avg) / avg) * 100).toFixed(1));

  const ai = getGeminiClient();

  if (!ai || !isAnomaly) {
    return res.json({
      isAnomaly,
      zScore: z,
      deviationPct,
      confidenceLevel: z > 3.5 ? '99.9%' : z > 3.0 ? '99.5%' : z > 2.5 ? '98.8%' : '84.0%',
      kpiKey: kpiKey || 'kpi',
      kpiLabel: kpiLabel || 'Monitored KPI',
      metricValue: val,
      baselineMean: avg,
      standardDeviation: sd,
      rootCause: isAnomaly 
        ? `Statistical deviation of +${z}σ detected against 7-day rolling mean. Traffic surge or unoptimized concurrent query cluster resource contention detected.`
        : 'Metric operating within normal ±2.5σ statistical tolerance bands.',
      stakeholders: [
        { name: 'Data Platform On-Call', role: 'Infrastructure Operations', channel: 'PagerDuty (High Priority)' },
        { name: 'Lead Architect', role: 'AI Data Architecture', channel: 'Slack #data-platform-alerts' },
        { name: 'FinOps Team', role: 'Cloud Cost Governance', channel: 'Email: finops-alerts@enterprise.io' }
      ],
      remediationAction: isAnomaly 
        ? 'Scale out consumer replica pools and apply automatic warehouse auto-suspend override.'
        : 'No immediate remediation required. Continue automated monitoring.'
    });
  }

  try {
    const prompt = `You are a Statistical Anomaly Detection & Incident Response AI for an enterprise data engineering platform.
A statistically significant metric deviation was detected:
KPI: "${kpiLabel}" (${kpiKey})
Current Observed Value: ${val}
Rolling Baseline Mean: ${avg}
Standard Deviation (σ): ${sd}
Computed Z-Score: ${z}σ
Deviation: ${deviationPct}%
Statistical Anomaly Threshold: ${thresholdZScore || 2.5}σ

Generate an incident response summary with deep context on probable root causes, impacted stakeholders, and exact operational remediation.
Return valid JSON matching:
{
  "isAnomaly": true,
  "zScore": number,
  "deviationPct": number,
  "confidenceLevel": string,
  "kpiKey": string,
  "kpiLabel": string,
  "metricValue": number,
  "baselineMean": number,
  "standardDeviation": number,
  "rootCause": string,
  "stakeholders": [{"name": string, "role": string, "channel": string}],
  "remediationAction": string
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (err: any) {
    console.error('Error in /api/gemini/detect-anomaly:', err);
    res.status(500).json({ error: err.message || 'Anomaly detection failed' });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShoonyaAI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
