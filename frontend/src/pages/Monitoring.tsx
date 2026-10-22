import { useEffect, useState } from "react";
import { api } from "../services/api";
import "./Monitoring.css";

interface Reading {
  reading_id: number;
  metric_name: string;
  value: number;
  unit: string;
  source: string;
  recorded_at: string;
}

interface Alert {
  alert_id: number;
  message: string;
  severity: string;
  status: string;
  created_at: string;
}

export default function Monitoring() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ metric_name: "", value: "", unit: "", source: "synthetic-browser" });

  const load = async () => {
    try {
      setLoading(true);
      const [readingResponse, alertResponse] = await Promise.all([
        api.get<Reading[]>("/monitoring/readings"),
        api.get<Alert[]>("/monitoring/alerts"),
      ]);
      setReadings(readingResponse.data);
      setAlerts(alertResponse.data);
      setError("");
    } catch {
      setError("Unable to load process monitoring data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const acknowledge = async (id: number) => {
    try {
      setAcknowledgingId(id);
      setError("");
      await api.patch(`/monitoring/alerts/${id}`);
      await load();
    } catch {
      setError("Unable to acknowledge the alert.");
    } finally {
      setAcknowledgingId(null);
    }
  };

  const recordReading = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await api.post("/monitoring/readings", {
        metric_name: form.metric_name,
        value: Number(form.value),
        unit: form.unit,
        source: form.source,
      });
      setForm({ metric_name: "", value: "", unit: "", source: "synthetic-browser" });
      await load();
      setSuccess("Process reading recorded successfully.");
    } catch {
      setError("Unable to record the process reading.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="monitoring-page">
      <div className="monitoring-header">
        <div>
          <span className="monitoring-eyebrow">OPERATIONS</span>
          <h1>Process Monitoring</h1>
          <p>Track process readings, identify anomalies, and coordinate safety response.</p>
        </div>
      </div>
      {error && <p className="monitoring-message monitoring-error" role="alert">{error}</p>}
      {success && <p className="monitoring-message monitoring-success" role="status">{success}</p>}
      <form className="monitoring-card monitoring-reading-card" onSubmit={(event) => void recordReading(event)}>
        <div className="monitoring-card-header">
          <div>
            <span className="monitoring-card-eyebrow">PROCESS DATA</span>
            <h2>Record Reading</h2>
            <p>Add a reading from an approved process source.</p>
          </div>
        </div>
        <div className="monitoring-form-grid">
          <label>Metric name<input aria-label="Metric name" required value={form.metric_name} onChange={(event) => setForm({ ...form, metric_name: event.target.value })} placeholder="e.g. Reactor temperature" /></label>
          <label>Value<input aria-label="Value" required type="number" step="any" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder="e.g. 72.5" /></label>
          <label>Unit<input aria-label="Unit" required value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="e.g. °C" /></label>
          <label>Source<input aria-label="Source" required value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} /></label>
        </div>
        <button className="monitoring-primary-button" type="submit" disabled={saving}>{saving ? "Recording..." : "Record reading"}</button>
      </form>
      <div className="monitoring-grid">
        <div className="monitoring-card">
          <div className="monitoring-card-header">
            <div><span className="monitoring-card-eyebrow">PROCESS DATA</span><h2>Recent Readings</h2></div>
            <span className="monitoring-count">{readings.length}</span>
          </div>
          {loading ? <p className="monitoring-empty">Loading readings...</p> : readings.length === 0 ? <p className="monitoring-empty">No process readings recorded.</p> : <div className="monitoring-reading-list">{readings.map((reading) => <div className="monitoring-reading-row" key={reading.reading_id}><div><strong>{reading.metric_name}</strong><span>{new Date(reading.recorded_at).toLocaleString()}</span></div><div className="monitoring-reading-value"><strong>{reading.value} {reading.unit}</strong><span className={reading.source.startsWith("SIMULATED:") ? "monitoring-source simulated" : "monitoring-source"}>{reading.source.startsWith("SIMULATED:") ? "SIMULATED SOURCE" : reading.source}</span></div></div>)}</div>}
        </div>
        <div className="monitoring-card">
          <div className="monitoring-card-header">
            <div><span className="monitoring-card-eyebrow">SAFETY RESPONSE</span><h2>Safety Alerts</h2></div>
            <span className="monitoring-count alert-count">{alerts.length}</span>
          </div>
          {loading ? <p className="monitoring-empty">Loading alerts...</p> : alerts.length === 0 ? <p className="monitoring-empty">No safety alerts recorded.</p> : <div className="monitoring-alert-list">{alerts.map((alert) => <div className="monitoring-alert-row" key={alert.alert_id}><div className="monitoring-alert-copy"><div><span className={`monitoring-severity ${alert.severity.toLowerCase()}`}>{alert.severity}</span><span className={`monitoring-alert-status ${alert.status.toLowerCase()}`}>{alert.status}</span></div><strong>{alert.message}</strong><span>{new Date(alert.created_at).toLocaleString()}</span></div>{alert.status === "OPEN" && <button className="monitoring-ack-button" type="button" disabled={acknowledgingId === alert.alert_id} onClick={() => void acknowledge(alert.alert_id)}>{acknowledgingId === alert.alert_id ? "Saving..." : "Acknowledge"}</button>}</div>)}</div>}
        </div>
      </div>
    </section>
  );
}
