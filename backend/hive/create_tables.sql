-- ============================================================
-- ORBITALYTICS — Hive Schema (space_analytics database)
-- ============================================================
-- Execute via: spark-sql -f create_tables.sql
--           or: hive -f create_tables.sql
--           or: SparkSession.sql() calls in hive_session.py
-- ============================================================

CREATE DATABASE IF NOT EXISTS space_analytics
COMMENT 'ORBITALYTICS space research analytical database'
WITH DBPROPERTIES ('created_by'='ORBITALYTICS', 'version'='1.0');

USE space_analytics;

-- ============================================================
-- EXTERNAL TABLES (backed by CSV raw data)
-- ============================================================

-- Missions (raw)
CREATE EXTERNAL TABLE IF NOT EXISTS missions_raw (
    mission_id        STRING    COMMENT 'Unique mission identifier',
    mission_name      STRING    COMMENT 'Human-readable mission name',
    launch_date       STRING    COMMENT 'Launch date (YYYY-MM-DD)',
    year              INT       COMMENT 'Launch year (partition key)',
    quarter           INT       COMMENT 'Launch quarter (1-4)',
    month             INT       COMMENT 'Launch month (1-12)',
    country           STRING    COMMENT 'Originating country or agency group',
    agency            STRING    COMMENT 'Space agency or operator',
    mission_type      STRING    COMMENT 'Mission category',
    launch_vehicle    STRING    COMMENT 'Launch vehicle used',
    orbit             STRING    COMMENT 'Target orbit type',
    payload_mass_kg   DOUBLE    COMMENT 'Payload mass in kilograms',
    success           BOOLEAN   COMMENT 'Mission success flag',
    cost_million_usd  DOUBLE    COMMENT 'Estimated cost in million USD'
)
COMMENT 'Raw mission data loaded from CSV'
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION '/space/raw/missions'
TBLPROPERTIES ('skip.header.line.count'='1');

-- Launches (raw)
CREATE EXTERNAL TABLE IF NOT EXISTS launches_raw (
    launch_id         STRING,
    mission_id        STRING,
    launch_date       STRING,
    year              INT,
    quarter           INT,
    launch_site       STRING,
    country           STRING,
    vehicle           STRING,
    payload_mass_kg   DOUBLE,
    mission_type      STRING,
    success           BOOLEAN,
    cost_million_usd  DOUBLE,
    orbit             STRING
)
COMMENT 'Raw launch event data'
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION '/space/raw/launches'
TBLPROPERTIES ('skip.header.line.count'='1');

-- Satellites (raw)
CREATE EXTERNAL TABLE IF NOT EXISTS satellites_raw (
    satellite_id    STRING,
    mission_id      STRING,
    satellite_name  STRING,
    country         STRING,
    operator        STRING,
    purpose         STRING,
    launch_date     STRING,
    year            INT,
    quarter         INT,
    orbit_type      STRING,
    mass_kg         DOUBLE,
    status          STRING
)
COMMENT 'Raw satellite deployment data'
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION '/space/raw/satellites'
TBLPROPERTIES ('skip.header.line.count'='1');

-- Agencies (raw - reference)
CREATE EXTERNAL TABLE IF NOT EXISTS agencies_raw (
    agency_id      STRING,
    agency_name    STRING,
    country        STRING,
    agency_type    STRING,
    founded_year   INT,
    active         BOOLEAN
)
COMMENT 'Space agency reference data'
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION '/space/raw/agencies'
TBLPROPERTIES ('skip.header.line.count'='1');

-- ============================================================
-- MANAGED PARQUET TABLES (processed/analytical)
-- ============================================================

-- Processed missions (Parquet, partitioned by year)
-- WHY PARTITIONING: Analytical queries filtering by year only scan
-- the relevant partition (e.g., year=2020) instead of all data.
-- On a 100K record dataset this reduces scan size by ~50-60x for 
-- single-year queries.
CREATE TABLE IF NOT EXISTS missions_processed (
    mission_id        STRING,
    mission_name      STRING,
    launch_date       DATE,
    quarter           INT,
    month             INT,
    country           STRING,
    agency            STRING,
    mission_type      STRING,
    launch_vehicle    STRING,
    orbit             STRING,
    payload_mass_kg   DOUBLE,
    success           BOOLEAN,
    cost_million_usd  DOUBLE
)
COMMENT 'Cleaned and processed mission data'
PARTITIONED BY (year INT)
STORED AS PARQUET
LOCATION '/space/processed/missions';

