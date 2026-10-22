import { DATE_ONLY_FIELDS, serializeSqlDate } from "./dateOnly.js";
import { stripMongoMetadata } from "./modelOptions.js";

type PlainRecord = Record<string, unknown>;

/** Normalize both hydrated documents and lean/plain query results. */
export const toPlainRecord = (value: unknown): PlainRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Expected a MongoDB document or plain record");
  }

  const document = value as { toObject?: (options?: object) => unknown };
  const plain = typeof document.toObject === "function"
    ? document.toObject({ transform: false, getters: false, virtuals: false })
    : value;

  if (typeof plain !== "object" || plain === null || Array.isArray(plain)) {
    throw new TypeError("MongoDB document did not serialize to a record");
  }

  return stripMongoMetadata(plain as PlainRecord);
};

const decimalParts = (input: number | string): { negative: boolean; digits: bigint; scale: number } => {
  if (typeof input === "number" && !Number.isFinite(input)) {
    throw new RangeError("Numeric value must be finite");
  }

  const source = String(input);
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(source);
  if (!match || source.length > 256) {
    throw new TypeError(`Invalid numeric value: ${source}`);
  }

  const exponent = Number(match[4] ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 256) {
    throw new RangeError("Numeric exponent is outside the supported range");
  }

  const fraction = match[3] ?? "";
  let digits = BigInt(`${match[2]}${fraction}`);
  let scale = fraction.length - exponent;
  if (scale < 0) {
    digits *= 10n ** BigInt(-scale);
    scale = 0;
  }

  return { negative: match[1] === "-", digits, scale };
};

/** Format a numeric(n,s) value using fixed scale and PostgreSQL half-away rounding. */
export const formatPostgresNumeric = (
  input: number | string,
  precision: number,
  scale: number
): string => {
  if (
    !Number.isInteger(precision) ||
    !Number.isInteger(scale) ||
    precision < 1 ||
    scale < 0 ||
    scale > precision
  ) {
    throw new RangeError("Invalid numeric precision or scale");
  }

  const parsed = decimalParts(input);
  let rounded = parsed.digits;
  if (parsed.scale > scale) {
    const divisor = 10n ** BigInt(parsed.scale - scale);
    const remainder = rounded % divisor;
    rounded /= divisor;
    if (remainder * 2n >= divisor) rounded += 1n;
  } else if (parsed.scale < scale) {
    rounded *= 10n ** BigInt(scale - parsed.scale);
  }

  const fixed = rounded.toString().padStart(scale + 1, "0");
  const integerPart = scale === 0 ? fixed : fixed.slice(0, -scale);
  const fractionPart = scale === 0 ? "" : fixed.slice(-scale);
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "");
  if (normalizedInteger.length > precision - scale) {
    throw new RangeError(`Value exceeds NUMERIC(${precision},${scale})`);
  }

  const sign = parsed.negative && rounded !== 0n ? "-" : "";
  return `${sign}${normalizedInteger}${scale === 0 ? "" : `.${fractionPart}`}`;
};

export interface UserApiDto {
  user_id: number;
  role_id: number;
  full_name: string;
  email: string;
  is_active: boolean;
}

/** Allowlist the public user shape used by the current user service. */
export const serializeUserApiDto = (value: unknown): UserApiDto => {
  const record = toPlainRecord(value);
  return {
    user_id: record.user_id as number,
    role_id: record.role_id as number,
    full_name: record.full_name as string,
    email: record.email as string,
    is_active: record.is_active as boolean,
  };
};

export interface ChemicalStorageApiDto {
  storage_id: number;
  chemical_id: number;
  storage_location: string;
  quantity: string;
  unit: string;
  maximum_capacity: string | null;
  updated_at: Date | string;
}

/** Keep PostgreSQL NUMERIC response values as two-decimal strings. */
export const serializeChemicalStorageApiDto = (value: unknown): ChemicalStorageApiDto => {
  const record = toPlainRecord(value);
  const maximumCapacity = record.maximum_capacity;
  return {
    storage_id: record.storage_id as number,
    chemical_id: record.chemical_id as number,
    storage_location: record.storage_location as string,
    quantity: formatPostgresNumeric(record.quantity as number | string, 12, 2),
    unit: record.unit as string,
    maximum_capacity: maximumCapacity === null
      ? null
      : formatPostgresNumeric(maximumCapacity as number | string, 12, 2),
    updated_at: record.updated_at as Date | string,
  };
};

export interface ProcessReadingApiDto {
  reading_id: number;
  metric_name: string;
  value: string;
  unit: string;
  source: string;
  recorded_at: Date | string;
}

/** Keep PostgreSQL NUMERIC response values as four-decimal strings. */
export const serializeProcessReadingApiDto = (value: unknown): ProcessReadingApiDto => {
  const record = toPlainRecord(value);
  return {
    reading_id: record.reading_id as number,
    metric_name: record.metric_name as string,
    value: formatPostgresNumeric(record.value as number | string, 14, 4),
    unit: record.unit as string,
    source: record.source as string,
    recorded_at: record.recorded_at as Date | string,
  };
};

/** Normalize SQL DATE fields while preserving every timestamp field as an instant. */
export const serializeDateOnlyFields = (value: unknown): PlainRecord => {
  const record = toPlainRecord(value);
  for (const field of DATE_ONLY_FIELDS) {
    if (field in record && record[field] !== null && record[field] !== undefined) {
      record[field] = serializeSqlDate(record[field] as Date | string);
    }
  }
  return record;
};
