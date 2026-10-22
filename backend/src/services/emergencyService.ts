import EmergencyContact from "../models/emergencyContact.js";
import EmergencyProcedure from "../models/emergencyProcedure.js";
import { getNextId } from "../models/counter.js";

export interface EmergencyContactInput {
  contact_name: string;
  organization?: string | null;
  contact_type?: string | null;
  phone: string;
  email?: string | null;
  is_active?: boolean;
}

export interface EmergencyProcedureInput {
  procedure_name: string;
  emergency_type: string;
  instructions: string;
  evacuation_area?: string | null;
}

export const getAllEmergencyContacts = async () =>
  EmergencyContact.find({}).sort({ contact_id: 1 }).exec();

export const getEmergencyContactById = async (id: number) =>
  EmergencyContact.findOne({ contact_id: id }).exec();

export const createEmergencyContact = async (data: EmergencyContactInput) => {
  const contactId = await getNextId("emergency_contacts");
  return EmergencyContact.create({
    contact_id: contactId,
    contact_name: data.contact_name,
    organization: data.organization ?? null,
    contact_type: data.contact_type ?? null,
    phone: data.phone,
    email: data.email ?? null,
    is_active: data.is_active ?? true,
  });
};

export const updateEmergencyContact = async (
  id: number,
  data: EmergencyContactInput
) =>
  EmergencyContact.findOneAndUpdate(
    { contact_id: id },
    {
      $set: {
        contact_name: data.contact_name,
        organization: data.organization ?? null,
        contact_type: data.contact_type ?? null,
        phone: data.phone,
        email: data.email ?? null,
        is_active: data.is_active ?? true,
      },
    },
    { returnDocument: "after", runValidators: true }
  ).exec();

export const deleteEmergencyContact = async (id: number) =>
  EmergencyContact.findOneAndDelete({ contact_id: id }).exec();

export const getAllEmergencyProcedures = async () =>
  EmergencyProcedure.find({}).sort({ procedure_id: 1 }).exec();

export const getEmergencyProcedureById = async (id: number) =>
  EmergencyProcedure.findOne({ procedure_id: id }).exec();

export const createEmergencyProcedure = async (
  data: EmergencyProcedureInput
) => {
  const procedureId = await getNextId("emergency_procedures");
  return EmergencyProcedure.create({
    procedure_id: procedureId,
    procedure_name: data.procedure_name,
    emergency_type: data.emergency_type,
    instructions: data.instructions,
    evacuation_area: data.evacuation_area ?? null,
  });
};

export const updateEmergencyProcedure = async (
  id: number,
  data: EmergencyProcedureInput
) =>
  EmergencyProcedure.findOneAndUpdate(
    { procedure_id: id },
    {
      $set: {
        procedure_name: data.procedure_name,
        emergency_type: data.emergency_type,
        instructions: data.instructions,
        evacuation_area: data.evacuation_area ?? null,
      },
    },
    { returnDocument: "after", runValidators: true }
  ).exec();

export const deleteEmergencyProcedure = async (id: number) =>
  EmergencyProcedure.findOneAndDelete({ procedure_id: id }).exec();
