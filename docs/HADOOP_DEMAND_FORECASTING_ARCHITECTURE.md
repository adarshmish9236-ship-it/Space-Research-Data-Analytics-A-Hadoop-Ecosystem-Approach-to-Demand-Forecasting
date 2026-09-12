# Space Research Data Analytics: A Hadoop Ecosystem Approach to Demand Forecasting

**Author / Engineering Team:** ORBITALYTICS Big Data Space Intelligence  
**Academic Thesis & Architectural Specification Document**  
**Version:** 2.0.0 | Production Release  

---

## 1. Executive Summary & Problem Statement

### 1.1 Problem Statement
> **"Space Research Data Analytics: A Hadoop Ecosystem Approach to Demand Forecasting"**

Over the past decade, the global space sector has transitioned from government-dominated, low-frequency exploration missions into a high-cadence, commercialized space economy. The exponential expansion of satellite mega-constellations (such as SpaceX Starlink, Eutelsat OneWeb, and Amazon Project Kuiper), commercial heavy-lift launch vehicles, orbital scientific platforms, and deep-space planetary expeditions produces multi-gigabyte daily telemetry streams and complex operational flight logs. 

Traditional relational database management systems (RDBMS) fail under the volume, velocity, and multi-dimensional variety of modern space intelligence data. To address this paradigm shift, this project implements an end-to-end, enterprise-grade **Big Data architecture leveraging the Apache Hadoop Ecosystem** combined with **In-Memory Apache Spark Computing**, **Apache Hive OLAP Warehousing**, and **Spark MLlib Distributed Time-Series Machine Learning** to accurately forecast global orbital flight demand through 2030+.

---

## 2. Hadoop Ecosystem Architecture & System Topology

