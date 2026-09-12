"""
SpaceDemand — Hadoop Cluster & Big Data Infrastructure API Routes
================================================================
Endpoints:
  GET  /api/hadoop/cluster       — HDFS, YARN, and node health metrics
  GET  /api/hadoop/jobs          — Distributed MapReduce and Spark job logs with filtering
  GET  /api/hadoop/hdfs/tree     — Real/simulated HDFS file system tree and block metadata
  GET  /api/hadoop/hive/queries  — Catalog of 11 Hive analytical queries
  POST /api/hadoop/hive/execute  — Execute Hive analytical query and get distributed DAG
"""

from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Query, Depends
from app.services.hadoop_service import BaseHadoopService, get_hadoop_service

router = APIRouter()


class HiveExecutionRequest(BaseModel):
    query_id: str = "Q1"


@router.get("/hadoop/cluster")
async def get_cluster(hadoop: BaseHadoopService = Depends(get_hadoop_service)):
    """Retrieve HDFS and YARN infrastructure metrics."""
    return hadoop.get_cluster_status()


@router.get("/hadoop/jobs")
async def get_jobs(
    status: Optional[str] = Query(None, description="Filter jobs by status: ALL, RUNNING, COMPLETED, FAILED"),
    hadoop: BaseHadoopService = Depends(get_hadoop_service)
):
    """Retrieve MapReduce and Spark distributed jobs."""
    return {"jobs": hadoop.get_jobs(status), "total": len(hadoop.get_jobs(status))}


@router.get("/hadoop/hdfs/tree")
async def get_hdfs_tree(hadoop: BaseHadoopService = Depends(get_hadoop_service)):
    """Inspect hierarchical HDFS file system, block distribution, and replication status."""
    return hadoop.get_hdfs_tree()


@router.get("/hadoop/hive/queries")
async def get_hive_queries(hadoop: BaseHadoopService = Depends(get_hadoop_service)):
    """List all 11 Apache Hive analytical queries configured in the analytical warehouse."""
    queries = hadoop.get_hive_queries()
    return {"queries": queries, "total": len(queries)}


@router.post("/hadoop/hive/execute")
async def execute_hive_query(
    payload: HiveExecutionRequest,
    hadoop: BaseHadoopService = Depends(get_hadoop_service)
):
    """Execute a Hive analytical query and return records + distributed execution DAG."""
    return hadoop.execute_hive_query(payload.query_id)
