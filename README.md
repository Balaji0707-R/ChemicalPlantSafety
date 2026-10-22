# Chemical Plant Safety System

React/Vite frontend and Express/TypeScript backend for chemical inventory,
storage, inspections, incidents, emergency response, compliance, process
monitoring, anomaly alerts, and role-protected operations.

## Local Windows startup

1. Preserve the existing PostgreSQL database and copy the existing local
   configuration into `backend/.env`. Do not commit that file.
2. From `backend`:

   ```powershell
   npm install
   npm run migrate
   npm run dev
   ```

3. In a second terminal, from `frontend`:

   ```powershell
   npm install
   npm run dev
   ```

Open <http://localhost:5173>. The API is available at
<http://localhost:5000/api>; `/api/health` is public.

## Docker Compose deployment

Docker Desktop must be running. The Compose deployment uses the existing
PostgreSQL instance as an external database and starts Redis in Compose.
Provide deployment-time values without committing secrets:

```powershell
$env:DB_HOST = "host.docker.internal"
$env:DB_PORT = "5432"
$env:DB_NAME = "chemical_safety_db"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "<existing database password>"
$env:AUTH_JWT_SECRET = "<deployment secret>"
docker compose build
docker compose up -d
docker compose ps
```

The backend runs the compiled migration before starting. The frontend is
served by nginx at <http://localhost:5173>, the backend at
<http://localhost:5000>, and Redis is reachable only on the internal Compose
network at `redis://redis:6379`.

Stop the Compose services without touching PostgreSQL:

```powershell
docker compose down
```

## API overview

All routes except `/`, `/api/health`, and `/api/auth/login` require the
HttpOnly session cookie. State-changing requests also require the CSRF cookie
and matching `X-CSRF-Token` header.

| Area | Endpoints | Mutating roles |
|---|---|---|
| Authentication | `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` | Authenticated session |
| Chemicals/storage | `/api/chemicals`, `/api/chemicals/:id/storage` | ADMIN, SAFETY_OFFICER, PLANT_MANAGER |
| Inspections/findings | `/api/inspections`, `/api/findings` | ADMIN, SAFETY_OFFICER |
| Incidents/actions | `/api/incidents`, `/api/incidents/actions` | Incident create also EMPLOYEE; updates ADMIN, SAFETY_OFFICER, PLANT_MANAGER |
| Emergency | `/api/emergency/contacts`, `/api/emergency/procedures` | ADMIN, PLANT_MANAGER |
| Compliance/documents | `/api/compliance`, `/api/compliance-documents` | ADMIN, COMPLIANCE_OFFICER |
| Dashboard | `/api/dashboard/stats` | Read for authenticated roles |
| Monitoring | `/api/monitoring/readings`, `/api/monitoring/alerts` | Reading/acknowledgement: ADMIN, SAFETY_OFFICER, PLANT_MANAGER |

Process readings include a source field. Sources beginning with `synthetic`,
`simulated`, or equivalent are persisted with a `SIMULATED:` prefix and shown
as simulated in the UI. Alerts are generated transactionally when a reading
is at least three standard deviations from recent readings; severity is
`HIGH` or `CRITICAL`.

## Verification commands

```powershell
Push-Location backend
npm run build
npm run test:auth
npm run test:workflows
Pop-Location

Push-Location frontend
npm run lint
npm run build
Pop-Location
```

See [PROJECT_AUDIT.md](./PROJECT_AUDIT.md) for dated results, browser
verification, deployment status, known external blockers, and the active
role/account limitations.
