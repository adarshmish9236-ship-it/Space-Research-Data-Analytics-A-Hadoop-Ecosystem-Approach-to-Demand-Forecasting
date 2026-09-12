import axios from 'axios'

const STORAGE_KEY = 'orbitalytics_auth'

const api = axios.create({
  baseURL: '/api',
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: Attach JWT Bearer token if present
api.interceptors.request.use((config) => {
  try {
    const rawAuth = localStorage.getItem(STORAGE_KEY)
    if (rawAuth) {
      const auth = JSON.parse(rawAuth)
      if (auth && auth.token) {
        config.headers.Authorization = `Bearer ${auth.token}`
      }
    }
  } catch (err) {
    console.error('Failed to parse auth from storage:', err)
  }
  return config
})

// Response interceptor for error handling & session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Authentication token expired or invalid. Clearing session.')
      localStorage.removeItem(STORAGE_KEY)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else if (error.response?.status === 500) {
      console.error('API Server Error:', error.response.data)
    }
    return Promise.reject(error)
  }
)

export { api }
export default api

// ── Typed API calls ────────────────────────────────────────────────────────
export const apiService = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  authMe: () => api.get('/auth/me'),
  demoAccounts: () => api.get('/auth/demo-accounts'),

  // Core Big Data & Analytics
  health: () => api.get('/health'),
  dashboard: () => api.get('/dashboard'),
  trends: (params?: Record<string, unknown>) => api.get('/trends', { params }),
  countries: () => api.get('/countries'),
  missionTypes: () => api.get('/mission-types'),
  countryTrends: (country: string) => api.get(`/countries/${encodeURIComponent(country)}/trends`),
  missions: (params?: Record<string, unknown>) => api.get('/missions', { params }),
  analyticsStudio: (params?: {
    orbit?: string
    country?: string
    mission_type?: string
    year_from?: number
    year_to?: number
  }) => api.get('/analytics/studio', { params }),
  forecast: (params: {
    country?: string
    mission_type?: string
    horizon_years?: number
    model_name?: string
  }) => api.get('/forecast', { params }),
  countryForecast: (country: string, params?: Record<string, unknown>) =>
    api.get(`/forecast/${encodeURIComponent(country)}`, { params }),
  scenarios: (body: {
    satellite_growth: number
    launch_capacity: number
    research_activity: number
    mission_growth: number
    country?: string
    mission_type?: string
    horizon_years?: number
  }) => api.post('/scenarios', body),
  scenarioPresets: () => api.get('/scenarios/presets'),
  odi: (params?: { country?: string }) => api.get('/odi', { params }),
  modelPerformance: () => api.get('/model-performance'),
  systemStatus: () => api.get('/system-status'),
  hadoopCluster: () => api.get('/hadoop/cluster'),
  hadoopJobs: (params?: { status?: string }) => api.get('/hadoop/jobs', { params }),
  hadoopHdfsTree: () => api.get('/hadoop/hdfs/tree'),
  hadoopHiveQueries: () => api.get('/hadoop/hive/queries'),
  hadoopExecuteHiveQuery: (query_id: string) => api.post('/hadoop/hive/execute', { query_id }),
  patterns: () => api.get('/patterns'),
  correlations: () => api.get('/correlations'),
  clusters: () => api.get('/clusters'),
  anomalies: () => api.get('/anomalies'),

  // Executive Reports & PDF
  reportsExecutive: () => api.get('/reports/executive'),
  exportPdf: () => api.get('/reports/export-pdf', { responseType: 'blob' }),

  // Data Explorer & Export
  dataExplorer: (params: {
    dataset?: string
    country?: string
    year?: number
    mission_type?: string
    limit?: number
  }) => api.get('/data-explorer', { params }),
  dataExplorerStats: (params: { dataset: string }) =>
    api.get('/data-explorer/stats', { params }),
  exportData: (params: {
    dataset: string
    export_format: 'csv' | 'parquet'
    country?: string
    year?: number
    mission_type?: string
    limit?: number
  }) => api.get('/data-explorer/export', { params, responseType: 'blob' }),

  // ML Retraining & Live Anomaly Pipeline
  retrainModel: (body: {
    model_type: string
    num_trees?: number
    max_depth?: number
    test_split?: number
    target_metric?: string
  }) => api.post('/ml/retrain', body),
  telemetryAnomalies: (params?: { satellite_id?: string; limit?: number }) =>
    api.get('/ml/anomalies', { params }),

  // Space Situational Awareness (SSA) & Conjunctions
  conjunctions: () => api.get('/conjunctions'),
  avoidanceBurn: (body: { event_id: string; burn_type?: string; safety_margin_km?: number }) =>
    api.post('/conjunctions/avoidance-burn', body),

  // Orbital Constellation Tracker & Ground Stations
  orbitalSatellites: () => api.get('/orbit/satellites'),
  groundStations: () => api.get('/orbit/ground-stations'),

  // Live Telemetry Fault Injection
  injectFault: (body: { subsystem: string; severity?: string; message: string }) =>
    api.post('/telemetry/inject-fault', body),
  clearFault: () => api.post('/telemetry/clear-fault'),

  // Big Data Pipeline & Architecture Visualizer
  pipelineStages: () => api.get('/pipeline/stages'),
  kafkaMetrics: () => api.get('/kafka/metrics'),

  // Data Quality Center
  dataQuality: (dataset: string = 'missions') => api.get('/data-quality', { params: { dataset } }),

  // Forecast Alerts & Capacity Planning
  forecastAlerts: () => api.get('/alerts/forecast'),

  // ML Feature Importance & Dynamic Benchmarking
  featureImportance: (model_name?: string) =>
    api.get('/ml/feature-importance', { params: { model_name } }),
  modelBenchmark: (metric: string = 'rmse') =>
    api.get('/ml/benchmark', { params: { metric } }),

  // Space Agency Analytics
  agencyAnalytics: (agencies: string = 'ALL') =>
    api.get('/analytics/agencies', { params: { agencies } }),

  // ORBITALYTICS 2.0 — Capacity Planning & Prescriptive Engine
  capacityPlan: (horizon_years: number = 3) =>
    api.get('/capacity/plan', { params: { horizon_years } }),
  capacityResources: () => api.get('/capacity/resources'),
  prescriptions: (horizon_years: number = 3) =>
    api.get('/prescriptions', { params: { horizon_years } }),

  // Resource Optimization Solver
  optimizationSolve: (body: {
    cost_weight?: number
    shortage_weight?: number
    risk_weight?: number
    overutil_weight?: number
    target_demand_multiplier?: number
  }) => api.post('/optimization/solve', body),
  optimizationAllocations: () => api.get('/optimization/allocations'),

  // Unified Forecast Risk Score
  riskScore: () => api.get('/risk/score'),
  riskFactors: () => api.get('/risk/factors'),

  // Space Resource Stress Testing
  stressScenarios: () => api.get('/stress-testing/scenarios'),

  // AI Root Cause Analysis
  rootCauseAnalyze: (body: {
    event_type: string
    target_resource: string
    observed_value?: number
  }) => api.post('/root-cause/analyze', body),

  // Data & Concept Drift
  driftStatus: () => api.get('/drift/status'),

  // Model Governance, Lineage & Experiments
  governanceModels: () => api.get('/governance/models'),
  governanceLineage: () => api.get('/governance/lineage'),
  governanceExperiments: () => api.get('/governance/experiments'),
  governanceReproducibility: () => api.get('/governance/reproducibility'),

  // Autonomous AI Analyst
  aiQuery: (query: string) => api.post('/ai/query', { query }),
  aiTools: () => api.get('/ai/tools'),

  // Digital Twin 2.0 State Engine
  digitalTwinState: () => api.get('/digital-twin/state'),
  digitalTwinNode: (node_id: string) => api.get(`/digital-twin/node/${node_id}`),
}


