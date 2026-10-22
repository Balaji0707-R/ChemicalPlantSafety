import Incident from "../models/incident.js";
import IncidentAction from "../models/incidentAction.js";
import User from "../models/user.js";
import { getNextId } from "../models/counter.js";
import { parseSqlDate } from "../models/dateOnly.js";
import { serializeDateOnlyFields, toPlainRecord } from "../models/serializers.js";

export interface IncidentInput {
  reported_by: number;
  incident_type: string;
  severity: string;
  location: string;
  incident_date: string;
  description: string;
  status?: string;
}

export interface IncidentActionInput {
  incident_id: number;
  action_description: string;
  assigned_to?: number | null;
  due_date?: string | null;
  status?: string;
}

interface IncidentRecord {
  incident_id: number;
  reported_by: number;
  incident_type: string;
  severity: string;
  location: string;
  incident_date: Date | string;
  description: string;
  status: string;
  created_at: Date | string;
}

interface IncidentActionRecord {
  action_id: number;
  incident_id: number;
  action_description: string;
  assigned_to: number | null;
  due_date: Date | string | null;
  status: string;
  completed_at: Date | string | null;
}

interface UserNameRecord {
  user_id: number;
  full_name: string;
}

const INCIDENT_DATE_TIME_LOCAL =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?$/;
const INCIDENT_DATE_TIME_WITH_ZONE =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?)(Z|[+-]\d{2}:\d{2})$/;
const INDIA_OFFSET_MINUTES = 5 * 60 + 30;

const makeUtcWallTime = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number
): number => {
  if (
    year < 1 || year > 9999 ||
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    hour > 23 || minute > 59 || second > 59
  ) {
    throw new RangeError("Invalid incident_date");
  }

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millisecond);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second ||
    date.getUTCMilliseconds() !== millisecond
  ) {
    throw new RangeError("Invalid incident_date");
  }
  return date.getTime();
};

/**
 * Parse an incident timestamp submitted by the frontend. Its datetime-local
 * values have no timezone, so they are interpreted as Asia/Calcutta wall time.
 * Explicitly zoned ISO timestamps remain accepted as absolute instants.
 */
export const parseIncidentDateTime = (value: string): Date => {
  if (typeof value !== "string") {
    throw new TypeError("incident_date must be a timestamp string");
  }

  const local = INCIDENT_DATE_TIME_LOCAL.exec(value);
  if (local) {
    const fraction = local[7] ?? "";
    const wallTime = makeUtcWallTime(
      Number(local[1]),
      Number(local[2]),
      Number(local[3]),
      Number(local[4]),
      Number(local[5]),
      Number(local[6] ?? 0),
      Number((fraction + "000").slice(0, 3))
    );
    return new Date(wallTime - INDIA_OFFSET_MINUTES * 60_000);
  }

  const zoned = INCIDENT_DATE_TIME_WITH_ZONE.exec(value);
  if (zoned) {
    const wall = INCIDENT_DATE_TIME_LOCAL.exec(zoned[1]);
    if (!wall) {
      throw new TypeError("incident_date must be an ISO timestamp");
    }
    const fraction = wall[7] ?? "";
    makeUtcWallTime(
      Number(wall[1]),
      Number(wall[2]),
      Number(wall[3]),
      Number(wall[4]),
      Number(wall[5]),
      Number(wall[6] ?? 0),
      Number((fraction + "000").slice(0, 3))
    );
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new TypeError("incident_date must be a valid ISO timestamp");
    }
    return date;
  }

  throw new TypeError("incident_date must be datetime-local or an ISO timestamp with timezone");
};

const serializeIncident = (value: unknown) => {
  const record = toPlainRecord(value);
  return {
    incident_id: record.incident_id as number,
    reported_by: record.reported_by as number,
    incident_type: record.incident_type as string,
    severity: record.severity as string,
    location: record.location as string,
    incident_date: record.incident_date as Date | string,
    description: record.description as string,
    status: record.status as string,
    created_at: record.created_at as Date | string,
  };
};

const serializeJoinedIncident = (value: unknown, reporterName: string) => {
  const incident = serializeIncident(value);
  return {
    incident_id: incident.incident_id,
    reported_by: incident.reported_by,
    reporter_name: reporterName,
    incident_type: incident.incident_type,
    severity: incident.severity,
    location: incident.location,
    incident_date: incident.incident_date,
    description: incident.description,
    status: incident.status,
    created_at: incident.created_at,
  };
};

const serializeIncidentAction = (value: unknown) => {
  const record = serializeDateOnlyFields(value);
  return {
    action_id: record.action_id as number,
    incident_id: record.incident_id as number,
    action_description: record.action_description as string,
    assigned_to: (record.assigned_to ?? null) as number | null,
    due_date: (record.due_date ?? null) as string | null,
    status: record.status as string,
    completed_at: (record.completed_at ?? null) as Date | string | null,
  };
};

