import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Shield,
  Plug,
  Database,
  FlaskConical,
  Smartphone,
  Terminal,
  Bot,
  Ticket,
  Wrench,
  SlidersHorizontal,
  BrainCircuit,
  LogOut,
} from "lucide-react";
import { clearIctAdminToken } from "./client";
import IctAdminMonitoring from "./pages/IctAdminMonitoring";
import IctAdminTickets from "./pages/IctAdminTickets";
import IctAdminComingSoon from "./pages/IctAdminComingSoon";

const NAV = [
  { key: "monitoring", label: "System Monitoring", icon: Activity, ready: true },
  { key: "security", label: "Security Center", icon: Shield, ready: false },
  { key: "api", label: "API Management", icon: Plug, ready: false },
  { key: "database", label: "Database Tools", icon: Database, ready: false },
  { key: "sandbox", label: "Sandbox Environment", icon: FlaskConical, ready: false },
  { key: "devices", label: "Device Management", icon: Smartphone, ready: false },
  { key: "dev", label: "Developer Tools", icon: Terminal, ready: false },
  { key: "automation", label: "Automation Engine", icon: Bot, ready: false },
  { key: "tickets", label: "Ticketing System", icon: Ticket, ready: true },
  { key: "maintenance", label: "Maintenance Tools", icon: Wrench, ready: false },
  { key: "config", label: "Configuration Center", icon: SlidersHorizontal, ready: false },
  { key: "ai", label: "AI Diagnostics", icon: BrainCircuit, ready: false },
];

export default function IctAdminShell() {
  const navigate = useNavigate();
  const [active, setActive] = useState("monitoring");
  const current = NAV.find((n) => n.key === active)!;

  function logout() {
    clearIctAdminToken();
    navigate("/ict-admin/login");
  }

  return (
    <div className="ict-shell">
      <aside className="ict-sidebar">
        <div className="ict-sidebar-brand">ICT Admin</div>
        <nav className="ict-nav">
          {NAV.map((item) => (
            <button
              key={item.key}
              className={`ict-nav-item ${active === item.key ? "active" : ""} ${!item.ready ? "soon" : ""}`}
              onClick={() => setActive(item.key)}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
              {!item.ready && <span className="ict-nav-badge">Soon</span>}
            </button>
          ))}
        </nav>
        <button className="ict-logout" onClick={logout}>
          <LogOut size={16} />
          Log out
        </button>
      </aside>

      <main className="ict-content">
        {current.key === "monitoring" && <IctAdminMonitoring />}
        {current.key === "tickets" && <IctAdminTickets />}
        {current.ready === false && <IctAdminComingSoon label={current.label} />}
      </main>
    </div>
  );
}
