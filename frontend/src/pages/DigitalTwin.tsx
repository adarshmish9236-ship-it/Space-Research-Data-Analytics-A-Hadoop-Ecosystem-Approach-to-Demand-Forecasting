import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Database,
  Radio,
  Wifi,
  Layers,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Server
} from 'lucide-react';
import { apiService } from '../services/api';

interface TwinNode {
  id: string;
  name: string;
  type: string;
  layer: 'orbital' | 'ground' | 'streaming' | 'lake' | 'compute' | 'serving';
  status: 'nominal' | 'warning' | 'critical';
  current_utilization_pct: number;
  forecast_demand: number;
  capacity_limit: number;
  unit: string;
  active_alerts: string[];
  recommended_action?: string;
  health_score: number;
}

interface DigitalTwinState {
  timestamp: string;
  system_health_index: number;
  total_nodes: number;
  nodes_in_warning: number;
  nodes_in_critical: number;
  nodes: TwinNode[];
}

export const DigitalTwin: React.FC = () => {
  const [twinState, setTwinState] = useState<DigitalTwinState | null>(null);
  const [selectedNode, setSelectedNode] = useState<TwinNode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchTwinData = async () => {
    try {
      const res = await apiService.digitalTwinState();
      if (res.data) {
        const raw = res.data;
        // Transform ground stations and infrastructure nodes into TwinNode format
        const gsNodes: TwinNode[] = (raw.ground_stations || []).map((gs: any) => {
          const util = gs.utilization_pct ?? 75.0;
          const status = (gs.status === 'DEGRADED' || gs.risk_tier === 'HIGH' || util > 88) 
            ? 'critical' 
            : (gs.risk_tier === 'MODERATE' || util > 75) 
            ? 'warning' 
            : 'nominal';
          return {
            id: gs.id,
            name: gs.name,
            type: 'GROUND_STATION',
            layer: 'ground' as const,
            status,
            current_utilization_pct: util,
            forecast_demand: gs.forecast_load_pct ?? (util * 1.1),
            capacity_limit: 100,
            unit: '% Load',
            active_alerts: (gs.recent_anomalies || []).filter((a: string) => a && a !== 'None'),
            recommended_action: gs.prescribed_action,
            health_score: Math.max(10, Math.round(100 - (util * 0.45) - (status === 'critical' ? 20 : 0)))
          };
        });

        const infraNodes: TwinNode[] = (raw.infrastructure_nodes || []).map((inf: any) => {
          const util = inf.utilization_pct ?? 50.0;
          const status = (inf.status === 'DEGRADED' || inf.risk_tier === 'HIGH' || util > 85)
            ? 'critical'
            : (inf.risk_tier === 'MODERATE' || util > 70)
            ? 'warning'
            : 'nominal';
          const layerMap: Record<string, 'streaming' | 'lake' | 'compute' | 'serving'> = {
            'STREAMING_INGRESS': 'streaming',
            'LAKEHOUSE_STORAGE': 'lake',
            'DISTRIBUTED_COMPUTE': 'compute',
            'SERVING_API': 'serving'
          };
          return {
            id: inf.id,
            name: inf.name,
            type: inf.type,
            layer: layerMap[inf.type] || 'compute',
            status,
            current_utilization_pct: util,
            forecast_demand: util * 1.15,
            capacity_limit: 100,
            unit: '% Cap',
            active_alerts: inf.connected_links || [],
            recommended_action: inf.prescribed_action,
            health_score: Math.max(10, Math.round(100 - (util * 0.35)))
          };
        });

        const allNodes: TwinNode[] = (raw.nodes && raw.nodes.length > 0) ? raw.nodes : [...gsNodes, ...infraNodes];
        const nodesInWarning = allNodes.filter((n: TwinNode) => n.status === 'warning').length;
        const nodesInCritical = allNodes.filter((n: TwinNode) => n.status === 'critical').length;
        const avgHealth = allNodes.length > 0 
          ? allNodes.reduce((acc: number, n: TwinNode) => acc + (n.health_score || 85), 0) / allNodes.length 
          : 94.2;

        const normalizedState: DigitalTwinState = {
          timestamp: raw.last_synced_at || raw.timestamp || new Date().toISOString(),
          system_health_index: raw.system_health_index ?? avgHealth,
          total_nodes: raw.total_nodes ?? allNodes.length,
          nodes_in_warning: raw.nodes_in_warning ?? nodesInWarning,
          nodes_in_critical: raw.nodes_in_critical ?? nodesInCritical,
          nodes: allNodes
        };

        setTwinState(normalizedState);
        if (!selectedNode && allNodes.length > 0) {
          setSelectedNode(allNodes[0]);
        } else if (selectedNode) {
          const updated = allNodes.find((n: TwinNode) => n.id === selectedNode.id);
          if (updated) setSelectedNode(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load digital twin state:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTwinData();
    const interval = setInterval(() => {
      fetchTwinData();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTwinData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f97316';
      case 'nominal':
      default:
        return '#10b981';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'constellation':
      case 'satellite':
        return <Wifi size={16} color="#38bdf8" />;
      case 'ground_station':
        return <Radio size={16} color="#fbbf24" />;
      case 'kafka_cluster':
        return <Layers size={16} color="#c084fc" />;
      case 'hdfs_cluster':
        return <Database size={16} color="#38bdf8" />;
      case 'spark_yarn':
        return <Cpu size={16} color="#f472b6" />;
      case 'serving_api':
      default:
        return <Server size={16} color="#34d399" />;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
        <Activity size={32} color="#38bdf8" style={{ marginBottom: '12px' }} />
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>Synchronizing Digital Twin Topology...</div>
        <div style={{ fontSize: '14px', marginTop: '6px' }}>Connecting space-to-ground telemetry streams</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '11px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              padding: '4px 10px',
              borderRadius: '20px',
              fontWeight: 700,
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              Connected Infrastructure
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>• Real-Time Synchronized State</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Digital Twin 2.0 Command Canvas
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '6px 0 0 0' }}>
            Live topological twin linking orbital satellites, downlink ground stations, Kafka message brokers, HDFS data lakes, and Spark compute clusters.
          </p>
        </div>

        {/* System Health & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {twinState && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Twin Health Index</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>
                  {twinState.system_health_index.toFixed(1)}%
                </div>
              </div>
              <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                <div><strong>{twinState.total_nodes}</strong> Total Nodes</div>
                <div style={{ color: twinState.nodes_in_warning > 0 ? '#f97316' : '#64748b' }}>
                  {twinState.nodes_in_warning} in Warning
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleRefresh}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              padding: '9px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Sync
          </button>
        </div>
      </div>

      {/* Main Layout: Topology Grid + Node Inspector Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Topology Grid by Layers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {twinState && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '14px'
            }}>
              {twinState.nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const statusColor = getStatusColor(node.status);
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    style={{
                      background: isSelected ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.7)',
                      border: isSelected
                        ? `2px solid ${statusColor}`
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? `0 0 16px ${statusColor}33` : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getNodeIcon(node.type)}
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                          {node.name}
                        </span>
                      </div>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: statusColor,
                        boxShadow: `0 0 8px ${statusColor}`
                      }} />
                    </div>

                    {/* Utilization Bar */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b', textTransform: 'uppercase' }}>Utilization</span>
                        <span style={{ fontWeight: 700, color: statusColor }}>{node.current_utilization_pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(node.current_utilization_pct, 100)}%`,
                          height: '100%',
                          background: statusColor,
                          borderRadius: '3px'
                        }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                      <span>Layer: <strong style={{ color: '#cbd5e1' }}>{node.layer}</strong></span>
                      <span>Health: <strong style={{ color: '#34d399' }}>{node.health_score}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: `1px solid ${getStatusColor(selectedNode.status)}44`,
            borderRadius: '12px',
            padding: '24px',
            position: 'sticky',
            top: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: getStatusColor(selectedNode.status),
                  marginBottom: '4px'
                }}>
                  NODE INSPECTOR • {selectedNode.status.toUpperCase()}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  {selectedNode.name}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Type: {selectedNode.type} | Layer: {selectedNode.layer}</div>
              </div>

              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: getStatusColor(selectedNode.status),
                background: `${getStatusColor(selectedNode.status)}22`,
                padding: '4px 10px',
                borderRadius: '12px',
                textTransform: 'uppercase'
              }}>
                {selectedNode.status}
              </span>
            </div>

            {/* Telemetry Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              padding: '14px',
              background: 'rgba(0,0,0,0.25)',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Current Utilization</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: getStatusColor(selectedNode.status) }}>
                  {selectedNode.current_utilization_pct.toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Health Score</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>
                  {selectedNode.health_score}/100
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Forecast Demand</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                  {selectedNode.forecast_demand.toLocaleString()} {selectedNode.unit}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Capacity Limit</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>
                  {selectedNode.capacity_limit.toLocaleString()} {selectedNode.unit}
                </div>
              </div>
            </div>

            {/* Active Alerts */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
                Active Telemetry Alerts
              </div>
              {selectedNode.active_alerts && selectedNode.active_alerts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedNode.active_alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#fca5a5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#6ee7b7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={14} />
                  <span>Telemetry nominal. No active operational threshold violations.</span>
                </div>
              )}
            </div>

            {/* Recommended Action */}
            {selectedNode.recommended_action && (
              <div style={{
                padding: '14px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '10px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '4px' }}>
                  Prescriptive Twin Recommendation
                </div>
                <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5 }}>
                  {selectedNode.recommended_action}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