-- Processed satellites (Parquet, partitioned by year)
CREATE TABLE IF NOT EXISTS satellites_processed (
    satellite_id    STRING,
    mission_id      STRING,
    satellite_name  STRING,
    country         STRING,
    operator        STRING,
    purpose         STRING,
    launch_date     DATE,
    quarter         INT,
    orbit_type      STRING,
    mass_kg         DOUBLE,
    status          STRING
)
COMMENT 'Processed satellite deployment data'
PARTITIONED BY (year INT)
STORED AS PARQUET
LOCATION '/space/processed/satellites';

-- Space demand analytical table (core forecasting input)
-- WHY PARTITIONING BY year, country: Forecast queries typically
-- filter by country + recent years, making partition pruning very
-- effective for reducing I/O in the ML training pipeline.
CREATE TABLE IF NOT EXISTS space_demand (
    quarter               INT,
    mission_type          STRING,
    mission_count         INT,
    satellite_count       INT,
    launch_count          INT,
    payload_total_kg      DOUBLE,
    success_rate          DOUBLE,
    avg_payload_kg        DOUBLE,
    prev_period_demand    DOUBLE,
    rolling_3_demand      DOUBLE,
    rolling_5_demand      DOUBLE,
    growth_rate           DOUBLE,
    mission_type_idx      DOUBLE,
    country_idx           DOUBLE,
    demand_label          STRING
)
COMMENT 'Analytical demand table for ML forecasting'
PARTITIONED BY (year INT, country STRING)
STORED AS PARQUET
LOCATION '/space/analytics/demand';

-- Yearly aggregated analytics
CREATE TABLE IF NOT EXISTS analytics_yearly (
    year              INT,
    total_missions    BIGINT,
    total_launches    BIGINT,
    total_satellites  BIGINT,
    success_rate      DOUBLE,
    total_payload_kg  DOUBLE,
    avg_payload_kg    DOUBLE,
    total_cost_musd   DOUBLE,
    unique_countries  BIGINT,
    yoy_growth_pct    DOUBLE
)
COMMENT 'Yearly aggregated mission statistics'
STORED AS PARQUET
LOCATION '/space/analytics/yearly';

-- Country-level analytics
CREATE TABLE IF NOT EXISTS analytics_country (
    country           STRING,
    year              INT,
    mission_count     BIGINT,
    satellite_count   BIGINT,
    launch_count      BIGINT,
    success_rate      DOUBLE,
    total_payload_kg  DOUBLE,
    total_cost_musd   DOUBLE,
    market_share_pct  DOUBLE
)
COMMENT 'Country-level analytical aggregations'
PARTITIONED BY (decade INT)
STORED AS PARQUET
LOCATION '/space/analytics/country';

-- Mission-type analytics
CREATE TABLE IF NOT EXISTS analytics_mission_type (
    mission_type      STRING,
    year              INT,
    mission_count     BIGINT,
    success_rate      DOUBLE,
    avg_payload_kg    DOUBLE,
    total_cost_musd   DOUBLE,
    growth_rate       DOUBLE
)
COMMENT 'Mission-type level analytical aggregations'
STORED AS PARQUET
LOCATION '/space/analytics/mission_type';

-- Forecast results
CREATE TABLE IF NOT EXISTS forecast_results (
    forecast_id       STRING,
    country           STRING,
    mission_type      STRING,
    year              INT,
    quarter           INT,
    forecast_value    DOUBLE,
    lower_bound       DOUBLE,
    upper_bound       DOUBLE,
    growth_pct        DOUBLE,
    model_used        STRING,
    model_rmse        DOUBLE,
    model_r2          DOUBLE,
    is_forecast       BOOLEAN,
    created_at        STRING
)
COMMENT 'ML model forecast results'
STORED AS PARQUET
LOCATION '/space/analytics/forecast';
