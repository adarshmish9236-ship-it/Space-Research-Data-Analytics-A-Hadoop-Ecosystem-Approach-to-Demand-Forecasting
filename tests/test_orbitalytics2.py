"""
ORBITALYTICS 2.0 — Advanced Decision Intelligence Test Suite
Tests Prescriptive Analytics, Capacity Planning, Resource Optimization,
Unified Risk Scoring, Stress Testing, Root-Cause, Drift, Governance, Lineage,
AI Analyst Tool-Calling, and Digital Twin State.
"""

import sys
from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport

BACKEND_DIR = Path(__file__).parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.asyncio
async def test_capacity_planning_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/capacity/plan?horizon_years=3")
        assert res.status_code == 200
        data = res.json()
        assert "overall_pressure_index" in data
        assert "resources" in data
        assert len(data["resources"]) == 5
        
        # Verify storage & ground stations have real calculations
        storage = next(r for r in data["resources"] if r["id"] == "res_storage")
        assert storage["current_capacity"] >= 100.0
        assert storage["current_utilization"] > 0
        assert "time_to_capacity_months" in storage

        res_list = await client.get("/api/capacity/resources")
        assert res_list.status_code == 200
        assert len(res_list.json()["resources"]) == 5


@pytest.mark.asyncio
async def test_prescriptive_analytics_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/prescriptions?horizon_years=3")
        assert res.status_code == 200
        data = res.json()
        assert data["total_prescriptions"] > 0
        assert "prescriptions" in data
        top_rx = data["prescriptions"][0]
        assert "observed_condition" in top_rx
        assert "prescribed_action" in top_rx
        assert "risk_reduction_pct" in top_rx
        assert top_rx["confidence_score"] > 0.8


@pytest.mark.asyncio
async def test_resource_optimization_solver():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Default allocation query
        res_get = await client.get("/api/optimization/allocations")
        assert res_get.status_code == 200
        get_data = res_get.json()
        assert get_data["convergence_status"] == "OPTIMAL_CONVERGED"
        assert len(get_data["allocations"]) == 5

        # Custom solver solve request
        res_post = await client.post("/api/optimization/solve", json={
            "cost_weight": 0.20,
            "shortage_weight": 0.40,
            "risk_weight": 0.25,
            "overutil_weight": 0.15,
            "target_demand_multiplier": 1.25,
        })
        assert res_post.status_code == 200
        post_data = res_post.json()
        assert post_data["objective_score"] > 50.0
        assert "aggregate_impact" in post_data
        assert post_data["aggregate_impact"]["overall_risk_reduction_pct"] > 0


@pytest.mark.asyncio
async def test_unified_forecast_risk_score():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/risk/score")
        assert res.status_code == 200
        data = res.json()
        assert 0.0 <= data["risk_score"] <= 100.0
        assert data["risk_tier"] in ("LOW", "MODERATE", "ELEVATED", "CRITICAL")
        assert len(data["contributing_factors"]) == 7
        assert "mitigation_prescriptions" in data

        res_factors = await client.get("/api/risk/factors")
        assert res_factors.status_code == 200
        assert "contributing_factors" in res_factors.json()


@pytest.mark.asyncio
async def test_space_resource_stress_testing():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/stress-testing/scenarios")
        assert res.status_code == 200
        data = res.json()
        assert data["total_scenarios"] == 8
        assert "scenarios" in data
        sc_names = [s["name"] for s in data["scenarios"]]
        assert "Baseline Trajectory" in sc_names
        assert "Compound Mega-Stress Crisis" in sc_names
        assert all("stress_risk_score" in s for s in data["scenarios"])


@pytest.mark.asyncio
async def test_ai_root_cause_analysis():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.post("/api/root-cause/analyze", json={
            "event_type": "CAPACITY_BOTTLENECK",
            "target_resource": "ground_stations",
            "observed_value": 94.5,
        })
        assert res.status_code == 200
        data = res.json()
        assert "primary_driver" in data
        assert len(data["potential_drivers"]) > 0
        assert data["statistical_confidence"] > 0.8
        assert "prescribed_mitigation" in data


@pytest.mark.asyncio
async def test_data_and_concept_drift_status():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/drift/status")
        assert res.status_code == 200
        data = res.json()
        assert "overall_psi" in data
        assert data["features_monitored_count"] == 5
        assert len(data["features"]) == 5


@pytest.mark.asyncio
async def test_model_governance_and_lineage():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Models Trust Center
        res_gov = await client.get("/api/governance/models")
        assert res_gov.status_code == 200
        gov_data = res_gov.json()
        assert "active_champion_model" in gov_data
        assert len(gov_data["models"]) == 3
        assert len(gov_data["horizon_backtests"]) == 3

        # 2. Lineage DAG
        res_dag = await client.get("/api/governance/lineage")
        assert res_dag.status_code == 200
        dag_data = res_dag.json()
        assert dag_data["total_nodes"] == 10
        assert dag_data["total_edges"] == 9

        # 3. Experiments History
        res_exp = await client.get("/api/governance/experiments")
        assert res_exp.status_code == 200
        assert res_exp.json()["total_experiments"] == 3

        # 4. Reproducibility Manifest
        res_rep = await client.get("/api/governance/reproducibility")
        assert res_rep.status_code == 200
        assert "random_seed" in res_rep.json()


@pytest.mark.asyncio
async def test_autonomous_ai_analyst():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Tools list
        res_tools = await client.get("/api/ai/tools")
        assert res_tools.status_code == 200
        assert len(res_tools.json()["tools"]) >= 8

        # Query 1: Capacity Planning
        q1 = await client.post("/api/ai/query", json={"query": "Which resource has the highest forecast pressure and gap?"})
        assert q1.status_code == 200
        d1 = q1.json()
        assert d1["detected_intent"] == "CAPACITY_PLANNING"
        assert d1["tool_executed"] == "capacity_tool"
        assert "explanation" in d1

        # Query 2: Prescriptive Analytics
        q2 = await client.post("/api/ai/query", json={"query": "What should we do to mitigate ground station bottlenecks?"})
        assert q2.status_code == 200
        d2 = q2.json()
        assert d2["detected_intent"] == "PRESCRIPTIVE_ANALYTICS"
        assert d2["tool_executed"] == "prescriptions_tool"

        # Query 3: Risk Score
        q3 = await client.post("/api/ai/query", json={"query": "Why is the forecast risk score high?"})
        assert q3.status_code == 200
        d3 = q3.json()
        assert d3["detected_intent"] in ("RISK_INTELLIGENCE", "ROOT_CAUSE_ANALYSIS")


@pytest.mark.asyncio
async def test_digital_twin_state():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res_state = await client.get("/api/digital-twin/state")
        assert res_state.status_code == 200
        state = res_state.json()
        assert state["ground_stations_count"] == 6
        assert state["infrastructure_nodes_count"] == 4

        # Test node inspection
        res_node = await client.get("/api/digital-twin/node/node_gs_kiruna")
        assert res_node.status_code == 200
        assert res_node.json()["node"]["name"] == "Kiruna Arctic Station"
