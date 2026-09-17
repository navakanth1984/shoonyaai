/**
 * Polyglot Multi-Language Code Generators for ShoonyaAI
 * Generates production-ready pipelines, queries, and visualizations across:
 * - Spark Scala
 * - Java (Apache Spark / Flink)
 * - PySpark (Python)
 * - Spark SQL
 * - ANSI SQL (Snowflake / BigQuery / Redshift)
 * - Python (DuckDB / Polars / Pandas)
 * - React (Vite + TSX)
 * - HTML5 Standalone Canvas & Three.js 3D Bundle
 */

export interface PolyglotCodeSnippet {
  language: string;
  dialect: string;
  extension: string;
  code: string;
  libraries: string[];
  executionInstructions: string;
  manifestFile?: {
    filename: string;
    content: string;
  };
}

export function generatePolyglotSnippets(queryResult: {
  title?: string;
  sql: string;
  data?: any[];
  xAxisKey?: string;
  metrics?: Array<{ key: string; label: string; color?: string }>;
  warehouseType?: string;
}): Record<string, PolyglotCodeSnippet> {
  const title = queryResult.title || 'ShoonyaAI Warehouse Analytics';
  const cleanSql = (queryResult.sql || '').trim();
  const xAxis = queryResult.xAxisKey || 'cluster_name';
  const metrics = queryResult.metrics && queryResult.metrics.length > 0 
    ? queryResult.metrics 
    : [{ key: 'cost_usd', label: 'Cost USD' }, { key: 'throughput_eps', label: 'Throughput EPS' }];
  const primaryMetric = metrics?.[0]?.key || 'cost_usd';

  // 1. PySpark (Python)
  const pysparkCode = `"""
ShoonyaAI Autonomous Pipeline: ${title}
Framework: PySpark (Apache Spark 3.5+ Structured Streaming & Batch)
Catalog: Iceberg / Delta Lake / Snowflake Connector
"""
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.window import Window

# 1. Initialize High-Performance Spark Session
spark = SparkSession.builder \\
    .appName("ShoonyaAI_${title.replace(/[^a-zA-Z0-9]/g, '_')}") \\
    .config("spark.sql.shuffle.partitions", "200") \\
    .config("spark.sql.adaptive.enabled", "true") \\
    .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \\
    .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0,net.snowflake:spark-snowflake_2.12:2.12.0-spark_3.4") \\
    .getOrCreate()

spark.sparkContext.setLogLevel("WARN")

# 2. Ingest Ingestion Telemetry Stream
df_telemetry = spark.readStream \\
    .format("kafka") \\
    .option("kafka.bootstrap.servers", "kafka-broker-01.shoonyai.internal:9092") \\
    .option("subscribe", "telemetry_events_prod") \\
    .option("startingOffsets", "latest") \\
    .load()

# 3. Apply Schema & JSON Deserialization
df_parsed = df_telemetry.selectExpr("CAST(value AS STRING) as json_payload") \\
    .select(F.from_json("json_payload", "event_id STRING, ${xAxis} STRING, ${primaryMetric} DOUBLE, timestamp TIMESTAMP").alias("data")) \\
    .select("data.*")

# 4. Distributed Aggregations & Window Computation
df_aggregated = df_parsed \\
    .withWatermark("timestamp", "5 minutes") \\
    .groupBy(F.window("timestamp", "1 minute"), "${xAxis}") \\
    .agg(
        F.sum("${primaryMetric}").alias("total_${primaryMetric}"),
        F.count("event_id").alias("record_count"),
        F.avg("${primaryMetric}").alias("avg_${primaryMetric}")
    )

# 5. Output Sink to Snowflake Lakehouse / Object Storage
query = df_aggregated.writeStream \\
    .format("snowflake") \\
    .outputMode("append") \\
    .option("checkpointLocation", "s3://shoonyai-checkpoints/prod/${xAxis}/") \\
    .option("sfURL", "https://shoonyai-prod.snowflakecomputing.com") \\
    .option("sfDatabase", "ANALYTICS_MART") \\
    .option("sfSchema", "PUBLIC") \\
    .option("sfTable", "REALTIME_AGGREGATES") \\
    .start()

query.awaitTermination()
`;

  // 2. Spark Scala
  const sparkScalaCode = `package com.shoonyai.pipeline

import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._
import org.apache.spark.sql.streaming.Trigger
import scala.concurrent.duration._

/**
 * ShoonyaAI Enterprise Pipeline: ${title}
 * Language: Scala 2.12 / 2.13 with Apache Spark 3.5
 */
object ${title.replace(/[^a-zA-Z0-9]/g, '')}Pipeline {
  
  case class TelemetryRecord(
    eventId: String,
    ${xAxis}: String,
    ${primaryMetric}: Double,
    timestamp: java.sql.Timestamp
  )

  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("ShoonyaAI_${title.replace(/[^a-zA-Z0-9]/g, '_')}")
      .config("spark.sql.adaptive.enabled", "true")
      .config("spark.sql.streaming.forceDeleteTempCheckpointLocation", "true")
      .getOrCreate()

    import spark.implicits._

    // 1. Ingest Structured Stream from Event Bus
    val inputStream = spark.readStream
      .format("kafka")
      .option("kafka.bootstrap.servers", "kafka-broker-01.shoonyai.internal:9092")
      .option("subscribe", "telemetry_events_prod")
      .load()

    // 2. Transform & Type Dataset
    val schema = new StructType()
      .add("event_id", StringType, nullable = false)
      .add("${xAxis}", StringType, nullable = false)
      .add("${primaryMetric}", DoubleType, nullable = false)
      .add("timestamp", TimestampType, nullable = false)

    val enriched = inputStream
      .selectExpr("CAST(value AS STRING) AS json_str")
      .select(from_json($"json_str", schema).as("data"))
      .select("data.*")
      .as[TelemetryRecord]

    // 3. Stateful Micro-Batch Aggregations
    val aggregated = enriched
      .withWatermark("timestamp", "2 minutes")
      .groupBy(
        window($"timestamp", "1 minute", "30 seconds"),
        col("${xAxis}")
      )
      .agg(
        sum("${primaryMetric}").as("metric_sum"),
        count("eventId").as("total_events"),
        avg("${primaryMetric}").as("metric_avg")
      )

    // 4. Sink to Delta Lake / Snowflake
    val streamingQuery = aggregated.writeStream
      .format("delta")
      .outputMode("append")
      .option("checkpointLocation", "/mnt/shoonyai/checkpoints/${xAxis}")
      .trigger(Trigger.ProcessingTime(10.seconds))
      .start("/mnt/shoonyai/lakehouse/mart_${xAxis}")

    streamingQuery.awaitTermination()
  }
}
`;

  // 3. Java (Apache Spark & Flink)
  const javaCode = `package com.shoonyai.engine;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.streaming.StreamingQuery;
import org.apache.spark.sql.streaming.StreamingQueryException;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructType;
import static org.apache.spark.sql.functions.*;

import java.util.concurrent.TimeoutException;

/**
 * ShoonyaAI Enterprise Engine: ${title}
 * Framework: Apache Spark 3.5 Java API
 */
public class ${title.replace(/[^a-zA-Z0-9]/g, '')}Job {

    public static void main(String[] args) throws StreamingQueryException, TimeoutException {
        SparkSession spark = SparkSession.builder()
                .appName("ShoonyaAI_${title.replace(/[^a-zA-Z0-9]/g, '_')}")
                .config("spark.sql.adaptive.enabled", "true")
                .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
                .getOrCreate();

        StructType payloadSchema = new StructType()
                .add("event_id", DataTypes.StringType, false)
                .add("${xAxis}", DataTypes.StringType, false)
                .add("${primaryMetric}", DataTypes.DoubleType, false)
                .add("timestamp", DataTypes.TimestampType, false);

        Dataset<Row> rawStream = spark.readStream()
                .format("kafka")
                .option("kafka.bootstrap.servers", "kafka-broker-01.shoonyai.internal:9092")
                .option("subscribe", "telemetry_events_prod")
                .load();

        Dataset<Row> transformed = rawStream
                .selectExpr("CAST(value AS STRING) as json_val")
                .select(from_json(col("json_val"), payloadSchema).as("record"))
                .select("record.*");

        Dataset<Row> aggregated = transformed
                .withWatermark("timestamp", "3 minutes")
                .groupBy(
                        window(col("timestamp"), "1 minute"),
                        col("${xAxis}")
                )
                .agg(
                        sum(col("${primaryMetric}")).as("total_${primaryMetric}"),
                        count(col("event_id")).as("event_volume"),
                        round(avg(col("${primaryMetric}")), 2).as("avg_${primaryMetric}")
                );

        StreamingQuery query = aggregated.writeStream()
                .format("parquet")
                .option("path", "s3a://shoonyai-lakehouse/data_${xAxis}")
                .option("checkpointLocation", "s3a://shoonyai-checkpoints/java_${xAxis}")
                .outputMode("append")
                .start();

        query.awaitTermination();
    }
}
`;

  // 4. Spark SQL
  const sparkSqlCode = `-- =======================================================================
-- ShoonyaAI Spark SQL Distributed Query Model
-- Target Engine: Spark Thrift Server / Databricks Photon / AWS EMR
-- =======================================================================

-- 1. Create Broadcast Temporary View from Streaming Table
CREATE OR REPLACE TEMPORARY VIEW v_telemetry_source AS
SELECT 
    event_id,
    ${xAxis},
    ${primaryMetric},
    event_type,
    created_at
FROM parquet.\`s3://shoonyai-lakehouse/telemetry_events_prod/\`
WHERE created_at >= current_date() - INTERVAL 7 DAYS;

-- 2. Distributed Window Transformation with Broadcast Joins
WITH ranked_metrics AS (
    SELECT 
        ${xAxis},
        SUM(${primaryMetric}) AS total_${primaryMetric},
        COUNT(event_id) AS total_events,
        AVG(${primaryMetric}) AS avg_${primaryMetric},
        DENSE_RANK() OVER (ORDER BY SUM(${primaryMetric}) DESC) AS rank_order
    FROM v_telemetry_source
    GROUP BY ${xAxis}
)
SELECT 
    ${xAxis},
    total_${primaryMetric},
    total_events,
    ROUND(avg_${primaryMetric}, 2) AS avg_${primaryMetric},
    rank_order
FROM ranked_metrics
ORDER BY total_${primaryMetric} DESC
LIMIT 100;
`;

  // 5. Python (Polars & DuckDB)
  const pythonDuckDbCode = `"""
ShoonyaAI Fast Embedded Analytics
Engines: DuckDB (Vectorized SQL) & Polars (Multi-threaded Rust Core)
"""
import duckdb
import polars as pl

# --- Option A: Fast Vectorized DuckDB Query ---
con = duckdb.connect(database=':memory:')

# Ingest Parquet Lakehouse partition directly
duck_df = con.execute("""
    SELECT 
        ${xAxis},
        ROUND(SUM(${primaryMetric}), 2) AS total_${primaryMetric},
        COUNT(*) AS event_count,
        ROUND(AVG(${primaryMetric}), 2) AS mean_value
    FROM read_parquet('s3://shoonyai-lakehouse/events/*.parquet')
    GROUP BY ${xAxis}
    ORDER BY total_${primaryMetric} DESC
""").df()

print("DuckDB Analytical Result:")
print(duck_df.head(10))

# --- Option B: Polars Multi-Threaded Lazy Execution ---
q = (
    pl.scan_parquet("s3://shoonyai-lakehouse/events/*.parquet")
    .group_by("${xAxis}")
    .agg([
        pl.col("${primaryMetric}").sum().alias("total_${primaryMetric}"),
        pl.len().alias("event_count"),
        pl.col("${primaryMetric}").mean().alias("avg_${primaryMetric}")
    ])
    .sort("total_${primaryMetric}", descending=True)
)

polars_df = q.collect()
print("\\nPolars LazyFrame Execution Result:")
print(polars_df)
`;

  // 6. React + Vite Component (TSX)
  const reactViteCode = `import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ChartProps {
  data?: any[];
  className?: string;
}

export const ${title.replace(/[^a-zA-Z0-9]/g, '')}Widget: React.FC<ChartProps> = ({ 
  data = ${JSON.stringify(queryResult.data?.slice(0, 5) || [], null, 2)},
  className = "w-full h-80"
}) => {
  return (
    <div className={\`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md \${className}\`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">${title}</h3>
          <span className="text-xs text-slate-500">Live ShoonyaAI Warehouse Telemetry</span>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          React 19 &bull; Vite
        </span>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="${xAxis}" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff' }} 
            />
            <Bar dataKey="${primaryMetric}" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ${title.replace(/[^a-zA-Z0-9]/g, '')}Widget;
`;

  // 7. Standalone HTML5 + 3D WebGL Bundle
  const html5StandaloneCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ShoonyaAI Spatial Visualization</title>
  <script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #030712;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .card {
      width: 100%;
      max-width: 900px;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    h1 { font-size: 18px; margin: 0; color: #38bdf8; }
    .badge {
      background: #312e81;
      color: #c7d2fe;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
    }
    #viewport {
      width: 100%;
      height: 420px;
      border-radius: 14px;
      overflow: hidden;
      background: #020617;
      position: relative;
    }
    .footer {
      margin-top: 14px;
      font-size: 12px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <h1>${title}</h1>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">ShoonyaAI 3D Spatial Telemetry & Data Mesh</p>
      </div>
      <span class="badge">Standalone HTML5 &bull; Three.js</span>
    </div>

    <div id="viewport"></div>

    <div class="footer">
      <span>Drag with mouse to rotate in 3D coordinate space</span>
      <span>Engine: WebGL &bull; Three.js 3D</span>
    </div>
  </div>

  <script>
    const container = document.getElementById('viewport');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.02);

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 15, 35);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0x6366f1, 2.0);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(50, 25, 0x4f46e5, 0x1e293b);
    grid.position.y = -8;
    scene.add(grid);

    const group = new THREE.Group();
    scene.add(group);

    // 3D Nodes
    const dataPoints = ${JSON.stringify(queryResult.data?.slice(0, 8) || [{ [xAxis]: 'Cluster-Alpha', [primaryMetric]: 100 }])};
    dataPoints.forEach((d, idx) => {
      const geo = new THREE.SphereGeometry(2.0, 32, 32);
      const mat = new THREE.MeshStandardMaterial({ 
        color: idx % 2 === 0 ? 0x06b6d4 : 0x6366f1, 
        emissive: idx % 2 === 0 ? 0x0891b2 : 0x4338ca,
        roughness: 0.3 
      });
      const mesh = new THREE.Mesh(geo, mat);
      const angle = (idx / dataPoints.length) * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * 14, (idx % 3) * 3 - 2, Math.sin(angle) * 14);
      group.add(mesh);
    });

    // Orbit interaction
    let isDragging = false, prevX = 0, prevY = 0;
    container.addEventListener('pointerdown', (e) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    window.addEventListener('pointerup', () => { isDragging = false; });
    container.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      group.rotation.y += (e.clientX - prevX) * 0.01;
      group.rotation.x += (e.clientY - prevY) * 0.01;
      prevX = e.clientX; prevY = e.clientY;
    });

    function animate() {
      requestAnimationFrame(animate);
      if (!isDragging) group.rotation.y += 0.005;
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
  </script>
</body>
</html>
`;

  return {
    pyspark: {
      language: 'PySpark (Python)',
      dialect: 'Apache Spark 3.5+',
      extension: '.py',
      code: pysparkCode,
      libraries: ['pyspark>=3.5.0', 'delta-spark>=3.0.0', 'snowflake-connector-python'],
      executionInstructions: 'Execute via: spark-submit --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0 pipeline.py',
      manifestFile: {
        filename: 'requirements.txt',
        content: `pyspark==3.5.1\ndelta-spark==3.1.0\nsnowflake-connector-python==3.7.0\nduckdb==0.10.1\npolars==0.20.15\n`
      }
    },
    spark_scala: {
      language: 'Spark Scala',
      dialect: 'Scala 2.12 / 2.13',
      extension: '.scala',
      code: sparkScalaCode,
      libraries: ['org.apache.spark %% spark-sql % 3.5.0', 'io.delta %% delta-spark % 3.0.0'],
      executionInstructions: 'Compile with sbt and submit via: spark-submit --class com.shoonyai.pipeline.Pipeline target/scala-2.12/pipeline_2.12-1.0.jar',
      manifestFile: {
        filename: 'build.sbt',
        content: `name := "ShoonyaAIPipeline"
version := "1.0.0"
scalaVersion := "2.12.18"

libraryDependencies ++= Seq(
  "org.apache.spark" %% "spark-core" % "3.5.0" % "provided",
  "org.apache.spark" %% "spark-sql" % "3.5.0" % "provided",
  "org.apache.spark" %% "spark-sql-kafka-0-10" % "3.5.0",
  "io.delta" %% "delta-spark" % "3.1.0"
)
`
      }
    },
    java_spark: {
      language: 'Java (Apache Spark)',
      dialect: 'Java 17 / 21',
      extension: '.java',
      code: javaCode,
      libraries: ['org.apache.spark:spark-sql_2.12:3.5.0', 'org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0'],
      executionInstructions: 'Build using Maven (mvn clean package) and submit via spark-submit.',
      manifestFile: {
        filename: 'pom.xml',
        content: `<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.shoonyai</groupId>
  <artifactId>spark-pipeline</artifactId>
  <version>1.0.0</version>
  <properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
    <spark.version>3.5.0</spark.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.apache.spark</groupId>
      <artifactId>spark-sql_2.12</artifactId>
      <version>\${spark.version}</version>
    </dependency>
  </dependencies>
</project>
`
      }
    },
    spark_sql: {
      language: 'Spark SQL',
      dialect: 'Distributed ANSI SQL',
      extension: '.sql',
      code: sparkSqlCode,
      libraries: ['Spark Thrift Server', 'Databricks SQL', 'AWS Athena / Presto'],
      executionInstructions: 'Run directly in spark-sql CLI, Databricks Notebook, or Trino cluster.'
    },
    python_polars: {
      language: 'Python (DuckDB & Polars)',
      dialect: 'DuckDB 0.10+ / Polars 0.20+',
      extension: '.py',
      code: pythonDuckDbCode,
      libraries: ['duckdb>=0.10.0', 'polars>=0.20.0', 'pyarrow>=15.0.0'],
      executionInstructions: 'Execute locally with zero server overhead: python analytics.py'
    },
    react_vite: {
      language: 'React 19 + Vite',
      dialect: 'TypeScript JSX (TSX)',
      extension: '.tsx',
      code: reactViteCode,
      libraries: ['react@^19.0.0', 'recharts@^3.0.0', 'lucide-react@^0.546.0', 'tailwindcss@^4.0.0'],
      executionInstructions: 'Drop directly into your Vite / Next.js / React application.'
    },
    html5_standalone: {
      language: 'HTML5 + 3D WebGL (Vite/CDN)',
      dialect: 'Three.js WebGL & HTML5',
      extension: '.html',
      code: html5StandaloneCode,
      libraries: ['Three.js 0.160.0 CDN', 'Modern CSS Grid & Flexbox'],
      executionInstructions: 'Double click to open in any web browser or deploy directly to CDN / S3 / Netlify.'
    },
    ansi_sql: {
      language: 'ANSI SQL',
      dialect: queryResult.warehouseType?.toUpperCase() || 'Snowflake / BigQuery / Redshift',
      extension: '.sql',
      code: cleanSql,
      libraries: ['Standard Warehouse SQL Dialect'],
      executionInstructions: 'Paste into Snowflake Snowsight, BigQuery Studio, Databricks SQL, or Redshift query editor.'
    }
  };
}
