import Chemical from "../models/chemical.js";
import ChemicalStorage from "../models/chemicalStorage.js";
import { getNextId } from "../models/counter.js";

export interface ChemicalInput {
  chemical_name: string;
  cas_number?: string;
  hazard_class?: string;
  physical_state?: string;
  description?: string;
}

const chemicalReferenceLocks = new Map<number, Promise<void>>();

/** Serialize storage creation and chemical deletion for one chemical in this API process. */
export const withChemicalReferenceLock = async <T>(
  chemicalId: number,
  operation: () => Promise<T>
): Promise<T> => {
  const previous = chemicalReferenceLocks.get(chemicalId) ?? Promise.resolve();
  let releaseCurrent!: () => void;
  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  const tail = previous.then(() => current);
  chemicalReferenceLocks.set(chemicalId, tail);

  await previous;
  try {
    return await operation();
  } finally {
    releaseCurrent();
    if (chemicalReferenceLocks.get(chemicalId) === tail) {
      chemicalReferenceLocks.delete(chemicalId);
    }
  }
};

export const getAllChemicals = async () =>
  Chemical.find({}).sort({ chemical_id: -1 }).exec();

export const getChemicalById = async (id: number) =>
  Chemical.findOne({ chemical_id: id }).exec();

export const createChemical = async (data: ChemicalInput) => {
  const chemicalId = await getNextId("chemicals");
  return Chemical.create({
    chemical_id: chemicalId,
    chemical_name: data.chemical_name,
    cas_number: data.cas_number ?? null,
    hazard_class: data.hazard_class ?? null,
    physical_state: data.physical_state ?? null,
    description: data.description ?? null,
  });
};

export const updateChemical = async (id: number, data: ChemicalInput) =>
  Chemical.findOneAndUpdate(
    { chemical_id: id },
    {
      $set: {
        chemical_name: data.chemical_name,
        cas_number: data.cas_number ?? null,
        hazard_class: data.hazard_class ?? null,
        physical_state: data.physical_state ?? null,
        description: data.description ?? null,
      },
    },
    { returnDocument: "after", runValidators: true }
  ).exec();

export const deleteChemical = async (id: number) =>
  withChemicalReferenceLock(id, async () => {
    const chemical = await Chemical.findOne({ chemical_id: id }).exec();
    if (!chemical) {
      return null;
    }

    const hasStorage = await ChemicalStorage.exists({ chemical_id: id });
    if (hasStorage) {
      throw new Error("Chemical cannot be deleted while storage records reference it");
    }

    return Chemical.findOneAndDelete({ chemical_id: id }).exec();
  });
