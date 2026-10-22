# Stage 3B read-only parity report

**Scope:** Direct comparison of the current PostgreSQL business tables with the corresponding MongoDB collections. PostgreSQL queries ran in a `READ ONLY` transaction and were rolled back. MongoDB queries were find-only. No records, counters, indexes, containers, volumes, or Compose configuration were changed. Password hashes and PDF contents were not included in the report.

## Results

| Table / collection | PostgreSQL | MongoDB | ID or business-field differences |
|---|---:|---:|---|
| roles | 5 | 5 | None |
| users | 1 | 1 | None |
| chemicals | 2 | 2 | None |
| chemical_storage | 1 | 1 | None |
| inspections | 2 | 2 | None |
| inspection_findings | 2 | 2 | None |
| incidents | 2 | 2 | None |
| incident_actions | 1 | 1 | None |
| emergency_contacts | 1 | 1 | None |
| emergency_procedures | 1 | 1 | None |
| compliance_records | 1 | 1 | None |
| compliance_documents | 1 | 1 | None |
| process_readings | 1 | 1 | None |
| safety_alerts | 0 | 0 | None |
| **Total** | **21** | **21** | **None** |

- Numeric IDs matched across all records. No missing or extra IDs, duplicate IDs, invalid IDs, duplicate role names, or duplicate user emails were found.
- No dangling references were found for roles, users, chemicals, inspections, incidents, compliance records, process readings, or their dependent records.
- Nullable fields matched, including null-versus-value checks. No business-field mismatches were found. User password hashes were compared in memory using a transient keyed digest; the values and digests were not reported. One nonempty hash was present in each database.
- SQL `DATE` fields matched MongoDB calendar dates. MongoDB date-only values were canonical UTC-midnight dates; no date-only mismatch or noncanonical value was found.
- Storage quantity/capacity values and process readings matched PostgreSQL at their declared scales of two and four decimal places. MongoDB stores these fields as BSON numbers.
- Timestamp wall-clock representations matched under a UTC interpretation. PostgreSQL reports session timezone `Asia/Calcutta`, but `TIMESTAMP` columns have no timezone. The historical timezone convention used when these values were migrated cannot be established from the current database session, so their absolute-instant semantics remain unverified.

## Counter check

Thirteen counters matched the maximum numeric ID in their collections. The `safety_alerts` collection is empty and has no counter document; therefore its current maximum is zero and no existing ID is at risk. The safe allocator can initialize a missing counter on first use. No counter was created or updated during this check.

## Limits and disposition

Compliance document metadata matched; PDF file contents and file presence were not inspected. This check did not inspect MongoDB index definitions. Timestamp semantics remain uncertain as described above, and the missing empty-collection counter is recorded for review.

The parity gate stops here. Stage 3B.1 has not started; no reconciliation or other follow-up change was performed.
