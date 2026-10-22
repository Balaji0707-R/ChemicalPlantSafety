import { useEffect, useState } from "react";
import {
  createChemical,
  deleteChemical,
  getChemicals,
  updateChemical,
  createChemicalStorage,
  deleteChemicalStorage,
  getChemicalStorage,
  type ChemicalStorage,
} from "../services/api";
import type { Chemical, ChemicalInput } from "../types/chemical";
import { useAuth } from "../auth/useAuth";
import { canDeleteChemicals, canManageChemicals } from "../auth/permissions";
import "./Chemicals.css";

const emptyForm: ChemicalInput = {
  chemical_name: "",
  cas_number: "",
  hazard_class: "",
  physical_state: "",
  description: "",
};

function Chemicals() {
  const { user } = useAuth();
  const canManage = user ? canManageChemicals(user.roleName) : false;
  const canDelete = user ? canDeleteChemicals(user.roleName) : false;
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [form, setForm] = useState<ChemicalInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [storage, setStorage] = useState<Record<number, ChemicalStorage[]>>({});
  const [storageForm, setStorageForm] = useState({ chemicalId: 0, location: "", quantity: "", unit: "kg", maximum: "" });

  const loadChemicals = async () => {
    try {
      setLoading(true);
      const data = await getChemicals();
      setChemicals(data);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load chemicals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadChemicals();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!form.chemical_name.trim()) {
      setMessage("Chemical name is required");
      return;
    }

    try {
      setSaving(true);
      if (editingId !== null) {
        await updateChemical(editingId, form);
        setMessage("Chemical updated successfully");
      } else {
        await createChemical(form);
        setMessage("Chemical added successfully");
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadChemicals();
    } catch (error) {
      console.error(error);
      setMessage("Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (chemical: Chemical) => {
    setEditingId(chemical.chemical_id);

    setForm({
      chemical_name: chemical.chemical_name,
      cas_number: chemical.cas_number ?? "",
      hazard_class: chemical.hazard_class ?? "",
      physical_state: chemical.physical_state ?? "",
      description: chemical.description ?? "",
    });

    setMessage("");
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this chemical?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteChemical(id);
      setMessage("Chemical deleted successfully");
      await loadChemicals();
    } catch (error) {
      console.error(error);
      setMessage("Failed to delete chemical");
    }
  };

  const loadStorage = async (chemicalId: number) => {
    try {
      const records = await getChemicalStorage(chemicalId);
      setStorage((current) => ({ ...current, [chemicalId]: records }));
    } catch (error) {
      console.error(error);
      setMessage("Failed to load chemical storage");
    }
  };

  const handleStorageSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(storageForm.quantity);
    const maximum = storageForm.maximum ? Number(storageForm.maximum) : null;
    if (!storageForm.chemicalId || !storageForm.location.trim() || !Number.isFinite(quantity) || quantity < 0 || (maximum !== null && (!Number.isFinite(maximum) || maximum < quantity))) {
      setMessage("Enter a valid location, quantity, and capacity");
      return;
    }
    try {
      setSaving(true);
      await createChemicalStorage(storageForm.chemicalId, {
        storage_location: storageForm.location.trim(),
        quantity,
        unit: storageForm.unit.trim(),
        maximum_capacity: maximum,
      });
      await loadStorage(storageForm.chemicalId);
      setStorageForm({ chemicalId: 0, location: "", quantity: "", unit: "kg", maximum: "" });
      setMessage("Storage record added successfully");
    } catch (error) {
      console.error(error);
      setMessage("Failed to add storage record");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
  };

  return (
    <div className="chemicals-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">SAFETY MANAGEMENT</p>
          <h1>Chemical Inventory</h1>
          <p>
            Manage hazardous chemicals and their safety information.
          </p>
        </div>

        <div className="chemicals-count">
          <span>{chemicals.length}</span>
          <small>Registered Chemicals</small>
        </div>
      </div>

      {message && (
        <div className="chemicals-message">
          {message}
        </div>
      )}

      {canManage && <section className="chemicals-card">
        <div className="chemicals-card-header">
          <div>
            <h2>
              {editingId !== null
                ? "Edit Chemical"
                : "Add Chemical"}
            </h2>
            <p>
              Enter chemical identification and hazard information.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="chemicals-form-grid">
            <div className="chemicals-form-group">
              <label htmlFor="chemical_name">
                Chemical Name *
              </label>
              <input
                id="chemical_name"
                name="chemical_name"
                value={form.chemical_name}
                onChange={handleChange}
                placeholder="e.g. Sulfuric Acid"
              />
            </div>

            <div className="chemicals-form-group">
              <label htmlFor="cas_number">CAS Number</label>
              <input
                id="cas_number"
                name="cas_number"
                value={form.cas_number}
                onChange={handleChange}
                placeholder="e.g. 7664-93-9"
              />
            </div>

            <div className="chemicals-form-group">
              <label htmlFor="hazard_class">
                Hazard Class
              </label>
              <input
                id="hazard_class"
                name="hazard_class"
                value={form.hazard_class}
                onChange={handleChange}
                placeholder="e.g. Corrosive"
              />
            </div>

            <div className="chemicals-form-group">
              <label htmlFor="physical_state">
                Physical State
              </label>
              <select
                id="physical_state"
                name="physical_state"
                value={form.physical_state}
                onChange={handleChange}
              >
                <option value="">Select state</option>
                <option value="Solid">Solid</option>
                <option value="Liquid">Liquid</option>
                <option value="Gas">Gas</option>
              </select>
            </div>

            <div className="chemicals-form-group full-width">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter safety or identification information"
                rows={3}
              />
            </div>
          </div>

          <div className="chemicals-form-actions">
            {editingId !== null && (
              <button
                type="button"
                className="chemicals-secondary-button"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            )}

            <button type="submit" className="chemicals-primary-button" disabled={saving}>
              {saving ? "Saving..." : editingId !== null
                ? "Update Chemical"
                : "Add Chemical"}
            </button>
          </div>
        </form>
      </section>}

      <section className="chemicals-card">
        <div className="chemicals-card-header">
          <div>
            <h2>Chemical Storage</h2>
            <p>Track location, quantity, unit, and maximum capacity for each chemical.</p>
          </div>
        </div>
        {canManage && <form onSubmit={handleStorageSubmit}>
          <div className="chemicals-form-grid storage-grid">
            <div className="chemicals-form-group">
              <label htmlFor="storage-chemical">Chemical *</label>
              <select id="storage-chemical" value={storageForm.chemicalId} onChange={(event) => {
                const chemicalId = Number(event.target.value);
                setStorageForm((current) => ({ ...current, chemicalId }));
                if (chemicalId) void loadStorage(chemicalId);
              }}>
                <option value={0}>Select chemical</option>
                {chemicals.map((chemical) => <option key={chemical.chemical_id} value={chemical.chemical_id}>{chemical.chemical_name}</option>)}
              </select>
            </div>
            <div className="chemicals-form-group"><label htmlFor="storage-location">Location *</label><input id="storage-location" value={storageForm.location} onChange={(event) => setStorageForm((current) => ({ ...current, location: event.target.value }))} /></div>
            <div className="chemicals-form-group"><label htmlFor="storage-quantity">Quantity *</label><input id="storage-quantity" type="number" min="0" step="0.01" value={storageForm.quantity} onChange={(event) => setStorageForm((current) => ({ ...current, quantity: event.target.value }))} /></div>
            <div className="chemicals-form-group"><label htmlFor="storage-unit">Unit *</label><input id="storage-unit" value={storageForm.unit} onChange={(event) => setStorageForm((current) => ({ ...current, unit: event.target.value }))} /></div>
            <div className="chemicals-form-group"><label htmlFor="storage-maximum">Maximum capacity</label><input id="storage-maximum" type="number" min="0" step="0.01" value={storageForm.maximum} onChange={(event) => setStorageForm((current) => ({ ...current, maximum: event.target.value }))} /></div>
          </div>
          <button type="submit" className="chemicals-primary-button" disabled={!chemicals.length || saving}>{saving ? "Saving..." : "Add Storage Record"}</button>
        </form>}
        {Object.entries(storage).map(([chemicalId, records]) => (
          <div key={chemicalId} className="chemicals-table-wrapper">
            <table className="chemicals-table">
              <thead><tr><th>Location</th><th>Quantity</th><th>Maximum</th><th>Updated</th>{canDelete && <th>Actions</th>}</tr></thead>
              <tbody>{records.map((record) => <tr key={record.storage_id}><td>{record.storage_location}</td><td>{record.quantity} {record.unit}</td><td>{record.maximum_capacity ?? "-"}</td><td>{new Date(record.updated_at).toLocaleDateString()}</td>{canDelete && <td><button className="chemicals-delete-button" onClick={() => void deleteChemicalStorage(record.storage_id).then(() => loadStorage(Number(chemicalId))).catch(() => setMessage("Failed to delete storage record"))}>Delete</button></td>}</tr>)}</tbody>
            </table>
          </div>
        ))}
      </section>

      <section className="chemicals-card">
        <div className="chemicals-card-header">
          <div>
            <h2>Registered Chemicals</h2>
            <p>
              Chemical records retrieved from the backend database.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="chemicals-empty-state">Loading chemicals...</p>
        ) : chemicals.length === 0 ? (
          <p className="chemicals-empty-state">
            No chemicals registered yet.
          </p>
        ) : (
          <div className="chemicals-table-wrapper">
            <table className="chemicals-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>CAS Number</th>
                  <th>Hazard Class</th>
                  <th>Physical State</th>
                  <th>Description</th>
                  {(canManage || canDelete) && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {chemicals.map((chemical) => (
                  <tr key={chemical.chemical_id}>
                    <td>{chemical.chemical_name}</td>
                    <td>{chemical.cas_number || "-"}</td>
                    <td>{chemical.hazard_class || "-"}</td>
                    <td>{chemical.physical_state || "-"}</td>
                    <td>{chemical.description || "-"}</td>
                    {(canManage || canDelete) && <td>
                      <div className="chemicals-table-actions">
                        {canManage && <button
                          className="chemicals-edit-button"
                          onClick={() => handleEdit(chemical)}
                        >
                          Edit
                        </button>}

                        {canDelete && <button
                          className="chemicals-delete-button"
                          onClick={() =>
                            handleDelete(chemical.chemical_id)
                          }
                        >
                          Delete
                        </button>}
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Chemicals;
