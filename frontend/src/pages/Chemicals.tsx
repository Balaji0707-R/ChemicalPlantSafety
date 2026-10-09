import { useEffect, useState } from "react";
import {
  createChemical,
  deleteChemical,
  getChemicals,
  updateChemical,
} from "../services/api";
import type { Chemical, ChemicalInput } from "../types/chemical";

const emptyForm: ChemicalInput = {
  chemical_name: "",
  cas_number: "",
  hazard_class: "",
  physical_state: "",
  description: "",
};

function Chemicals() {
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [form, setForm] = useState<ChemicalInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
    loadChemicals();
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

        <div className="inventory-count">
          <span>{chemicals.length}</span>
          <small>Registered Chemicals</small>
        </div>
      </div>

      {message && (
        <div className="message">
          {message}
        </div>
      )}

      <section className="card">
        <div className="card-header">
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
          <div className="form-grid">
            <div className="form-group">
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

            <div className="form-group">
              <label htmlFor="cas_number">CAS Number</label>
              <input
                id="cas_number"
                name="cas_number"
                value={form.cas_number}
                onChange={handleChange}
                placeholder="e.g. 7664-93-9"
              />
            </div>

            <div className="form-group">
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

            <div className="form-group">
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

            <div className="form-group full-width">
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

          <div className="form-actions">
            {editingId !== null && (
              <button
                type="button"
                className="secondary-button"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            )}

            <button type="submit" className="primary-button">
              {editingId !== null
                ? "Update Chemical"
                : "Add Chemical"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>Registered Chemicals</h2>
            <p>
              Chemical records retrieved from the backend database.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="empty-state">Loading chemicals...</p>
        ) : chemicals.length === 0 ? (
          <p className="empty-state">
            No chemicals registered yet.
          </p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>CAS Number</th>
                  <th>Hazard Class</th>
                  <th>Physical State</th>
                  <th>Description</th>
                  <th>Actions</th>
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
                    <td>
                      <div className="table-actions">
                        <button
                          className="edit-button"
                          onClick={() => handleEdit(chemical)}
                        >
                          Edit
                        </button>

                        <button
                          className="delete-button"
                          onClick={() =>
                            handleDelete(chemical.chemical_id)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
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