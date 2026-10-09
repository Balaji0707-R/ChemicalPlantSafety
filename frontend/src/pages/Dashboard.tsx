import { useEffect, useState } from "react";
import {
  FlaskConical,
  ClipboardCheck,
  TriangleAlert,
  FileCheck,
  Siren,
  Activity,
} from "lucide-react";
import axios from "axios";

interface DashboardStats {
  chemicals: number;
  inspections: number;
  incidents: number;
  compliance: number;
  emergency_contacts: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    chemicals: 0,
    inspections: 0,
    incidents: 0,
    compliance: 0,
    emergency_contacts: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);

        const response = await axios.get(
          "http://localhost:5000/api/dashboard/stats"
        );

        setStats(response.data.data);
        setError("");
      } catch (err) {
        console.error("Dashboard API error:", err);
        setError("Unable to load dashboard statistics.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const cards = [
    {
      title: "Chemicals",
      value: stats.chemicals,
      description: "Registered chemicals",
      icon: FlaskConical,
      className: "orange",
    },
    {
      title: "Inspections",
      value: stats.inspections,
      description: "Safety inspections",
      icon: ClipboardCheck,
      className: "blue",
    },
    {
      title: "Incidents",
      value: stats.incidents,
      description: "Reported incidents",
      icon: TriangleAlert,
      className: "red",
    },
    {
      title: "Compliance",
      value: stats.compliance,
      description: "Compliance records",
      icon: FileCheck,
      className: "green",
    },
  ];

  return (
    <div className="dashboard-page">

      <div className="dashboard-header">
        <div>
          <span className="page-eyebrow">OVERVIEW</span>

          <h1>Safety Dashboard</h1>

          <p>
            Centralized monitoring for chemical plant safety and compliance.
          </p>
        </div>

        <div className="dashboard-status">
          <Activity size={18} />

          <div>
            <span>System Status</span>
            <strong>Operational</strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      <div className="stats-grid">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              className={`stat-card ${card.className}`}
              key={card.title}
            >
              <div className="stat-card-top">
                <div className="stat-icon">
                  <Icon size={22} />
                </div>

                <span className="stat-label">
                  {card.title}
                </span>
              </div>

              <div className="stat-value">
                {loading ? "..." : card.value}
              </div>

              <div className="stat-description">
                {card.description}
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-grid">

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <span className="card-eyebrow">
                EMERGENCY
              </span>

              <h2>Emergency Response</h2>
            </div>

            <div className="card-icon emergency-icon">
              <Siren size={21} />
            </div>
          </div>

          <div className="emergency-content">
            <div className="emergency-number">
              {loading ? "..." : stats.emergency_contacts}
            </div>

            <div>
              <strong>Emergency Contacts</strong>

              <p>
                Registered emergency contacts available for response
                coordination.
              </p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">

          <div className="dashboard-card-header">
            <div>
              <span className="card-eyebrow">
                PLATFORM
              </span>

              <h2>System Status</h2>
            </div>

            <div className="online-badge">
              <span></span>
              ONLINE
            </div>
          </div>

          <div className="system-checks">

            <div className="system-check">
              <span>REST API</span>
              <strong>ACTIVE</strong>
            </div>

            <div className="system-check">
              <span>PostgreSQL</span>
              <strong>CONNECTED</strong>
            </div>

            <div className="system-check">
              <span>Frontend</span>
              <strong>RUNNING</strong>
            </div>

            <div className="system-check">
              <span>Backend</span>
              <strong>RUNNING</strong>
            </div>

          </div>
        </div>

      </div>

      <div className="dashboard-card activity-card">

        <div className="dashboard-card-header">
          <div>
            <span className="card-eyebrow">
              MONITORING
            </span>

            <h2>Recent Safety Activity</h2>
          </div>
        </div>

        <div className="empty-activity">

          <Activity size={28} />

          <h3>No recent activity</h3>

          <p>
            Safety inspections, incidents and compliance activities
            will appear here.
          </p>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;