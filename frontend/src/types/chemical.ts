export interface Chemical {
  chemical_id: number;
  chemical_name: string;
  cas_number: string | null;
  hazard_class: string | null;
  physical_state: string | null;
  description: string | null;
  created_at: string;
}

export interface ChemicalInput {
  chemical_name: string;
  cas_number?: string;
  hazard_class?: string;
  physical_state?: string;
  description?: string;
}