const fs = require("node:fs");
const mongoose = require("../backend/node_modules/mongoose");

const exportPath = "./migration-backup/postgres-export.json";
const uri = "mongodb://127.0.0.1:27017/chemical_safety_db";

const sqlDateFields = new Set([
  "inspection_date", "due_date", "issue_date", "expiry_date"
]);

const timestampFields = new Set([
  "created_at", "updated_at", "incident_date", "completed_at",
  "uploaded_at", "recorded_at", "acknowledged_at"
]);

const numericFields = new Set([
  "quantity", "maximum_capacity", "value"
]);

function parseSqlDate(value, collectionName, field) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(
      `Expected ${collectionName}.${field} as SQL DATE YYYY-MM-DD; re-export date-only fields without a timezone`
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    year < 1 || month < 1 || month > 12 || day < 1 || day > 31 ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`Invalid SQL DATE in ${collectionName}.${field}`);
  }
  return date;
}

function parseTimestamp(value, collectionName, field) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error(
      `Expected ${collectionName}.${field} as an ISO 8601 timestamp with timezone`
    );
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp in ${collectionName}.${field}`);
  }
  return date;
}

function convertRecord(collectionName, record) {
  const document = { ...record };
  for (const [field, value] of Object.entries(document)) {
    if (value === null || value === undefined) continue;

    if (sqlDateFields.has(field) && typeof value === "string") {
      document[field] = parseSqlDate(value, collectionName, field);
    } else if (sqlDateFields.has(field)) {
      throw new Error(`Invalid SQL DATE in ${collectionName}.${field}`);
    }

    if (timestampFields.has(field) && typeof value === "string") {
      document[field] = parseTimestamp(value, collectionName, field);
    } else if (timestampFields.has(field)) {
      throw new Error(`Invalid timestamp in ${collectionName}.${field}`);
    }

    if (numericFields.has(field) && typeof value === "string") {
      const number = Number(value);
      if (!Number.isFinite(number)) {
        throw new Error(`Invalid number in ${collectionName}.${field}`);
      }
      document[field] = number;
    }
  }
  return document;
}

async function main() {
  const raw = fs.readFileSync(exportPath, "utf8").replace(/^\uFEFF/, "");
  const data = JSON.parse(raw);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;

  if (!db) throw new Error("MongoDB database handle unavailable");

  const existing = await db.listCollections().toArray();
  if (existing.length > 0) {
    throw new Error(
      "Import stopped: MongoDB is not empty. No records were imported."
    );
  }

  for (const [collectionName, records] of Object.entries(data)) {
    if (!Array.isArray(records) || records.length === 0) {
      console.log(`${collectionName}: 0 records (skipped)`);
      continue;
    }

    const converted = records.map((record) => convertRecord(collectionName, record));

    await db.collection(collectionName).insertMany(converted);
    console.log(`${collectionName}: imported ${converted.length} records`);
  }

  console.log("Import completed.");
}

module.exports = { convertRecord, parseSqlDate, parseTimestamp };

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("Import failed:", error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

