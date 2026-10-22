import { pool } from "../config/database.js";

export interface ProcessReadingInput {
  metric_name: string;
  value: number;
  unit: string;
  source: string;
  recorded_at?: string;
}

export const getReadings = async (limit = 100) => {
  const result = await pool.query(
    `SELECT reading_id, metric_name, value, unit, source, recorded_at
       FROM process_readings
      ORDER BY recorded_at DESC
      LIMIT $1`,
    [limit]
  );
  return result.rows;
};

export const createReading = async (data: ProcessReadingInput) => {
  const source = /^(synthetic|simulated)([-_ ]|$)/i.test(data.source)
    ? `SIMULATED:${data.source}`
    : data.source;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const reading = await client.query(
      `INSERT INTO process_readings (metric_name, value, unit, source, recorded_at)
       VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_TIMESTAMP))
       RETURNING *`,
      [data.metric_name, data.value, data.unit, source, data.recorded_at ?? null]
    );

    const history = await client.query<{ average: number; deviation: number }>(
      `SELECT AVG(value)::float8 AS average,
              COALESCE(STDDEV_POP(value), 0)::float8 AS deviation
         FROM (
           SELECT value FROM process_readings
            WHERE metric_name = $1
            ORDER BY recorded_at DESC
            OFFSET 1 LIMIT 20
         ) recent`,
      [data.metric_name]
    );
    const stats = history.rows[0];
    const zScore = stats?.deviation > 0
      ? Math.abs(data.value - stats.average) / stats.deviation
      : 0;
    const anomalous =
      stats?.deviation > 0 &&
      zScore >= 3;
    const severity = zScore >= 5 ? "CRITICAL" : "HIGH";

    let alert = null;
    if (anomalous) {
      const alertResult = await client.query(
        `INSERT INTO safety_alerts (reading_id, alert_type, severity, message)
         VALUES ($1, 'ANOMALY', $2, $3)
         RETURNING *`,
        [
          reading.rows[0].reading_id,
          severity,
          `${data.metric_name} reading ${data.value} ${data.unit} is outside the historical range`,
        ]
      );
      alert = alertResult.rows[0];
    }
    await client.query("COMMIT");
    return { reading: reading.rows[0], alert };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getAlerts = async () => {
  const result = await pool.query(
    `SELECT alert_id, reading_id, alert_type, severity, message, status, created_at, acknowledged_at
       FROM safety_alerts
      ORDER BY created_at DESC`
  );
  return result.rows;
};

export const acknowledgeAlert = async (id: number) => {
  const result = await pool.query(
    `UPDATE safety_alerts
        SET status = 'ACKNOWLEDGED', acknowledged_at = CURRENT_TIMESTAMP
      WHERE alert_id = $1
      RETURNING *`,
    [id]
  );
  return result.rows[0];
};
