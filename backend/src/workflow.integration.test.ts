import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const baseUrl = process.env.TEST_API_URL || "http://localhost:5000/api";
const cookieName = process.env.AUTH_COOKIE_NAME || "chem_safe_session";
const csrf = "workflow-integration-csrf";

const headers = {
  Cookie: `${cookieName}=${jwt.sign(
    {
      sub: "1",
      fullName: "Safety Officer",
      email: "safety.officer@chemsafe.local",
      roleName: "SAFETY_OFFICER",
    },
    process.env.AUTH_JWT_SECRET as string
  )}; chem_safe_csrf=${csrf}`,
  "X-CSRF-Token": csrf,
  "Content-Type": "application/json",
};

const request = async <T = Record<string, unknown>>(
  path: string,
  init: RequestInit = {}
): Promise<{ status: number; body: T }> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) as T : ({} as T),
  };
};

test("chemical storage persists and validates capacity", async () => {
  const chemical = await request<{ chemical_id: number }>("/chemicals", {
    method: "POST",
    body: JSON.stringify({ chemical_name: `Workflow test ${Date.now()}` }),
  });
  assert.equal(chemical.status, 201);

  const chemicalId = chemical.body.chemical_id;
  try {
    const invalid = await request("/chemicals/" + chemicalId + "/storage", {
      method: "POST",
      body: JSON.stringify({
        storage_location: "Tank A",
        quantity: 20,
        unit: "L",
        maximum_capacity: 10,
      }),
    });
    assert.equal(invalid.status, 400);

    const created = await request<{ storage_id: number }>(
      `/chemicals/${chemicalId}/storage`,
      {
        method: "POST",
        body: JSON.stringify({
          storage_location: "Tank A",
          quantity: 5,
          unit: "L",
          maximum_capacity: 10,
        }),
      }
    );
    assert.equal(created.status, 201);
    const listed = await request(`/chemicals/${chemicalId}/storage`);
    assert.equal(listed.status, 200);
    assert.equal((listed.body as unknown as unknown[]).length, 1);
    assert.equal(
      (await request(`/chemical-storage/${created.body.storage_id}`, {
        method: "DELETE",
      })).status,
      204
    );
  } finally {
    assert.equal((await request(`/chemicals/${chemicalId}`, { method: "DELETE" })).status, 200);
  }
});

test("inspection findings and incidents/actions persist; restricted writes are denied", async () => {
  const inspection = await request<{ inspection_id: number }>("/inspections", {
    method: "POST",
    body: JSON.stringify({
      inspector_id: 1,
      inspection_date: "2026-10-09",
      area: `Workflow area ${Date.now()}`,
      status: "SCHEDULED",
    }),
  });
  assert.equal(inspection.status, 201);

  const incident = await request<{ incident_id: number }>("/incidents", {
    method: "POST",
    body: JSON.stringify({
      reported_by: 1,
      incident_type: "Workflow test",
      severity: "LOW",
      location: "Test area",
      incident_date: "2026-10-09T10:00:00.000Z",
      description: "Temporary integration-test record",
    }),
  });
  assert.equal(incident.status, 201);

  const contactAttempt = await request("/emergency/contacts", {
    method: "POST",
    body: JSON.stringify({
      contact_name: `Workflow contact ${Date.now()}`,
      phone: "+1-555-0100",
    }),
  });
  assert.equal(contactAttempt.status, 403);

  const procedureAttempt = await request("/emergency/procedures", {
    method: "POST",
    body: JSON.stringify({
      procedure_name: `Workflow procedure ${Date.now()}`,
      emergency_type: "Spill",
      instructions: "Evacuate and notify the control room.",
    }),
  });
  assert.equal(procedureAttempt.status, 403);

  const complianceAttempt = await request("/compliance", {
    method: "POST",
    body: JSON.stringify({
      requirement_name: `Workflow requirement ${Date.now()}`,
      status: "ACTIVE",
    }),
  });
  assert.equal(complianceAttempt.status, 403);

  try {
    const finding = await request(`/findings`, {
      method: "POST",
      body: JSON.stringify({
        inspection_id: inspection.body.inspection_id,
        finding_description: "Temporary finding",
        severity: "LOW",
      }),
    });
    assert.equal(finding.status, 201);

    const action = await request(`/incidents/actions`, {
      method: "POST",
      body: JSON.stringify({
        incident_id: incident.body.incident_id,
        action_description: "Temporary corrective action",
      }),
    });
    assert.equal(action.status, 201);

    assert.equal((await request(`/findings/inspection/${inspection.body.inspection_id}`)).status, 200);
    assert.equal((await request(`/incidents/${incident.body.incident_id}/actions`)).status, 200);
    assert.equal((await request("/emergency/contacts")).status, 200);
    assert.equal((await request("/emergency/procedures")).status, 200);
    assert.equal((await request("/compliance")).status, 200);
  } finally {
    assert.equal((await request(`/inspections/${inspection.body.inspection_id}`, { method: "DELETE" })).status, 200);
    assert.equal((await request(`/incidents/${incident.body.incident_id}`, { method: "DELETE" })).status, 200);
  }
});
