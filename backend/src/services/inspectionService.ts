import Inspection from "../models/inspection.js";
import InspectionFinding from "../models/finding.js";
import User from "../models/user.js";
import { getNextId } from "../models/counter.js";
import { serializeDateOnlyFields } from "../models/serializers.js";
import { parseSqlDate } from "../models/dateOnly.js";

export interface InspectionInput {
  inspector_id: number;
  inspection_date: string;
  area: string;
  status?: string;
  remarks?: string | null;
}

interface InspectionRecord {
  inspection_id: number;
  inspector_id: number;
  inspection_date: Date | string;
  area: string;
  status: string;
  remarks?: string | null;
  created_at: Date | string;
}

interface InspectorRecord {
  user_id: number;
  full_name: string;
}

let inspectionFindingQueue = Promise.resolve();

/** Serialize finding reference changes with inspection deletion in this API process. */
export const withInspectionFindingLock = async <T>(operation: () => Promise<T>): Promise<T> => {
  const previous = inspectionFindingQueue;
  let releaseCurrent!: () => void;
  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  inspectionFindingQueue = previous.then(() => current);

  await previous;
  try {
    return await operation();
  } finally {
    releaseCurrent();
  }
};

const serializeInspection = (value: unknown) => {
  const record = serializeDateOnlyFields(value) as unknown as InspectionRecord;
  return {
    inspection_id: record.inspection_id,
    inspector_id: record.inspector_id,
    inspection_date: record.inspection_date,
    area: record.area,
    status: record.status,
    remarks: record.remarks ?? null,
    created_at: record.created_at,
  };
};

const serializeJoinedInspection = (value: unknown, inspectorName: string) => {
  const serialized = serializeInspection(value);
  return {
    inspection_id: serialized.inspection_id,
    inspector_id: serialized.inspector_id,
    inspector_name: inspectorName,
    inspection_date: serialized.inspection_date,
    area: serialized.area,
    status: serialized.status,
    remarks: serialized.remarks,
    created_at: serialized.created_at,
  };
};

const inspectorNamesById = async (inspectorIds: number[]) => {
  const uniqueIds = [...new Set(inspectorIds)];
  if (uniqueIds.length === 0) {
    return new Map<number, string>();
  }

  const inspectors = await User.find({ user_id: { $in: uniqueIds } })
    .select({ user_id: 1, full_name: 1, _id: 0 })
    .lean<InspectorRecord[]>()
    .exec();
  return new Map(inspectors.map(({ user_id, full_name }) => [user_id, full_name]));
};

export const getAllInspections = async () => {
  const inspections = await Inspection.find({})
    .sort({ inspection_id: -1 })
    .lean<InspectionRecord[]>()
    .exec();
  const names = await inspectorNamesById(inspections.map(({ inspector_id }) => inspector_id));

  // The PostgreSQL query used INNER JOIN, so records with no inspector are omitted.
  return inspections.flatMap((inspection) => {
    const inspectorName = names.get(inspection.inspector_id);
    return inspectorName === undefined
      ? []
      : [serializeJoinedInspection(inspection, inspectorName)];
  });
};

export const getInspectionById = async (id: number) => {
  const inspection = await Inspection.findOne({ inspection_id: id })
    .lean<InspectionRecord>()
    .exec();
  if (!inspection) {
    return undefined;
  }

  const names = await inspectorNamesById([inspection.inspector_id]);
  const inspectorName = names.get(inspection.inspector_id);
  return inspectorName === undefined
    ? undefined
    : serializeJoinedInspection(inspection, inspectorName);
};

export const createInspection = async (data: InspectionInput) => {
  const inspectorExists = await User.exists({ user_id: data.inspector_id });
  if (!inspectorExists) {
    throw new Error("Referenced inspector does not exist");
  }

  const inspectionId = await getNextId("inspections");
  const inspection = await Inspection.create({
    inspection_id: inspectionId,
    inspector_id: data.inspector_id,
    inspection_date: parseSqlDate(data.inspection_date),
    area: data.area,
    status: data.status ?? "SCHEDULED",
    remarks: data.remarks ?? null,
  });

  return serializeInspection(inspection);
};

export const updateInspection = async (id: number, data: InspectionInput) => {
  const existing = await Inspection.exists({ inspection_id: id });
  if (!existing) {
    return undefined;
  }

  const inspectorExists = await User.exists({ user_id: data.inspector_id });
  if (!inspectorExists) {
    throw new Error("Referenced inspector does not exist");
  }

  const inspection = await Inspection.findOneAndUpdate(
    { inspection_id: id },
    {
      $set: {
        inspector_id: data.inspector_id,
        inspection_date: parseSqlDate(data.inspection_date),
        area: data.area,
        status: data.status ?? "SCHEDULED",
        remarks: data.remarks ?? null,
      },
    },
    { returnDocument: "after", runValidators: true }
  ).exec();

  return inspection ? serializeInspection(inspection) : undefined;
};

export const deleteInspection = async (id: number) =>
  withInspectionFindingLock(async () => {
    const existing = await Inspection.findOne({ inspection_id: id })
      .lean<InspectionRecord>()
      .exec();
    if (!existing) {
      return undefined;
    }

    // PostgreSQL declares ON DELETE CASCADE. Delete children first so a failed
    // parent deletion cannot leave finding documents with a missing inspection.
    await InspectionFinding.deleteMany({ inspection_id: id }).exec();
    const deleted = await Inspection.findOneAndDelete({ inspection_id: id }).exec();
    return deleted ? serializeInspection(deleted) : undefined;
  });
