-- ============================================================
-- ORBITALYTICS — Hive Analytical Queries
-- ============================================================
-- These queries run against the space_analytics Hive database.
-- They are also executed programmatically via Spark SQL.
-- ============================================================

USE space_analytics;

-- ============================================================
-- Q1: Total missions per year
-- ============================================================
-- PERFORMANCE: With year partitioning, this scans only the
-- partition metadata rather than full table data.
SELECT
    year,
    COUNT(*) AS total_missions,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successful_missions,
    ROUND(SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS success_rate_pct,
    ROUND(SUM(payload_mass_kg) / 1000, 2) AS total_payload_tonnes,
    ROUND(AVG(payload_mass_kg), 1) AS avg_payload_kg
FROM missions_processed
GROUP BY year
ORDER BY year;

-- ============================================================
-- Q2: Missions by country (all time)
-- ============================================================
SELECT
    country,
    COUNT(*) AS total_missions,
    COUNT(DISTINCT agency) AS agencies_count,
    ROUND(AVG(payload_mass_kg), 1) AS avg_payload_kg,
    ROUND(SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS success_rate_pct,
    MIN(year) AS first_mission_year,
    MAX(year) AS latest_mission_year
FROM missions_processed
GROUP BY country
ORDER BY total_missions DESC;

-- ============================================================
-- Q3: Missions by mission type
-- ============================================================
SELECT
    mission_type,
    COUNT(*) AS total_missions,
    ROUND(AVG(payload_mass_kg), 1) AS avg_payload_kg,
    ROUND(SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS success_rate_pct,
    ROUND(SUM(cost_million_usd), 2) AS total_cost_musd,
    COUNT(DISTINCT country) AS countries_involved
FROM missions_processed
GROUP BY mission_type
ORDER BY total_missions DESC;

-- ============================================================
-- Q4: Launch success rate by year and vehicle
-- ============================================================
SELECT
    year,
    launch_vehicle,
    COUNT(*) AS total_launches,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successful,
    ROUND(SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS success_rate_pct
FROM missions_processed
GROUP BY year, launch_vehicle
HAVING COUNT(*) >= 3
ORDER BY year DESC, success_rate_pct DESC;

-- ============================================================
-- Q5: Satellite deployment trends by year and orbit type
-- ============================================================
SELECT
    s.year,
    s.orbit_type,
    COUNT(*) AS satellites_deployed,
    ROUND(AVG(s.mass_kg), 1) AS avg_mass_kg,
    SUM(CASE WHEN s.status = 'Operational' THEN 1 ELSE 0 END) AS operational_count
FROM satellites_processed s
GROUP BY s.year, s.orbit_type
ORDER BY s.year DESC, satellites_deployed DESC;

-- ============================================================
-- Q6: Payload trends — total payload mass by year
-- ============================================================
SELECT
    year,
    ROUND(SUM(payload_mass_kg) / 1000, 2) AS total_payload_tonnes,
    ROUND(AVG(payload_mass_kg), 1) AS avg_payload_kg,
    MAX(payload_mass_kg) AS max_payload_kg,
    MIN(payload_mass_kg) AS min_payload_kg,
    COUNT(*) AS missions_count
FROM missions_processed
GROUP BY year
ORDER BY year;

-- ============================================================
-- Q7: Country growth rate — YoY mission count growth
-- ============================================================
WITH yearly_country AS (
    SELECT
        country,
        year,
        COUNT(*) AS mission_count
    FROM missions_processed
    GROUP BY country, year
),
with_prev AS (
    SELECT
        yc.country,
        yc.year,
        yc.mission_count,
        LAG(yc.mission_count) OVER (PARTITION BY yc.country ORDER BY yc.year) AS prev_count
    FROM yearly_country yc
)
SELECT
    country,
    year,
    mission_count,
    prev_count,
    CASE
        WHEN prev_count IS NULL OR prev_count = 0 THEN NULL
        ELSE ROUND((mission_count - prev_count) * 100.0 / prev_count, 2)
    END AS yoy_growth_pct
FROM with_prev
ORDER BY country, year;

-- ============================================================
-- Q8: Mission-type growth rate (decade comparison)
-- ============================================================
SELECT
    mission_type,
    SUM(CASE WHEN year BETWEEN 1990 AND 1999 THEN 1 ELSE 0 END) AS missions_1990s,
    SUM(CASE WHEN year BETWEEN 2000 AND 2009 THEN 1 ELSE 0 END) AS missions_2000s,
    SUM(CASE WHEN year BETWEEN 2010 AND 2019 THEN 1 ELSE 0 END) AS missions_2010s,
    SUM(CASE WHEN year >= 2020 THEN 1 ELSE 0 END) AS missions_2020s,
    ROUND(
        (SUM(CASE WHEN year >= 2020 THEN 1.0 ELSE 0 END) /
         NULLIF(SUM(CASE WHEN year BETWEEN 2010 AND 2019 THEN 1.0 ELSE 0 END), 0) - 1) * 100,
        2
    ) AS growth_2010s_to_2020s_pct
FROM missions_processed
GROUP BY mission_type
ORDER BY missions_2020s DESC;

-- ============================================================
-- Q9: Yearly demand (missions + launches + satellites combined)
-- ============================================================
SELECT
    m.year,
    COUNT(DISTINCT m.mission_id) AS mission_count,
    COUNT(DISTINCT s.satellite_id) AS satellite_count,
    ROUND(SUM(m.payload_mass_kg) / 1000, 2) AS total_payload_tonnes,
    ROUND(AVG(CASE WHEN m.success THEN 1.0 ELSE 0.0 END) * 100, 2) AS success_rate_pct
FROM missions_processed m
LEFT JOIN satellites_processed s ON m.mission_id = s.mission_id AND m.year = s.year
GROUP BY m.year
ORDER BY m.year;

-- ============================================================
-- Q10: Quarterly demand breakdown
-- ============================================================
SELECT
    year,
    quarter,
    COUNT(*) AS mission_count,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successful,
    ROUND(SUM(payload_mass_kg) / 1000, 2) AS total_payload_tonnes,
    COUNT(DISTINCT country) AS active_countries
FROM missions_processed
GROUP BY year, quarter
ORDER BY year DESC, quarter;

-- ============================================================
-- Q11: Top agencies by decade (bonus analytical query)
-- ============================================================
SELECT
    agency,
    country,
    FLOOR(year / 10) * 10 AS decade,
    COUNT(*) AS missions,
    ROUND(AVG(payload_mass_kg), 1) AS avg_payload_kg,
    ROUND(SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS success_rate_pct
FROM missions_processed
GROUP BY agency, country, FLOOR(year / 10) * 10
ORDER BY decade DESC, missions DESC;
