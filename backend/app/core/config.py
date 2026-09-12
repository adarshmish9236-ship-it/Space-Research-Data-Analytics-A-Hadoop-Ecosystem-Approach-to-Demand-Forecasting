"""ORBITALYTICS — Application Configuration"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "ORBITALYTICS"
    APP_ENV: str = "development"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_PREFIX: str = "/api"

    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    DATA_BASE_PATH: str = str(PROJECT_ROOT / "data")
    RAW_DATA_PATH: str = str(PROJECT_ROOT / "data" / "raw")
    PROCESSED_DATA_PATH: str = str(PROJECT_ROOT / "data" / "processed")
    ANALYTICS_DATA_PATH: str = str(PROJECT_ROOT / "data" / "analytics")
    MODELS_PATH: str = str(PROJECT_ROOT / "models" / "saved")

    HDFS_NAMENODE_HOST: str = "localhost"
    HDFS_NAMENODE_PORT: int = 9000
    HDFS_BASE_PATH: str = "/space"
    USE_REAL_HDFS: bool = False

    HIVE_HOST: str = "localhost"
    HIVE_PORT: int = 10000
    HIVE_DATABASE: str = "space_analytics"
    USE_REAL_HIVE: bool = False

    SPARK_MASTER: str = "local[*]"
    SPARK_APP_NAME: str = "ORBITALYTICS"
    SPARK_LOG_LEVEL: str = "WARN"

    KAFKA_ENABLED: bool = False
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TOPIC_SPACE_EVENTS: str = "space_events"

    MODEL_AUTO_SELECT: bool = True
    FORECAST_CONFIDENCE_FACTOR: float = 1.5
    MAX_FORECAST_YEARS: int = 5

    LOG_LEVEL: str = "INFO"

    @property
    def allowed_origins_list(self) -> list:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