const serializeJoinedIncidentAction = (value: unknown, assigneeName: string | null) => {
  const action = serializeIncidentAction(value);
  return {
    action_id: action.action_id,
    incident_id: action.incident_id,
    action_description: action.action_description,
    assigned_to: action.assigned_to,
    assigned_to_name: assigneeName,
    due_date: action.due_date,
    status: action.status,
    completed_at: action.completed_at,
  };
};

const incidentNamesById = async (userIds: number[]) => {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) {
    return new Map<number, string>();
  }
  const users = await User.find({ user_id: { $in: uniqueIds } })
    .select({ user_id: 1, full_name: 1, _id: 0 })
    .lean<UserNameRecord[]>()
    .exec();
  return new Map(users.map(({ user_id, full_name }) => [user_id, full_name]));
};

const serializeIncidentList = async (records: IncidentRecord[]) => {
  const reporterNames = await incidentNamesById(records.map(({ reported_by }) => reported_by));
  return records.flatMap((record) => {
    const reporterName = reporterNames.get(record.reported_by);
    // PostgreSQL used an INNER JOIN, so records with a missing reporter are omitted.
    return reporterName === undefined ? [] : [serializeJoinedIncident(record, reporterName)];
  });
};

const serializeActionList = async (records: IncidentActionRecord[]) => {
  const assigneeIds = records.flatMap(({ assigned_to }) =>
    assigned_to == null ? [] : [assigned_to]
  );
  const assigneeNames = await incidentNamesById(assigneeIds);
  return records.map((record) => serializeJoinedIncidentAction(
    record,
    record.assigned_to == null ? null : assigneeNames.get(record.assigned_to) ?? null
  ));
};

const requireUserReference = async (userId: number, field: string): Promise<void> => {
  if (!await User.exists({ user_id: userId })) {
    throw new Error(`${field} must reference an existing user`);
  }
};

const requireIncidentReference = async (incidentId: number): Promise<void> => {
  if (!await Incident.exists({ incident_id: incidentId })) {
    throw new Error("incident_id must reference an existing incident");
  }
};

let incidentActionQueue = Promise.resolve();

/** Serialize action reference changes with the incident cascade delete. */
const withIncidentActionLock = async <T>(operation: () => Promise<T>): Promise<T> => {
  const previous = incidentActionQueue;
  let releaseCurrent!: () => void;
  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  incidentActionQueue = previous.then(() => current);

  await previous;
  try {
    return await operation();
  } finally {
    releaseCurrent();
  }
};

const restoreActions = async (actions: Record<string, unknown>[]): Promise<void> => {
  if (actions.length === 0) return;
  await IncidentAction.bulkWrite(actions.map((action) => ({
    replaceOne: {
      filter: { action_id: action.action_id },
      replacement: action,
      upsert: true,
    },
  })));
};

// GET ALL INCIDENTS (PostgreSQL INNER JOIN users, newest ID first).
export const getAllIncidents = async () => {
  const incidents = await Incident.find({})
    .sort({ incident_id: -1 })
    .lean<IncidentRecord[]>()
    .exec();
  return serializeIncidentList(incidents);
};

// GET INCIDENT BY ID (same INNER JOIN behavior as the PostgreSQL query).
export const getIncidentById = async (id: number) => {
  const incident = await Incident.findOne({ incident_id: id })
    .lean<IncidentRecord>()
    .exec();
  if (!incident) return undefined;

  const reporter = await User.findOne({ user_id: incident.reported_by })
    .select({ user_id: 1, full_name: 1, _id: 0 })
    .lean<UserNameRecord>()
    .exec();
  return reporter ? serializeJoinedIncident(incident, reporter.full_name) : undefined;
};

// CREATE INCIDENT.
export const createIncident = async (data: IncidentInput) => {
  await requireUserReference(data.reported_by, "reported_by");
  const incident = await Incident.create({
    incident_id: await getNextId("incidents"),
    reported_by: data.reported_by,
    incident_type: data.incident_type,
    severity: data.severity,
    location: data.location,
    incident_date: parseIncidentDateTime(data.incident_date),
    description: data.description,
    status: data.status ?? "OPEN",
    created_at: new Date(),
  });
  return serializeIncident(incident);
};

