import Inspection from "../models/inspection.js";
import InspectionFinding from "../models/finding.js";
import { getNextId } from "../models/counter.js";
import { serializeDateOnlyFields } from "../models/serializers.js";
import { parseSqlDate } from "../models/dateOnly.js";
import { withInspectionFindingLock } from "./inspectionService.js";

export interface FindingInput {
  inspection_id: number;
  finding_description: string;
  severity: string;
  corrective_action?: string | null;
  due_date?: string | null;
  status?: string;
}

interface FindingRecord {
  finding_id: number;
  inspection_id: number;
  finding_description: string;
  severity: string;
  corrective_action?: string | null;
  due_date?: Date | string | null;
  status: string;
  created_at: Date | string;
}

interface InspectionJoinRecord {
  inspection_id: number;
  area: string;
  inspection_date: Date | string;
}

const serializeFinding = (value: unknown) => {
  const record = serializeDateOnlyFields(value) as unknown as FindingRecord;
  return {
    finding_id: record.finding_id,
    inspection_id: record.inspection_id,
    finding_description: record.finding_description,
    severity: record.severity,
    corrective_action: record.corrective_action ?? null,
    due_date: record.due_date ?? null,
    status: record.status,
    created_at: record.created_at,
  };
};

const serializeJoinedFinding = (finding: unknown, inspection: InspectionJoinRecord) => {
  const serialized = serializeFinding(finding);
  const serializedInspection = serializeDateOnlyFields(inspection);
  return {
    finding_id: serialized.finding_id,
    inspection_id: serialized.inspection_id,
    inspection_area: inspection.area,
    inspection_date: serializedInspection.inspection_date,
    finding_description: serialized.finding_description,
    severity: serialized.severity,
    corrective_action: serialized.corrective_action,
    due_date: serialized.due_date,
    status: serialized.status,
    created_at: serialized.created_at,
  };
};

const inspectionsById = async (inspectionIds: number[]) => {
  const uniqueIds = [...new Set(inspectionIds)];
  if (uniqueIds.length === 0) {
    return new Map<number, InspectionJoinRecord>();
  }

  const inspections = await Inspection.find({ inspection_id: { $in: uniqueIds } })
    .select({ inspection_id: 1, area: 1, inspection_date: 1, _id: 0 })
    .lean<InspectionJoinRecord[]>()
    .exec();
  return new Map(inspections.map((inspection) => [inspection.inspection_id, inspection]));
};

// GET all findings (PostgreSQL INNER JOIN inspections, ordered newest first).
export const getAllFindings = async () => {
  const findings = await InspectionFinding.find({})
    .sort({ finding_id: -1 })
    .lean<FindingRecord[]>()
    .exec();
  const inspections = await inspectionsById(findings.map(({ inspection_id }) => inspection_id));

  return findings.flatMap((finding) => {
    const inspection = inspections.get(finding.inspection_id);
    return inspection ? [serializeJoinedFinding(finding, inspection)] : [];
  });
};

// The PostgreSQL endpoint returned finding columns only, without inspection join fields.
export const getFindingsByInspectionId = async (inspectionId: number) => {
  const findings = await InspectionFinding.find({ inspection_id: inspectionId })
    .sort({ finding_id: -1 })
    .lean<FindingRecord[]>()
    .exec();
  return findings.map(serializeFinding);
};

// GET one finding (PostgreSQL INNER JOIN inspections).
export const getFindingById = async (id: number) => {
  const finding = await InspectionFinding.findOne({ finding_id: id })
    .lean<FindingRecord>()
    .exec();
  if (!finding) {
    return undefined;
  }

  const inspections = await inspectionsById([finding.inspection_id]);
  const inspection = inspections.get(finding.inspection_id);
  return inspection ? serializeJoinedFinding(finding, inspection) : undefined;
};

export const createFinding = async (data: FindingInput) =>
  withInspectionFindingLock(async () => {
    const inspectionExists = await Inspection.exists({ inspection_id: data.inspection_id });
    if (!inspectionExists) {
      throw new Error("Referenced inspection does not exist");
    }

    const findingId = await getNextId("inspection_findings");
    const finding = await InspectionFinding.create({
      finding_id: findingId,
      inspection_id: data.inspection_id,
      finding_description: data.finding_description,
      severity: data.severity,
      corrective_action: data.corrective_action ?? null,
      due_date: data.due_date == null ? null : parseSqlDate(data.due_date),
      status: data.status ?? "OPEN",
    });

    return serializeFinding(finding);
  });

export const updateFinding = async (id: number, data: FindingInput) =>
  withInspectionFindingLock(async () => {
    const existing = await InspectionFinding.exists({ finding_id: id });
    if (!existing) {
      return undefined;
    }

    const inspectionExists = await Inspection.exists({ inspection_id: data.inspection_id });
    if (!inspectionExists) {
      throw new Error("Referenced inspection does not exist");
    }

    const finding = await InspectionFinding.findOneAndUpdate(
      { finding_id: id },
      {
        $set: {
          inspection_id: data.inspection_id,
          finding_description: data.finding_description,
          severity: data.severity,
          corrective_action: data.corrective_action ?? null,
          due_date: data.due_date == null ? null : parseSqlDate(data.due_date),
          status: data.status ?? "OPEN",
        },
      },
      { returnDocument: "after", runValidators: true }
    ).exec();

    return finding ? serializeFinding(finding) : undefined;
  });

export const deleteFinding = async (id: number) => {
  const finding = await InspectionFinding.findOneAndDelete({ finding_id: id }).exec();
  return finding ? serializeFinding(finding) : undefined;
};
