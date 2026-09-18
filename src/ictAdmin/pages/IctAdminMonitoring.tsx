import { useEffect, useState } from "react";
import { ictAdminApi, type IctAdminMonitoring as Monitoring } from "../client";

export default function IctAdminMonitoring() {
  const [data, setData] = useState<Monitoring | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    ictAdminApi
      .monitoring()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (error) return <div className="ict-panel ict-error">{error}</div>;
  if (!data) return <div className="ict-panel">Loading...</div>;

  const uptimeHours = Math.floor(data.uptimeSeconds / 3600);
  const uptimeMinutes = Math.floor((data.uptimeSeconds % 3600) / 60);

  return (
    <div>
      <h1 className="ict-page-title">System Monitoring</h1>
      <p className="ict-page-sub">Auto-refreshes every 15 seconds. Last update {new Date(data.timestamp).toLocaleTimeString()}.</p>

      <div className="ict-stat-grid">
        <div className="ict-stat-card">
          <span className="ict-stat-label">Server uptime</span>
          <span className="ict-stat-value">{uptimeHours}h {uptimeMinutes}m</span>
        </div>
        <div className="ict-stat-card">
          <span className="ict-stat-label">Node version</span>
          <span className="ict-stat-value">{data.nodeVersion}</span>
        </div>
        <div className={`ict-stat-card ${data.database.ok ? "ok" : "fail"}`}>
          <span className="ict-stat-label">Database</span>
          <span className="ict-stat-value">
            {data.database.ok ? `OK · ${data.database.latencyMs}ms` : "Unreachable"}
          </span>
        </div>
        <div className="ict-stat-card">
          <span className="ict-stat-label">Memory (RSS)</span>
          <span className="ict-stat-value">{data.memory.rssMb} MB</span>
        </div>
        <div className="ict-stat-card">
          <span className="ict-stat-label">Heap used / total</span>
          <span className="ict-stat-value">
            {data.memory.heapUsedMb} / {data.memory.heapTotalMb} MB
          </span>
        </div>
      </div>
    </div>
  );
}
