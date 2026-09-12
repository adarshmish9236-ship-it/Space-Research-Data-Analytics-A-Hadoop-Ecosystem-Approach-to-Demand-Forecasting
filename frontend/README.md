# 🚀 Orbitalytics Frontend (SpaceDemand)

> **Space Research Intelligence & Resource Demand Forecasting Platform**  
> Modern, high-performance dashboard for interactive space mission analytics, resource demand forecasting, cluster telemetry, and scenario simulation.

---

## 🛠️ Technology Stack

- **Core**: [React 19](https://react.dev/), [TypeScript 6](https://www.typescriptlang.org/), [Vite 8](https://vitejs.dev/)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/)
- **Data Visualization**: [Recharts 3](https://recharts.org/)
- **Animations & Transitions**: [Framer Motion](https://www.framer.com/motion/)
- **UI Components & Icons**: [Lucide React](https://lucide.dev/), [Radix UI Primitives](https://www.radix-ui.com/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Linter**: [Oxlint](https://oxc.rs/)

---

## 📊 Modules & Features

1. **Executive Mission Control (`Overview.tsx`)**: High-level KPIs, launch cadences, payload mass trends, and active mission summary.
2. **Space Intelligence & Pattern Discovery (`SpaceIntelligence.tsx`)**: AI pattern extraction, cluster profiling, and mission clustering models.
3. **Demand Forecasting Lab (`DemandForecast.tsx`)**: Machine learning demand forecasting for fuel, telemetry bandwidth, power, and ground station capacity.
4. **Scenario Lab (`ScenarioLab.tsx`)**: Real-time "What-If" parameter simulation (launch frequency, payload weight, solar cycle activity, station expansion).
5. **Data Explorer (`DataExplorer.tsx`)**: Deep data grid, column filtering, search, and dynamic schema inspection.
6. **Hadoop Cluster Monitor (`SystemMonitor.tsx`)**: Live telemetry for HDFS nodes, Spark jobs, CPU/Memory resource utilization, and cluster health status.
7. **Analytical Reports (`Reports.tsx`)**: Executive summaries, downloadable reports, and metric breakdown exports.

---

## 🚦 Getting Started

### Prerequisites
- **Node.js**: `v20+` recommended
- **Package Manager**: `npm`

### Installation
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install
```

### Running Development Server
```bash
# Start Vite dev server on http://localhost:5173
npm run dev
```

### Building for Production
```bash
# Type check and build bundle
npm run build

# Preview production build locally
npm run preview
```

### Linting
```bash
# Run oxlint checks
npm run lint
```

---

## 🔗 Backend API Integration

The frontend communicates with the **FastAPI Backend** running at `http://localhost:8000/api/v1`.

Ensure the backend server is running:
```bash
cd ../backend
python -m uvicorn app.main:app --reload
```

---

## 📌 Future Roadmap & Pending TODO List

- [ ] **Real-Time Telemetry Streaming**: Implement WebSocket client for live telemetry streaming from Apache Kafka/FastAPI.
- [ ] **Authentication & RBAC**: Add user login screen with JWT authorization and role-based route guards (`Admin`, `Analyst`, `Viewer`).
- [ ] **Executive PDF Export**: Add automated PDF export feature for analytics reports and scenario simulations.
- [ ] **Theme Customization**: Add Light / Dark theme mode toggle switch in top navigation.
- [ ] **Unit & Component Testing**: Implement Vitest + React Testing Library test suite for core UI components.

