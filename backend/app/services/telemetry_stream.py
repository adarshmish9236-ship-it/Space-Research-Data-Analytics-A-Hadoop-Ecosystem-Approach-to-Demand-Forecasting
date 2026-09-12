"""ORBITALYTICS — Real-Time Telemetry Streaming Service
Simulates high-frequency satellite constellation telemetry and broadcasts over WebSockets.
Supports interactive operator fault injection and real-time anomaly broadcasts.
"""
import asyncio
import json
import logging
import math
import random
import time
from typing import Set, Optional
from fastapi import WebSocket

log = logging.getLogger(__name__)

SATELLITES = [
    {"id": "SAT-GEO-01", "name": "Astraea-3", "orbit": "GEO", "apogee_km": 35786, "inclination_deg": 0.05},
    {"id": "SAT-LEO-08", "name": "Chronos-Surveyor", "orbit": "LEO", "apogee_km": 540, "inclination_deg": 53.2},
    {"id": "SAT-POL-04", "name": "Hyperion-Polaris", "orbit": "SSO", "apogee_km": 780, "inclination_deg": 98.6},
    {"id": "SAT-MEO-02", "name": "Zephyr-Nav", "orbit": "MEO", "apogee_km": 20200, "inclination_deg": 55.0},
]


class TelemetryConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._streaming_task: asyncio.Task | None = None
        self._counter = 0
        self.injected_fault: Optional[dict] = None

    def inject_fault(self, subsystem: str, severity: str, message: str):
        """Simulate an active sensor or hardware anomaly."""
        self.injected_fault = {
            "subsystem": subsystem.upper(),
            "severity": severity.upper(),
            "message": message,
            "injected_at": time.time(),
        }
        log.warning(f"Injected telemetry fault: {message}")

    def clear_fault(self):
        """Reset fault state to nominal."""
        self.injected_fault = None
        log.info("Cleared injected telemetry fault.")

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        log.info(f"WebSocket client connected. Active connections: {len(self.active_connections)}")
        if self._streaming_task is None or self._streaming_task.done():
            self._streaming_task = asyncio.create_task(self._stream_loop())

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        log.info(f"WebSocket client disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        payload = json.dumps(message)
        dead_connections = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                dead_connections.add(connection)
        for dead in dead_connections:
            self.active_connections.discard(dead)

    def _generate_telemetry_frame(self) -> dict:
        self._counter += 1
        t = time.time()
        sat = random.choice(SATELLITES)

        orbit_phase = (t % 5400) / 5400 * 2 * math.pi
        sunlight = 0.5 + 0.5 * math.sin(orbit_phase)

        temp_c = round(18.0 + 12.0 * math.sin(t * 0.05) + random.uniform(-0.8, 0.8), 2)
        power_w = round(420.0 * sunlight + 50.0 + random.uniform(-5.0, 5.0), 1)
        battery_pct = round(max(30.0, min(99.5, 75.0 + 20.0 * math.sin(orbit_phase) + random.uniform(-1.0, 1.0))), 1)
        signal_dbm = round(-78.0 + random.uniform(-3.5, 3.5), 1)
        data_rate_mbps = round(280.0 + 40.0 * math.cos(t * 0.03) + random.uniform(-10.0, 10.0), 1)
        storage_util_pct = round(55.0 + (t % 3600) / 3600 * 25.0, 1)

        # Check for active operator fault or natural random deviation
        is_anomaly = False
        anomaly_details = None

        if self.injected_fault:
            is_anomaly = True
            anomaly_details = self.injected_fault
            sub = self.injected_fault["subsystem"]
            if sub == "THERMAL":
                temp_c = round(48.5 + random.uniform(-1.0, 2.0), 2)
            elif sub == "ELECTRICAL":
                power_w = round(85.0 + random.uniform(-5.0, 5.0), 1)
                battery_pct = round(21.4 + random.uniform(-0.5, 0.5), 1)
            elif sub == "ADCS":
                # Attitude jitter
                signal_dbm = round(-94.2 + random.uniform(-2.0, 2.0), 1)
            elif sub == "COMM":
                data_rate_mbps = round(12.5 + random.uniform(-2.0, 2.0), 1)
        else:
            is_anomaly = random.random() < 0.05
            if is_anomaly:
                anomaly_type = random.choice([
                    "Thermal Loop Sensor Deviation (+3.8°C)",
                    "Solar Array Bus Voltage Micro-Ripple",
                    "Star Tracker Reference Jitter",
                    "Downlink Bit Error Rate Drift",
                ])
                anomaly_details = {
                    "subsystem": "ELECTRICAL" if "Bus" in anomaly_type else ("THERMAL" if "Thermal" in anomaly_type else "ADCS"),
                    "severity": "WARNING",
                    "message": anomaly_type,
                }

        return {
            "type": "TELEMETRY_FRAME",
            "frame_id": self._counter,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(t)),
            "satellite": sat,
            "metrics": {
                "temperature_c": temp_c,
                "power_usage_w": power_w,
                "battery_level_pct": battery_pct,
                "signal_strength_dbm": signal_dbm,
                "data_rate_mbps": data_rate_mbps,
                "storage_utilization_pct": storage_util_pct,
                "sunlight_fraction": round(sunlight, 2),
            },
            "status": "ANOMALY_DETECTED" if is_anomaly else "NOMINAL",
            "anomaly": anomaly_details,
            "is_injected": bool(self.injected_fault),
            "cluster_metrics": {
                "cpu_load_pct": round(24.0 + 8.0 * math.sin(t * 0.1) + random.uniform(-2, 2), 1),
                "memory_used_gb": round(18.2 + 1.5 * math.cos(t * 0.05), 1),
                "active_spark_executors": 4,
                "hdfs_iops": int(1200 + 300 * math.sin(t * 0.2)),
            },
        }

    async def _stream_loop(self):
        log.info("Starting background telemetry WebSocket stream loop")
        while self.active_connections:
            frame = self._generate_telemetry_frame()
            await self.broadcast(frame)
            await asyncio.sleep(1.2)
        log.info("All WebSocket clients disconnected; pausing stream loop")


telemetry_manager = TelemetryConnectionManager()


def get_telemetry_manager() -> TelemetryConnectionManager:
    return telemetry_manager
