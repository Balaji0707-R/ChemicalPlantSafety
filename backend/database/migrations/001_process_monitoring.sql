CREATE TABLE IF NOT EXISTS process_readings (
    reading_id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    value NUMERIC(14,4) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    source VARCHAR(100) NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS process_readings_metric_time_idx
    ON process_readings (metric_name, recorded_at DESC);

CREATE TABLE IF NOT EXISTS safety_alerts (
    alert_id SERIAL PRIMARY KEY,
    reading_id INTEGER REFERENCES process_readings(reading_id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(30) NOT NULL DEFAULT 'HIGH',
    message TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP
);

ALTER TABLE safety_alerts
    ADD COLUMN IF NOT EXISTS severity VARCHAR(30) NOT NULL DEFAULT 'HIGH';
