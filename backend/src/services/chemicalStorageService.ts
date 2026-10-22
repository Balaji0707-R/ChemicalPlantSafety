import Chemical from "../models/chemical.js";
import ChemicalStorage from "../models/chemicalStorage.js";
import { getNextId } from "../models/counter.js";
import {
  formatPostgresNumeric,
  serializeChemicalStorageApiDto,
  toPlainRecord,
} from "../models/serializers.js";
import { withChemicalReferenceLock } from "./chemicalService.js";

export interface ChemicalStorageInput {
  chemical_id: number;
  storage_location: string;
  quantity: number;
  unit: string;
  maximum_capacity?: number | null;
}

type ChemicalStorageValues = Omit<ChemicalStorageInput, "chemical_id">;

const normalizeStorageValues = (data: ChemicalStorageValues) => {
  if (!Number.isFinite(data.quantity) || data.quantity < 0) {
    throw new RangeError("Quantity must be a nonnegative number");
  }

  if (
    data.maximum_capacity !== null &&
    data.maximum_capacity !== undefined &&
    (!Number.isFinite(data.maximum_capacity) || data.maximum_capacity < 0)
  ) {
    throw new RangeError("Maximum capacity must be a nonnegative number or null");
  }

  if (
    data.maximum_capacity !== null &&
    data.maximum_capacity !== undefined &&
    data.maximum_capacity < data.quantity
  ) {
    throw new RangeError("Maximum capacity cannot be less than quantity");
  }

  const quantity = Number(formatPostgresNumeric(data.quantity, 12, 2));
  const maximumCapacity = data.maximum_capacity === null || data.maximum_capacity === undefined
    ? null
    : Number(formatPostgresNumeric(data.maximum_capacity, 12, 2));

  if (maximumCapacity !== null && maximumCapacity < quantity) {
    throw new RangeError("Maximum capacity cannot be less than quantity");
  }

  return {
    storage_location: data.storage_location,
    quantity,
    unit: data.unit,
    maximum_capacity: maximumCapacity,
  };
};

const serializeStorage = (value: unknown) => {
  const record = toPlainRecord(value);
  return serializeChemicalStorageApiDto({
    ...record,
    // SQL nullable columns are returned as null even when a legacy document omitted the field.
    maximum_capacity: record.maximum_capacity ?? null,
  });
};

export const getStorageByChemical = async (chemicalId: number) => {
  const records = await ChemicalStorage.find({ chemical_id: chemicalId })
    .sort({ storage_id: -1 })
    .exec();
  return records.map(serializeStorage);
};

export const createStorage = async (data: ChemicalStorageInput) => {
  const values = normalizeStorageValues(data);

  return withChemicalReferenceLock(data.chemical_id, async () => {
    const chemicalExists = await Chemical.exists({ chemical_id: data.chemical_id });
    if (!chemicalExists) {
      throw new Error("Referenced chemical does not exist");
    }

    const storageId = await getNextId("chemical_storage");
    const record = await ChemicalStorage.create({
      storage_id: storageId,
      chemical_id: data.chemical_id,
      ...values,
    });
    return serializeStorage(record);
  });
};

export const updateStorage = async (
  id: number,
  data: ChemicalStorageValues
) => {
  const values = normalizeStorageValues(data);
  const record = await ChemicalStorage.findOneAndUpdate(
    { storage_id: id },
    {
      $set: {
        ...values,
        updated_at: new Date(),
      },
    },
    { returnDocument: "after", runValidators: true }
  ).exec();
  return record ? serializeStorage(record) : null;
};

export const deleteStorage = async (id: number) => {
  const record = await ChemicalStorage.findOneAndDelete({ storage_id: id }).exec();
  return record ? { storage_id: record.storage_id } : null;
};
