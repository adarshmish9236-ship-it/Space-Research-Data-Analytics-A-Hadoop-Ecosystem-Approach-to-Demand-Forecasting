# 🚀 Orbitalytics Project Roadmap & Task Tracker

## ✅ Completed Tasks

- [x] Research Hadoop ecosystem requirements and compatibility on Windows.
- [x] Create synthetic data generators for missions, satellites, and launches.
- [x] Implement Apache Spark ETL Pipeline (Clean, Aggregate, Parquet generation).
- [x] Troubleshoot and patch Java 26 / Hadoop 3.3.4 PySpark incompatibilities on Windows.
- [x] Write Hive DDL for analytical views (demonstration).
- [x] Develop Spark MLlib Forecasting Pipeline (Gradient Boosted Trees).
- [x] Implement FastAPI backend with PyArrow Parquet serving.
- [x] Build responsive React + Vite + Tailwind frontend.
- [x] Create interactive UI components (Dashboard, Forecast, Scenario Lab, System Monitor).
- [x] Verify end-to-end integration (Backend API serves Frontend successfully).

---

## 📌 Pending TODO List & Future Roadmap

### 🛰️ Real-Time Telemetry & Data Streaming
- [ ] Integrate Apache Kafka producers and consumers for streaming satellite telemetry events.
- [ ] Implement WebSockets in FastAPI and React for real-time metric pushes to System Monitor.

### 🧠 Advanced AI / ML Capabilities
- [ ] Train PySpark MLlib anomaly detection models (Isolation Forest) for satellite subsystem degradation.
- [ ] Implement automated model retraining pipeline triggered by scheduled HDFS batch ingest.

### 🔐 Security & Access Control
- [ ] Implement JWT authentication & authorization middleware in FastAPI backend (`/api/v1/auth`).
- [ ] Add Role-Based Access Control (RBAC) in React frontend (`Admin`, `Analyst`, `Viewer` roles).

### 🐳 Infrastructure & Containerization
- [ ] Create Docker Compose multi-node cluster deployment (NameNode, DataNodes, YARN, Hive Metastore).
- [ ] Setup automated HDFS block replication and data lifecycle retention policies.

### 📊 Reporting & Exports
- [ ] Implement automated PDF executive report generation with chart snapshot embeds.
- [ ] Add direct Parquet / CSV data export buttons in Data Explorer UI.

### 🧪 Testing & Quality Assurance
- [ ] Write unit & integration tests for React components using Vitest and React Testing Library.
- [ ] Expand pytest suite for FastAPI endpoint integration and Spark ETL pipeline schemas.
