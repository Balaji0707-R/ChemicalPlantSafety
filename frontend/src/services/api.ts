import axios from "axios";
import type { Chemical, ChemicalInput } from "../types/chemical";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const getChemicals = async (): Promise<Chemical[]> => {
  const response = await api.get<Chemical[]>("/chemicals");
  return response.data;
};

export const createChemical = async (
  data: ChemicalInput
): Promise<Chemical> => {
  const response = await api.post<Chemical>("/chemicals", data);
  return response.data;
};

export const updateChemical = async (
  id: number,
  data: ChemicalInput
): Promise<Chemical> => {
  const response = await api.put<Chemical>(`/chemicals/${id}`, data);
  return response.data;
};

export const deleteChemical = async (
  id: number
): Promise<void> => {
  await api.delete(`/chemicals/${id}`);
};