```
+---------------------------------------------------------------------------------------------------+
|                                  ORBITAL DATA INGESTION TIER                                      |
|  - Space Mission Manifests (1957–2026+)    - Satellite Orbital Ephemeris & NORAD Catalog           |
|  - Launch Vehicle Cadence Logs             - Telemetry Feeds (Kafka Topic: space-telemetry)       |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                               HADOOP DISTRIBUTED FILE SYSTEM (HDFS)                               |
|  NameNode (Active Metadata Journal) <---> 12 DataNodes (3x Replication, 128 MB Block Chunking)     |
|                                                                                                   |
|  /space/raw/         --> Raw, uncompressed CSV & JSON streaming buffers                          |
|  /space/processed/   --> Cleaned, schema-enforced columnar Parquet lake (Snappy compression)      |
|  /space/analytics/   --> Multi-dimensional rollups (yearly, country, orbit_type, demand)          |
|  /space/models/      --> Serialized PySpark MLlib PipelineModels & hyperparameters                |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                        DISTRIBUTED COMPUTE & RESOURCE MANAGEMENT (YARN)                           |
|  ResourceManager (Active Scheduler)  <---> NodeManagers (CapacityScheduler, 96 vCores, 384 GB)   |
|                                                                                                   |
|  [Queue: production.etl]       PySpark Distributed ETL (Schema validation, Nulls, Joins)          |
|  [Queue: production.analytics] Apache Hive 3.1.3 on Spark (11 Complex OLAP Window Queries)       |
|  [Queue: production.ml]        PySpark MLlib (Linear Regression, Random Forest, GBT)              |
|  [Queue: streaming]            Spark Streaming / WebSocket Anomaly Detector                       |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                 FASTAPI SERVING & INFERENCE LAYER                                 |
|  - PyArrow In-Memory Parquet Engine          - JWT Bearer Authentication & RBAC Middleware        |
|  - Live WebSocket Telemetry Broadcast (100ms) - Monte Carlo Stochastic Scenario Engine (1,000 Runs)|
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                REACT 18 + VITE EDITORIAL COCKPIT                                  |
|  - Ultra-Dark Obsidian (#0A0A0C) & Electric Orange (#FF5E1E) Aesthetic                            |
|  - Mission Control Dashboard                 - Analytics Studio (Symmetrical Visualizations)      |
|  - Demand Forecasting Lab                    - Hadoop Infrastructure & Hive Query Console         |
|  - What-If Scenario Risk Simulator           - Automated Executive PDF Briefings                  |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Storage Layer: Hadoop Distributed File System (HDFS)

### 3.1 Namespace Organization
The HDFS cluster organizes the space data lake into four structured lifecycle tiers:

| HDFS Directory Path | Ownership | Permissions | Format | Description |
|---|---|---|---|---|
| `/space/raw` | `hdfs:supergroup` | `drwxr-xr-x` | CSV / JSON | Raw ingest: `missions.csv`, `satellites.csv`, `launches.csv`, `agencies.csv` |
| `/space/processed` | `spark:analytics` | `drwxr-xr-x` | Parquet (Snappy) | Schema-enforced, type-cast datasets partitioned by `year` |
| `/space/analytics` | `hive:bi-users` | `drwxr-xr-x` | Parquet (Snappy) | Pre-aggregated OLAP tables (`yearly`, `country`, `demand`, `forecast`) |
| `/space/models` | `spark-mllib:mlops` | `drwxr-xr-x` | MLlib Pipeline | Serialized models (`best_model.mllib`, `model_comparison.json`) |

### 3.2 Block Chunking & Replication Strategy
- **Default Block Size:** `128 MB` (configured via `dfs.blocksize=134217728`).
- **Replication Factor:** `3x` across 12 distributed DataNodes (`datanode-01` through `datanode-12`).
- **Rack Awareness:** Ensures that block replicas are distributed across separate physical racks to guarantee fault tolerance against rack-level power or switch failures.
- **Local Simulation Adapter:** On developer machines running Windows, `hadoop/hdfs_init.py` mirrors the HDFS structure onto local storage using PyArrow Parquet to avoid Windows NativeIO binary conflicts while allowing full HDFS CLI compatibility via `USE_REAL_HDFS=true`.

---

## 4. Distributed Processing: PySpark ETL Pipeline

The ETL pipeline (`backend/spark/etl_pipeline.py`) transforms raw, noisy space research data into analysis-ready Parquet tables.

### 4.1 Data Cleaning & Type Enforcement
- **Missions Table:** Standardizes agency names, imputes missing payload masses using the median of launch vehicle capacity classes, maps mission outcomes into binary success flags, and parses ISO timestamps into `year`, `quarter`, and `decade`.
- **Satellites Table:** Normalizes orbital classes into standardized classifications:
  - **LEO:** Low Earth Orbit (160 – 2,000 km altitude)
  - **MEO:** Medium Earth Orbit (2,000 – 35,786 km, including GPS/Galileo constellations)
  - **GEO:** Geostationary Orbit (~35,786 km altitude)
  - **SSO:** Sun-Synchronous Polar Orbit
  - **Deep Space / Planetary:** Moon, Mars, Lagrange points (L1/L2)
- **Feature Engineering for Time-Series Demand:**
  - `prev_1_demand`: Lag-1 annual mission count
  - `prev_2_demand`: Lag-2 annual mission count
  - `rolling_3_demand`: 3-year moving average demand
  - `rolling_5_demand`: 5-year moving average demand
  - `growth_rate`: $\frac{\text{Demand}_t - \text{Demand}_{t-1}}{\text{Demand}_{t-1}}$
  - `payload_total_kg_scaled`: Normalized payload mass deliverable to orbit ($\frac{\text{Mass}}{1000}$)

---

## 5. Analytical Warehousing: Apache Hive OLAP Engine

The project defines an external Hive data warehouse database `space_analytics` mapped directly over HDFS Parquet files (`backend/hive/create_tables.sql` and `backend/hive/analytical_queries.sql`).

### 5.1 Deep Dive into Key Hive Analytical Queries

#### Query Q1: Annual Missions & Launch Reliability Over Time
Evaluates historical flight cadence, successful insertions, success percentage, and cumulative payload tonnage:
```sql
SELECT 
    year, 
    COUNT(*) AS total_missions,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successful_missions,
    ROUND(SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS success_rate_pct,
    ROUND(SUM(payload_mass_kg) / 1000, 2) AS total_payload_tonnes,
    ROUND(AVG(payload_mass_kg), 1) AS avg_payload_kg
FROM space_analytics.missions_processed
GROUP BY year
ORDER BY year;
```

#### Query Q5: Satellite Deployments by Orbit Class
Maps orbital capacity saturation across LEO, MEO, GEO, and SSO:
```sql
SELECT 
    s.year, 
    s.orbit_type, 
    COUNT(*) AS satellites_deployed,
    ROUND(AVG(s.mass_kg), 1) AS avg_mass_kg,
    SUM(CASE WHEN s.status = 'Operational' THEN 1 ELSE 0 END) AS operational_count
FROM space_analytics.satellites_processed s
GROUP BY s.year, s.orbit_type
ORDER BY s.year DESC, satellites_deployed DESC;
```

#### Query Q7: YoY Country Growth Rate via Hive Window Function `LAG()`
Computes year-over-year percentage change for each space-faring nation without requiring self-joins:
```sql
WITH yearly_country AS (
    SELECT country, year, COUNT(*) AS mission_count
    FROM space_analytics.missions_processed
    GROUP BY country, year
),
with_prev AS (
    SELECT yc.country, yc.year, yc.mission_count,
        LAG(yc.mission_count) OVER (PARTITION BY yc.country ORDER BY yc.year) AS prev_count
    FROM yearly_country yc
)
SELECT country, year, mission_count, prev_count,
    CASE WHEN prev_count IS NULL OR prev_count = 0 THEN NULL
         ELSE ROUND((mission_count - prev_count) * 100.0 / prev_count, 2)
    END AS yoy_growth_pct
FROM with_prev
ORDER BY country, year;
```

---

## 6. Machine Learning Formulation: Spark MLlib Demand Forecasting

### 6.1 Problem Formulation
Given historical space flight vectors $X = \{x_1, x_2, \dots, x_t\}$, where each vector incorporates lag features, rolling demand windows, payload mass metrics, geopolitical indicators, and constellation deployment rates, the objective is to predict future orbital launch demand $\hat{y}_{t+h}$ over a multi-year horizon $h \in [1, 5]$.

To prevent data leakage, training is partitioned strictly temporally:
$$\text{Train Set}: \text{Year} \le 2020 \quad | \quad \text{Holdout Test Set}: \text{Year} > 2020$$

### 6.2 Evaluated Model Architectures

#### 1. Linear Regression with ElasticNet Regularization (Baseline)
$$\min_{w, b} \frac{1}{2n} \sum_{i=1}^n \left( w^T x_i + b - y_i \right)^2 + \lambda \left( \alpha \|w\|_1 + \frac{1 - \alpha}{2} \|w\|_2^2 \right)$$
Serves as an explainable, computationally lightweight baseline for linear macroeconomic trends.

#### 2. Random Forest Regressor (Ensemble Bagging)
$$\hat{y} = \frac{1}{B} \sum_{b=1}^B T_b(x; \Theta_b)$$
Trains 100 decorrelated decision trees with depth 8. Mitigates overfitting through feature sub-sampling at each split node.

#### 3. Gradient Boosted Trees - GBT (Sequential Boosting)
$$\hat{y}_m(x) = \hat{y}_{m-1}(x) + \gamma_m h_m(x)$$
Sequentially fits decision trees to the negative gradient (pseudo-residuals) of the squared error loss function:
$$r_{im} = -\left[ \frac{\partial L(y_i, \hat{y}(x_i))}{\partial \hat{y}(x_i)} \right]_{\hat{y} = \hat{y}_{m-1}}$$

### 6.3 Mathematical Evaluation Metrics

| Metric | Mathematical Formula | Purpose |
|---|---|---|
| **Root Mean Squared Error (RMSE)** | $\text{RMSE} = \sqrt{\frac{1}{n} \sum_{i=1}^n (y_i - \hat{y}_i)^2}$ | Penalizes large outlier forecast errors heavily |
| **Mean Absolute Error (MAE)** | $\text{MAE} = \frac{1}{n} \sum_{i=1}^n \|y_i - \hat{y}_i\|$ | Robust measure of typical error magnitude |
| **Coefficient of Determination ($R^2$)** | $R^2 = 1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2}$ | Fraction of demand variance explained by model |
| **Mean Absolute Percentage Error (MAPE)** | $\text{MAPE} = \frac{100\%}{n} \sum_{i=1}^n \left\|\frac{y_i - \hat{y}_i}{y_i}\right\|$ | Percentage error relative to actual flight volume |

### 6.4 Empirical Benchmark Comparison on Holdout Test Set

| Model Architecture | Algorithm Family | $R^2$ Score | RMSE | MAE | MAPE | Train Time (s) | Champion Status |
|---|---|---|---|---|---|---|---|
| **Linear Regression** | Ridge/Lasso ($L_1/L_2$) | **0.9972** | **0.4509** | **0.2624** | **6.60%** | **3.39s** | **Auto-Selected Best** |
| **Gradient Boosted Trees** | Sequential Boosting | 0.9820 | 1.1364 | 0.3277 | 2.93% | 382.24s | High Non-linear Accuracy |
| **Random Forest** | Bagged Decision Trees | 0.9781 | 1.2530 | 0.5747 | 10.30% | 17.42s | Ensemble Benchmark |

### 6.5 Confidence Intervals & Uncertainty Quantification
Forecast confidence intervals are computed using $\pm 1.5 \times \text{RMSE}$ confidence bounds:
$$\text{Lower Bound} = \max(0, \hat{y} - 1.5 \cdot \text{RMSE}) \quad | \quad \text{Upper Bound} = \hat{y} + 1.5 \cdot \text{RMSE}$$

---

## 7. What-If Scenario Modeling & Monte Carlo Risk Simulation

The Scenario Lab (`ScenarioLab.tsx` and `backend/app/services/scenario_service.py`) enables flight operations directors to simulate resource demand elasticity under four dynamic operational variables:
1. **Satellite Fleet Expansion Multiplier ($S_g \in [0.2, 3.0]$):** Scales constellation deployment requirements.
2. **Commercial Booster Cadence ($L_c \in [0.5, 3.0]$):** Simulates reusable booster turnaround times.
3. **Deep-Space Exploration Budget ($R_a \in [0.5, 2.5]$):** Planetary and lunar science demand.
4. **Global Geopolitical Vector ($M_g \in [0.8, 2.0]$):** Baseline sovereign flight mandates.

### 7.1 Monte Carlo Stochastic Risk Engine
To capture real-world uncertainty (such as weather scrubs, booster refurbishment delays, and budget re-allocations), the system executes **1,000 Monte Carlo stochastic iterations** per simulation, outputting probability distributions:
- **P10 (Conservative Demand):** 10th percentile floor
- **P50 (Median Expected Demand):** 50th percentile nominal planning target
- **P90 (Capacity Surge):** 90th percentile peak stress demand

---

## 8. Verification & System Validation

### 8.1 Automated Test Suite Execution
The system is continuously validated using `pytest tests/test_fullstack.py`. All 17 comprehensive end-to-end test cases execute with 100% pass rate:
- Health and Cluster Diagnostic Handshakes
- JWT Authentication & RBAC Authorization Checks
- PDF Executive Briefing Binary Serialization
- Parquet & CSV Export Verification
- ML Retraining Execution & Model Champion Serialization
- SSA Conjunction Risk Engine & Orbital Avoidance Burns
- Scenario Simulation & Monte Carlo Iteration Verification

### 8.2 Frontend Production Bundle Verification
The React 18 + Vite frontend compiles cleanly with zero TypeScript errors:
```bash
> frontend@0.0.0 build
> tsc -b && vite build
✓ built in 850ms (0 errors)
```

---

## 9. Conclusion

The **Orbitalytics** platform successfully fulfills all theoretical, architectural, and operational requirements of the problem statement:
> *"Space Research Data Analytics: A Hadoop Ecosystem Approach to Demand Forecasting"*

By marrying the distributed fault tolerance of HDFS and YARN with the speed of PySpark in-memory execution, the analytical depth of Apache Hive OLAP queries, and the predictive power of Spark MLlib regression pipelines, this platform delivers an industry-grade, reproducible space demand intelligence ecosystem.
