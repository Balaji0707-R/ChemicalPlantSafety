import axios from "axios";
import type { Chemical, ChemicalInput } from "../types/chemical";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (!["get", "head", "options"].includes(config.method?.toLowerCase() || "")) {
    const csrfCookie = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("chem_safe_csrf="))
      ?.split("=")[1];
    if (csrfCookie) {
      config.headers["X-CSRF-Token"] = decodeURIComponent(csrfCookie);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !String(error.config?.url).includes("/auth/")) {
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(error);
  }
);

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

export interface ChemicalStorage {
  storage_id: number;
  chemical_id: number;
  storage_location: string;
  quantity: number;
  unit: string;
  maximum_capacity: number | null;
  updated_at: string;
}

export const getChemicalStorage = async (chemicalId: number): Promise<ChemicalStorage[]> => {
  const response = await api.get<ChemicalStorage[]>(`/chemicals/${chemicalId}/storage`);
  return response.data;
};

export const createChemicalStorage = async (
  chemicalId: number,
  data: Omit<ChemicalStorage, "storage_id" | "chemical_id" | "updated_at">
): Promise<ChemicalStorage> => {
  const response = await api.post<ChemicalStorage>(`/chemicals/${chemicalId}/storage`, data);
  return response.data;
};

export const deleteChemicalStorage = async (storageId: number): Promise<void> => {
  await api.delete(`/chemical-storage/${storageId}`);
};