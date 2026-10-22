# PostgreSQL date and numeric response mapping

## SQL DATE fields

The PostgreSQL `DATE` fields are:

- `inspections.inspection_date`
- `inspection_findings.due_date`
- `incident_actions.due_date`
- `compliance_records.issue_date`
- `compliance_records.expiry_date`

Migration input for these fields must be the date-only string `YYYY-MM-DD`. It is
stored in MongoDB as a BSON Date at `00:00:00.000 UTC`. API serializers emit the
stable ISO string `YYYY-MM-DDT00:00:00.000Z`. The timezone of the importing or
serving process does not participate in this mapping. Invalid calendar dates and
timestamp-shaped values are rejected instead of silently shifted.

The checked-in PostgreSQL export currently represents these SQL DATE columns as
timezone-bearing ISO timestamps. Those values are ambiguous for date-only data,
so the updated importer refuses them. A future import needs a fresh export that
selects each SQL DATE as text in `YYYY-MM-DD` form; the checked-in export was not
rewritten in this stage.

## Timestamp fields

Timestamp columns remain instants and are not normalized as date-only values.
The import script accepts ISO 8601 timestamps with an explicit `Z` or numeric
offset and stores the corresponding BSON Date. API serializers leave their
timestamps unchanged; JSON serialization emits the instant as an ISO 8601 string.
The legacy PostgreSQL columns use `TIMESTAMP` without time zone, so a source
export must state the timezone it used when producing ISO timestamps. The
available export metadata does not establish that timezone, so the historical
wall-clock interpretation cannot be independently verified here.

## Numeric response fields

PostgreSQL `chemical_storage.quantity` and `maximum_capacity` use
`DECIMAL(12,2)`. Their API serializers emit fixed-scale strings such as
`"10.10"`, matching the `pg` numeric parser. `process_readings.value` uses
`NUMERIC(14,4)` and emits fixed-scale strings such as `"1.2300"`. Nullable
`maximum_capacity` remains JSON `null`. These serializers preserve the existing
string response type and do not change numeric IDs or snake_case field names.

The MongoDB documents currently store these values as BSON numbers; this stage
does not change that storage representation. The API serializers restore the
declared fixed scale at the response boundary. Exact decimal storage and decimal
arithmetic would require a separately approved storage migration.
