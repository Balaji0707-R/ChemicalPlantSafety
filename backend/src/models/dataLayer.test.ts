import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { parseSqlDate, serializeSqlDate } from "./dateOnly.js";
import User from "./user.js";
import {
  formatPostgresNumeric,
  serializeChemicalStorageApiDto,
  serializeDateOnlyFields,
  serializeProcessReadingApiDto,
  serializeUserApiDto,
} from "./serializers.js";

const localRequire = createRequire(__filename);
const migrationImport = localRequire(
  resolve(__dirname, "../../../migration-backup/import-to-mongodb.cjs")
) as {
  convertRecord: (collectionName: string, record: Record<string, unknown>) => Record<string, unknown>;
};

test("password hashes are excluded from user documents and the public DTO", () => {
  assert.equal(User.schema.path("password_hash").options.select, false);

  const user = new User({
    user_id: 7,
    role_id: 2,
    full_name: "Test User",
    email: "user@example.invalid",
    password_hash: "must-not-leak",
    is_active: true,
  });

  assert.equal("password_hash" in user.toJSON(), false);
  assert.equal("password_hash" in user.toObject(), false);
  assert.equal("_id" in user.toJSON(), false);
  assert.equal("__v" in user.toJSON(), false);

  const dto = serializeUserApiDto({
    _id: "mongo-id",
    __v: 3,
    user_id: 7,
    role_id: 2,
    full_name: "Test User",
    email: "user@example.invalid",
    password_hash: "must-not-leak",
    is_active: true,
    created_at: new Date("2026-01-02T00:00:00.000Z"),
  });
  assert.deepEqual(dto, {
    user_id: 7,
    role_id: 2,
    full_name: "Test User",
    email: "user@example.invalid",
    is_active: true,
  });
});

test("numeric formatting matches PostgreSQL fixed-scale response strings", () => {
  assert.equal(formatPostgresNumeric("10.10", 12, 2), "10.10");
  assert.equal(formatPostgresNumeric(10.1, 12, 2), "10.10");
  assert.equal(formatPostgresNumeric("1.005", 12, 2), "1.01");
  assert.equal(formatPostgresNumeric("-1.005", 12, 2), "-1.01");
  assert.equal(formatPostgresNumeric("1.23455", 14, 4), "1.2346");
  assert.equal(formatPostgresNumeric("1e-4", 14, 4), "0.0001");
  assert.throws(() => formatPostgresNumeric("10000000000.00", 12, 2), /NUMERIC/);

  const storage = serializeChemicalStorageApiDto({
    _id: "mongo-id",
    __v: 5,
    storage_id: 4,
    chemical_id: 8,
    storage_location: "Tank A",
    quantity: 10.1,
    unit: "L",
    maximum_capacity: null,
    updated_at: new Date("2026-01-02T03:04:05.000Z"),
  });
  assert.equal(storage.quantity, "10.10");
  assert.equal(storage.maximum_capacity, null);
  assert.equal("_id" in storage, false);
  assert.equal("__v" in storage, false);

  const reading = serializeProcessReadingApiDto({
    _id: "mongo-id",
    __v: 2,
    reading_id: 11,
    metric_name: "pressure",
    value: 1.23,
    unit: "bar",
    source: "sensor",
    recorded_at: new Date("2026-01-02T03:04:05.000Z"),
  });
  assert.equal(reading.value, "1.2300");
  assert.equal("_id" in reading, false);
  assert.equal("__v" in reading, false);
});

test("date-only values stay distinct from timestamps in lean records", () => {
  const timestamp = new Date("2026-01-02T03:04:05.678Z");
  const serialized = serializeDateOnlyFields({
    _id: "mongo-id",
    __v: 6,
    inspection_date: new Date("2026-01-02T00:00:00.000Z"),
    created_at: timestamp,
    due_date: null,
  });

  assert.equal(serialized.inspection_date, "2026-01-02T00:00:00.000Z");
  assert.equal(serialized.created_at, timestamp);
  assert.equal((serialized.created_at as Date).toISOString(), "2026-01-02T03:04:05.678Z");
  assert.equal(serialized.due_date, null);
  assert.equal("_id" in serialized, false);
  assert.equal("__v" in serialized, false);
});

test("SQL DATE parsing validates calendar dates and UTC-midnight storage", () => {
  assert.equal(parseSqlDate("2024-02-29").toISOString(), "2024-02-29T00:00:00.000Z");
  assert.equal(serializeSqlDate("2024-02-29"), "2024-02-29T00:00:00.000Z");
  assert.throws(() => parseSqlDate("2023-02-29"), /Invalid SQL DATE/);
  assert.throws(() => parseSqlDate("2024-02-29T00:00:00.000Z"), /YYYY-MM-DD/);
  assert.throws(
    () => serializeSqlDate(new Date("2024-02-29T00:00:00.001Z")),
    /UTC midnight/
  );
});

test("date-only Mongo mapping is stable in non-UTC process timezones", () => {
  const dateOnlyModule = resolve(__dirname, "dateOnly.ts");
  const source = [
    `const { parseSqlDate, serializeSqlDate } = require(${JSON.stringify(dateOnlyModule)});`,
    "const result = serializeSqlDate(parseSqlDate('2024-03-31'));",
    "if (result !== '2024-03-31T00:00:00.000Z') process.exit(2);",
    "process.stdout.write(result);",
  ].join("\n");

  for (const timezone of ["Asia/Kolkata", "America/Los_Angeles"]) {
    const child = spawnSync(process.execPath, ["-r", "tsx/cjs", "-e", source], {
      cwd: resolve(__dirname, "../.."),
      encoding: "utf8",
      env: { ...process.env, TZ: timezone },
    });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout, "2024-03-31T00:00:00.000Z");
  }
});

test("migration conversion keeps SQL DATE and timestamp parsing separate", () => {
  const converted = migrationImport.convertRecord("inspections", {
    inspection_date: "2024-03-31",
    created_at: "2024-03-31T14:15:16.000Z",
  });
  assert.equal((converted.inspection_date as Date).toISOString(), "2024-03-31T00:00:00.000Z");
  assert.equal((converted.created_at as Date).toISOString(), "2024-03-31T14:15:16.000Z");
  assert.throws(
    () => migrationImport.convertRecord("inspections", { inspection_date: "2024-03-30T18:30:00.000Z" }),
    /SQL DATE YYYY-MM-DD/
  );
  assert.throws(
    () => migrationImport.convertRecord("inspections", { created_at: "2024-03-31T14:15:16" }),
    /timestamp with timezone/
  );
});
