export const DATE_ONLY_FIELDS: ReadonlySet<string> = new Set([
  "inspection_date",
  "due_date",
  "issue_date",
  "expiry_date",
]);

const SQL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Map a PostgreSQL DATE string to a BSON Date at UTC midnight. */
export const parseSqlDate = (value: string): Date => {
  const match = SQL_DATE_PATTERN.exec(value);
  if (!match) {
    throw new TypeError(`Expected SQL DATE in YYYY-MM-DD format, received: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new RangeError(`Invalid SQL DATE: ${value}`);
  }

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (date.toISOString().slice(0, 10) !== value) {
    throw new RangeError(`Invalid SQL DATE: ${value}`);
  }

  return date;
};

/** Serialize a BSON Date mapped from SQL DATE as a stable UTC ISO string. */
export const serializeSqlDate = (value: Date | string): string => {
  const date = typeof value === "string" ? parseSqlDate(value) : value;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError("Expected a valid Date for a SQL DATE field");
  }
  if (
    date.getUTCHours() !== 0 ||
    date.getUTCMinutes() !== 0 ||
    date.getUTCSeconds() !== 0 ||
    date.getUTCMilliseconds() !== 0
  ) {
    throw new RangeError("SQL DATE values must be stored at UTC midnight");
  }

  return date.toISOString();
};
