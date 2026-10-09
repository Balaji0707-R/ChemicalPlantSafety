import { pool } from "../config/database.js";

export interface ChemicalInput {
  chemical_name: string;
  cas_number?: string;
  hazard_class?: string;
  physical_state?: string;
  description?: string;
}

export const getAllChemicals = async () => {
  const result = await pool.query(
    `SELECT * FROM chemicals ORDER BY chemical_id DESC`
  );

  return result.rows;
};

export const getChemicalById = async (id: number) => {
  const result = await pool.query(
    `SELECT * FROM chemicals WHERE chemical_id = $1`,
    [id]
  );

  return result.rows[0];
};

export const createChemical = async (data: ChemicalInput) => {
  const result = await pool.query(
    `INSERT INTO chemicals
      (chemical_name, cas_number, hazard_class, physical_state, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.chemical_name,
      data.cas_number ?? null,
      data.hazard_class ?? null,
      data.physical_state ?? null,
      data.description ?? null,
    ]
  );

  return result.rows[0];
};

export const updateChemical = async (
  id: number,
  data: ChemicalInput
) => {
  const result = await pool.query(
    `UPDATE chemicals
     SET chemical_name = $1,
         cas_number = $2,
         hazard_class = $3,
         physical_state = $4,
         description = $5
     WHERE chemical_id = $6
     RETURNING *`,
    [
      data.chemical_name,
      data.cas_number ?? null,
      data.hazard_class ?? null,
      data.physical_state ?? null,
      data.description ?? null,
      id,
    ]
  );

  return result.rows[0];
};

export const deleteChemical = async (id: number) => {
  const result = await pool.query(
    `DELETE FROM chemicals
     WHERE chemical_id = $1
     RETURNING *`,
    [id]
  );

  return result.rows[0];
};