// UPDATE INCIDENT.
export const updateIncident = async (id: number, data: IncidentInput) => {
  const incident = await Incident.findOne({ incident_id: id }).exec();
  if (!incident) return undefined;

  await requireUserReference(data.reported_by, "reported_by");
  incident.reported_by = data.reported_by;
  incident.incident_type = data.incident_type;
  incident.severity = data.severity;
  incident.location = data.location;
  incident.incident_date = parseIncidentDateTime(data.incident_date);
  incident.description = data.description;
  incident.status = data.status ?? "OPEN";
  await incident.save();
  return serializeIncident(incident);
};

// DELETE INCIDENT. PostgreSQL cascaded its actions in the same statement.
export const deleteIncident = async (id: number) => withIncidentActionLock(async () => {
  const incident = await Incident.findOne({ incident_id: id })
    .lean<IncidentRecord>()
    .exec();
  if (!incident) return undefined;

  const actions = await IncidentAction.find({ incident_id: id }).lean<Record<string, unknown>[]>().exec();
  try {
    await IncidentAction.deleteMany({ incident_id: id }).exec();
    const deletedIncident = await Incident.findOneAndDelete({ incident_id: id })
      .lean<IncidentRecord>()
      .exec();
    if (deletedIncident) return serializeIncident(deletedIncident);

    // A concurrent external delete has already removed the parent; leave its
    // actions deleted to avoid recreating orphans.
    if (await Incident.exists({ incident_id: id })) {
      await restoreActions(actions);
    }
    return undefined;
  } catch (error) {
    try {
      // Compensation is safe only while the incident still exists. If its
      // deletion committed but the response was lost, restoring actions would
      // violate the PostgreSQL cascade semantics by creating orphans.
      if (await Incident.exists({ incident_id: id })) {
        await restoreActions(actions);
      }
    } catch (restoreError) {
      throw new AggregateError(
        [error, restoreError],
        "Incident delete failed and its action rollback could not be confirmed"
      );
    }
    throw error;
  }
});

// GET ALL ACTIONS FOR AN INCIDENT (LEFT JOIN users, newest ID first).
export const getActionsByIncidentId = async (incidentId: number) => {
  const actions = await IncidentAction.find({ incident_id: incidentId })
    .sort({ action_id: -1 })
    .lean<IncidentActionRecord[]>()
    .exec();
  return serializeActionList(actions);
};

// GET ACTION BY ID (LEFT JOIN users).
export const getActionById = async (id: number) => {
  const action = await IncidentAction.findOne({ action_id: id })
    .lean<IncidentActionRecord>()
    .exec();
  if (!action) return undefined;

  const assignee = action.assigned_to == null
    ? null
    : await User.findOne({ user_id: action.assigned_to })
      .select({ user_id: 1, full_name: 1, _id: 0 })
      .lean<UserNameRecord>()
      .exec();
  return serializeJoinedIncidentAction(action, assignee?.full_name ?? null);
};

// CREATE INCIDENT ACTION.
export const createIncidentAction = async (data: IncidentActionInput) =>
  withIncidentActionLock(async () => {
    await requireIncidentReference(data.incident_id);
    if (data.assigned_to != null) {
      await requireUserReference(data.assigned_to, "assigned_to");
    }

    const action = await IncidentAction.create({
      action_id: await getNextId("incident_actions"),
      incident_id: data.incident_id,
      action_description: data.action_description,
      assigned_to: data.assigned_to ?? null,
      due_date: data.due_date == null ? null : parseSqlDate(data.due_date),
      status: data.status ?? "PENDING",
      // PostgreSQL INSERT did not assign completed_at, even for a supplied
      // COMPLETED status. The timestamp is set on a later update transition.
      completed_at: null,
    });
    return serializeIncidentAction(action);
  });

// UPDATE INCIDENT ACTION.
export const updateIncidentAction = async (id: number, data: IncidentActionInput) =>
  withIncidentActionLock(async () => {
    const action = await IncidentAction.findOne({ action_id: id }).exec();
    if (!action) return undefined;

    await requireIncidentReference(data.incident_id);
    if (data.assigned_to != null) {
      await requireUserReference(data.assigned_to, "assigned_to");
    }

    action.incident_id = data.incident_id;
    action.action_description = data.action_description;
    action.assigned_to = data.assigned_to ?? null;
    action.due_date = data.due_date == null ? null : parseSqlDate(data.due_date);
    action.status = data.status ?? "PENDING";
    action.completed_at = action.status === "COMPLETED"
      ? action.completed_at ?? new Date()
      : null;
    await action.save();
    return serializeIncidentAction(action);
  });

// DELETE INCIDENT ACTION.
export const deleteIncidentAction = async (id: number) =>
  withIncidentActionLock(async () => {
    const action = await IncidentAction.findOneAndDelete({ action_id: id })
      .lean<IncidentActionRecord>()
      .exec();
    return action ? serializeIncidentAction(action) : undefined;
  });
