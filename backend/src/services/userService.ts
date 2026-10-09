import { pool } from "../config/database.js";

export interface User {
  user_id: number;
  role_id: number;
  full_name: string;
  email: string;
  is_active: boolean;
}

export const getAllUsers = async (): Promise<User[]> => {
  const result = await pool.query(`
    SELECT
      user_id,
      role_id,
      full_name,
      email,
      is_active
    FROM users
    WHERE is_active = true
    ORDER BY full_name ASC
  `);

  return result.rows;
};