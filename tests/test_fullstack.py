"""ORBITALYTICS — Full-Stack End-to-End Test Suite
Tests JWT authentication, RBAC authorization, PDF & Parquet exports, ML pipelines, and data explorer.
"""
import sys
from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport

# Ensure backend package is in python path
BACKEND_DIR = Path(__file__).parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "version" in data


@pytest.mark.asyncio
async def test_demo_accounts_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/auth/demo-accounts")
        assert res.status_code == 200
        accounts = res.json()
        assert len(accounts) == 3
        roles = [a["role"] for a in accounts]
        assert "ADMIN" in roles
        assert "ANALYST" in roles
        assert "VIEWER" in roles


@pytest.mark.asyncio
async def test_auth_login_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Login as Admin
        res = await client.post("/api/auth/login", json={
            "email": "admin@orbitalytics.io",
            "password": "admin2026",
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["role"] == "ADMIN"
        assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_auth_login_invalid():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.post("/api/auth/login", json={
            "email": "admin@orbitalytics.io",
            "password": "wrongpassword",
        })
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_auth_me_profile():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Login
        login_res = await client.post("/api/auth/login", json={
            "email": "analyst@orbitalytics.io",
            "password": "analyst2026",
        })
        token = login_res.json()["access_token"]

        # 2. Get profile with Bearer token
        headers = {"Authorization": f"Bearer {token}"}
        me_res = await client.get("/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        user = me_res.json()
        assert user["email"] == "analyst@orbitalytics.io"
        assert user["role"] == "ANALYST"
        assert len(user["permissions"]) > 0


@pytest.mark.asyncio
async def test_executive_report_json():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/reports/executive")
        assert res.status_code == 200
        data = res.json()
        assert "report_id" in data
        assert "kpis" in data
        assert "top_demand_drivers" in data


@pytest.mark.asyncio
async def test_pdf_report_export():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/reports/export-pdf")
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/pdf"
        assert "attachment; filename=" in res.headers["content-disposition"]
        # PDF magic bytes: %PDF-
        assert res.content.startswith(b"%PDF-")


@pytest.mark.asyncio
async def test_data_explorer_csv_export():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/data-explorer/export?dataset=missions&export_format=csv&limit=10")
        assert res.status_code == 200
        assert "text/csv" in res.headers["content-type"]
        assert "mission_id" in res.text


@pytest.mark.asyncio
async def test_data_explorer_parquet_export():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/data-explorer/export?dataset=missions&export_format=parquet&limit=10")
        assert res.status_code == 200
        assert "application/octet-stream" in res.headers["content-type"]
        # Parquet magic bytes: PAR1
        assert res.content.startswith(b"PAR1")


@pytest.mark.asyncio
async def test_ml_retrain_authorized_vs_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Unauthenticated request should be rejected (401)
        res_no_auth = await client.post("/api/ml/retrain", json={"model_type": "gbt", "num_trees": 15})
        assert res_no_auth.status_code == 401

        # 2. Viewer role request should be forbidden (403)
        viewer_login = await client.post("/api/auth/login", json={
            "email": "viewer@orbitalytics.io",
            "password": "viewer2026",
        })
        viewer_token = viewer_login.json()["access_token"]
        res_viewer = await client.post(
            "/api/ml/retrain",
            json={"model_type": "gbt", "num_trees": 15},
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert res_viewer.status_code == 403

        # 3. Admin request should succeed (200)
        admin_login = await client.post("/api/auth/login", json={
            "email": "admin@orbitalytics.io",
            "password": "admin2026",
        })
        admin_token = admin_login.json()["access_token"]
        res_admin = await client.post(
            "/api/ml/retrain",
            json={"model_type": "gbt", "num_trees": 20},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_admin.status_code == 200
        retrain_data = res_admin.json()
        assert retrain_data["status"] == "SUCCESS"
        assert retrain_data["r2_score"] > 0.8


@pytest.mark.asyncio
async def test_ml_anomalies_scanner():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/ml/anomalies")
        assert res.status_code == 200
        data = res.json()
        assert "anomalies" in data
        assert len(data["anomalies"]) > 0


@pytest.mark.asyncio
async def test_conjunctions_risk_engine():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/conjunctions")
        assert res.status_code == 200
        data = res.json()
        assert "screened_catalog_objects" in data
        assert "events" in data
        assert len(data["events"]) > 0
        first_event = data["events"][0]
        assert "primary_object" in first_event
        assert "secondary_object" in first_event
        assert "collision_probability" in first_event
        assert "miss_distance_m" in first_event


@pytest.mark.asyncio
async def test_conjunctions_avoidance_burn():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Unauthenticated should be rejected (401)
        res_unauth = await client.post(
            "/api/conjunctions/avoidance-burn",
            json={"event_id": "CONJ-2026-0891", "burn_type": "IMPULSIVE_RETROGRADE", "safety_margin_km": 15.0},
        )
        assert res_unauth.status_code == 401

        # 2. Authenticated Analyst executing burn succeeds (200)
        login = await client.post("/api/auth/login", json={
            "email": "analyst@orbitalytics.io",
            "password": "analyst2026",
        })
        token = login.json()["access_token"]
        res = await client.post(
            "/api/conjunctions/avoidance-burn",
            json={"event_id": "CONJ-2026-0884", "burn_type": "IMPULSIVE_RETROGRADE", "safety_margin_km": 15.0},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SUCCESS"
        assert data["new_miss_distance_km"] >= 10.0
        assert data["delta_v_applied_ms"] > 0


@pytest.mark.asyncio
async def test_orbital_constellation_and_ground_stations():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        sat_res = await client.get("/api/orbit/satellites")
        assert sat_res.status_code == 200
        sat_data = sat_res.json()
        assert "satellites" in sat_data
        assert len(sat_data["satellites"]) >= 6

        station_res = await client.get("/api/orbit/ground-stations")
        assert station_res.status_code == 200
        st_data = station_res.json()
        assert "stations" in st_data
        assert len(st_data["stations"]) >= 6


@pytest.mark.asyncio
async def test_telemetry_fault_injection_and_clear():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Inject thermal fault
        res_inject = await client.post(
            "/api/telemetry/inject-fault",
            json={
                "subsystem": "THERMAL",
                "severity": "CRITICAL",
                "message": "Thermal radiator bypass valve seized open",
            },
        )
        assert res_inject.status_code == 200
        inject_data = res_inject.json()
        assert inject_data["status"] == "FAULT_INJECTED"
        assert inject_data["subsystem"] == "THERMAL"

        # Clear fault
        res_clear = await client.post("/api/telemetry/clear-fault")
        assert res_clear.status_code == 200
        clear_data = res_clear.json()
        assert clear_data["status"] == "FAULTS_CLEARED"


@pytest.mark.asyncio
async def test_analytics_studio_aggregation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/analytics/studio?orbit=LEO")
        assert res.status_code == 200
        data = res.json()
        assert "metrics" in data
        assert data["metrics"]["total_missions"] > 1000
        assert data["metrics"]["success_rate"] > 0.5
        assert "yearly_trends" in data
        assert len(data["yearly_trends"]) > 0
        assert "vehicle_leaderboard" in data
        assert len(data["vehicle_leaderboard"]) > 0


@pytest.mark.asyncio
async def test_scenarios_simulation_engine():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.post(
            "/api/scenarios",
            json={
                "satellite_growth": 1.4,
                "launch_capacity": 1.2,
                "research_activity": 1.0,
                "mission_growth": 1.1,
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert "scenarios" in data
        assert len(data["scenarios"]) > 0
        assert "monte_carlo" in data
        assert data["monte_carlo"]["iterations"] == 1000
        assert "p50_median" in data["monte_carlo"]


@pytest.mark.asyncio
async def test_hadoop_hdfs_tree():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/hadoop/hdfs/tree")
        assert res.status_code == 200
        data = res.json()
        assert data["root"] == "/space"
        assert len(data["directories"]) >= 4
        dir_paths = [d["path"] for d in data["directories"]]
        assert "/space/raw" in dir_paths
        assert "/space/processed" in dir_paths
        assert "/space/analytics" in dir_paths
        assert "/space/models" in dir_paths


@pytest.mark.asyncio
async def test_hadoop_hive_queries_and_execution():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Fetch queries catalog
        res_queries = await client.get("/api/hadoop/hive/queries")
        assert res_queries.status_code == 200
        q_data = res_queries.json()
        assert q_data["total"] == 11
        assert len(q_data["queries"]) == 11

        # 2. Execute query Q1
        res_exec = await client.post("/api/hadoop/hive/execute", json={"query_id": "Q1"})
        assert res_exec.status_code == 200
        exec_data = res_exec.json()
        assert "records" in exec_data
        assert "execution_plan" in exec_data
        assert len(exec_data["execution_plan"]["stages"]) == 3


@pytest.mark.asyncio
async def test_forecast_with_model_selection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/forecast?model_name=Linear+Regression&horizon_years=3")
        assert res.status_code == 200
        data = res.json()
        assert data["model_used"] == "Linear Regression"
        assert "model_metrics" in data
        assert len(data["data"]) > 0


@pytest.mark.asyncio
async def test_pipeline_stages_and_kafka_metrics():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/pipeline/stages")
        assert res.status_code == 200
        data = res.json()
        assert data["total_stages"] == 9
        assert len(data["stages"]) == 9
        assert data["pipeline_status"] == "OPTIMAL"

        res_k = await client.get("/api/kafka/metrics")
        assert res_k.status_code == 200
        k_data = res_k.json()
        assert k_data["stream_status"] == "ONLINE"
        assert len(k_data["topics"]) == 3
        assert k_data["messages_per_second"] > 0


@pytest.mark.asyncio
async def test_data_quality_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/data-quality?dataset=missions")
        assert res.status_code == 200
        data = res.json()
        assert data["total_records"] > 0
        assert data["completeness_percentage"] > 90.0
        assert len(data["cleansing_funnel"]) == 6


@pytest.mark.asyncio
async def test_forecast_alerts_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/alerts/forecast")
        assert res.status_code == 200
        data = res.json()
        assert data["active_alerts_count"] >= 2
        assert len(data["alerts"]) >= 2


@pytest.mark.asyncio
async def test_ml_feature_importance_and_benchmark():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res_fi = await client.get("/api/ml/feature-importance")
        assert res_fi.status_code == 200
        fi_data = res_fi.json()
        assert len(fi_data["feature_importance"]) == 6
        assert sum(f["importance_pct"] for f in fi_data["feature_importance"]) > 95.0

        res_bm = await client.get("/api/ml/benchmark?metric=r2")
        assert res_bm.status_code == 200
        bm_data = res_bm.json()
        assert len(bm_data["benchmarks"]) == 3
        assert "recommended_model" in bm_data


@pytest.mark.asyncio
async def test_space_agency_analytics():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/analytics/agencies")
        assert res.status_code == 200
        data = res.json()
        assert data["total_agencies_compared"] == 6
        agency_keys = [a["agency_key"] for a in data["agencies"]]
        assert "NASA" in agency_keys
        assert "ESA" in agency_keys
        assert "ISRO" in agency_keys
        assert "CNSA" in agency_keys
        assert "JAXA" in agency_keys
        assert "Roscosmos" in agency_keys


@pytest.mark.asyncio
async def test_enhanced_scenarios_resource_comparison():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.post("/api/scenarios", json={
            "satellite_growth": 1.25,
            "launch_capacity": 1.15,
            "research_activity": 1.10,
            "mission_growth": 1.20,
            "launch_frequency": 1.15,
            "ground_station_capacity": 1.10,
            "data_volume": 1.30,
            "bandwidth_capacity": 1.25,
            "horizon_years": 3,
        })
        assert res.status_code == 200
        data = res.json()
        assert "resource_comparison" in data
        assert "baseline" in data["resource_comparison"]
        assert "simulated" in data["resource_comparison"]
        assert "deltas_pct" in data["resource_comparison"]




