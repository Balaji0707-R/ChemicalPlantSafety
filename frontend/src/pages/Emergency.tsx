import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../auth/useAuth";
import { canManageEmergency } from "../auth/permissions";

import {
  AlertTriangle,
  Edit,
  Phone,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

import "../App.css";

interface EmergencyContact {
  contact_id: number;
  contact_name: string;
  organization: string | null;
  contact_type: string | null;
  phone: string;
  email: string | null;
  is_active: boolean;
}

interface EmergencyProcedure {
  procedure_id: number;
  procedure_name: string;
  emergency_type: string;
  instructions: string;
  evacuation_area: string | null;
  created_at: string;
}

interface ContactForm {
  contact_name: string;
  organization: string;
  contact_type: string;
  phone: string;
  email: string;
  is_active: boolean;
}

interface ProcedureForm {
  procedure_name: string;
  emergency_type: string;
  instructions: string;
  evacuation_area: string;
}

const emptyContactForm: ContactForm = {
  contact_name: "",
  organization: "",
  contact_type: "",
  phone: "",
  email: "",
  is_active: true,
};

const emptyProcedureForm: ProcedureForm = {
  procedure_name: "",
  emergency_type: "",
  instructions: "",
  evacuation_area: "",
};

function Emergency() {
  const { user } = useAuth();
  const canManage = user ? canManageEmergency(user.roleName) : false;
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [procedures, setProcedures] = useState<EmergencyProcedure[]>([]);

  const [contactForm, setContactForm] =
    useState<ContactForm>(emptyContactForm);

  const [procedureForm, setProcedureForm] =
    useState<ProcedureForm>(emptyProcedureForm);

  const [editingContactId, setEditingContactId] =
    useState<number | null>(null);

  const [editingProcedureId, setEditingProcedureId] =
    useState<number | null>(null);

  const [showContactForm, setShowContactForm] =
    useState(false);

  const [showProcedureForm, setShowProcedureForm] =
    useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadEmergencyData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        contactsResponse,
        proceduresResponse,
      ] = await Promise.all([
        api.get<EmergencyContact[]>("/emergency/contacts"),
        api.get<EmergencyProcedure[]>("/emergency/procedures"),
      ]);

      setContacts(contactsResponse.data);
      setProcedures(proceduresResponse.data);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load emergency management data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEmergencyData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // =====================================================
  // CONTACT FORM
  // =====================================================

  const openAddContact = () => {
    setEditingContactId(null);
    setContactForm(emptyContactForm);
    setShowContactForm(true);
  };

  const openEditContact = (
    contact: EmergencyContact
  ) => {
    setEditingContactId(contact.contact_id);

    setContactForm({
      contact_name: contact.contact_name,
      organization:
        contact.organization ?? "",
      contact_type:
        contact.contact_type ?? "",
      phone: contact.phone,
      email: contact.email ?? "",
      is_active: contact.is_active,
    });

    setShowContactForm(true);
  };

  const closeContactForm = () => {
    setShowContactForm(false);
    setEditingContactId(null);
    setContactForm(emptyContactForm);
  };

  const handleContactSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    try {
      setError("");

      const payload = {
          contact_name:
            contactForm.contact_name,
          organization:
            contactForm.organization || null,
          contact_type:
            contactForm.contact_type || null,
          phone: contactForm.phone,
          email:
            contactForm.email || null,
          is_active:
            contactForm.is_active,
        };

      if (editingContactId) {
        await api.put(`/emergency/contacts/${editingContactId}`, payload);
      } else {
        await api.post("/emergency/contacts", payload);
      }

      await loadEmergencyData();
      closeContactForm();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save emergency contact"
      );
    }
  };

  const deleteContact = async (
    id: number
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this emergency contact?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(`/emergency/contacts/${id}`);

      await loadEmergencyData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete emergency contact"
      );
    }
  };

  // =====================================================
  // PROCEDURE FORM
  // =====================================================

  const openAddProcedure = () => {
    setEditingProcedureId(null);
    setProcedureForm(emptyProcedureForm);
    setShowProcedureForm(true);
  };

  const openEditProcedure = (
    procedure: EmergencyProcedure
  ) => {
    setEditingProcedureId(
      procedure.procedure_id
    );

    setProcedureForm({
      procedure_name:
        procedure.procedure_name,
      emergency_type:
        procedure.emergency_type,
      instructions:
        procedure.instructions,
      evacuation_area:
        procedure.evacuation_area ?? "",
    });

    setShowProcedureForm(true);
  };

  const closeProcedureForm = () => {
    setShowProcedureForm(false);
    setEditingProcedureId(null);
    setProcedureForm(emptyProcedureForm);
  };

  const handleProcedureSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    try {
      setError("");

      const payload = {
          procedure_name:
            procedureForm.procedure_name,
          emergency_type:
            procedureForm.emergency_type,
          instructions:
            procedureForm.instructions,
          evacuation_area:
            procedureForm.evacuation_area ||
            null,
        };

      if (editingProcedureId) {
        await api.put(`/emergency/procedures/${editingProcedureId}`, payload);
      } else {
        await api.post("/emergency/procedures", payload);
      }

      await loadEmergencyData();
      closeProcedureForm();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save emergency procedure"
      );
    }
  };

  const deleteProcedure = async (
    id: number
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this emergency procedure?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(`/emergency/procedures/${id}`);

      await loadEmergencyData();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete emergency procedure"
      );
    }
  };

  return (
    <div className="page-content emergency-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="page-header">
        <div>
          <div className="page-title-row">
            <ShieldAlert size={30} />
            <h1>Emergency Management</h1>
          </div>

          <p>
            Manage emergency contacts and response
            procedures.
          </p>
        </div>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="emergency-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="icon-button"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* =====================================================
          CONTACTS
      ===================================================== */}

      <section className="emergency-section">

        <div className="section-header">
          <div>
            <h2>Emergency Contacts</h2>
            <p>
              Important emergency organizations and
              response contacts.
            </p>
          </div>

          {canManage && <button
            className="primary-button"
            onClick={openAddContact}
          >
            <Plus size={18} />
            Add Contact
          </button>}
        </div>

        {loading ? (
          <div className="empty-state">
            Loading emergency contacts...
          </div>
        ) : contacts.length === 0 ? (
          <div className="empty-state">
            No emergency contacts found.
          </div>
        ) : (
          <div className="emergency-table-wrapper">
            <table className="emergency-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.contact_id}>

                    <td>
                      <strong>
                        {contact.contact_name}
                      </strong>
                    </td>

                    <td>
                      {contact.organization ||
                        "—"}
                    </td>

                    <td>
                      <span className="emergency-type-badge">
                        {contact.contact_type ||
                          "GENERAL"}
                      </span>
                    </td>

                    <td>
                      <div className="phone-cell">
                        <Phone size={15} />
                        {contact.phone}
                      </div>
                    </td>

                    <td>
                      {contact.email || "—"}
                    </td>

                    <td>
                      <span
                        className={
                          contact.is_active
                            ? "status-badge status-active"
                            : "status-badge status-inactive"
                        }
                      >
                        {contact.is_active
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>
                    </td>

                    <td>
                      {canManage && <div className="table-actions">

                        <button
                          className="action-button edit"
                          onClick={() =>
                            openEditContact(
                              contact
                            )
                          }
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          className="action-button delete"
                          onClick={() =>
                            deleteContact(
                              contact.contact_id
                            )
                          }
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================
          PROCEDURES
      ===================================================== */}

      <section className="emergency-section">

        <div className="section-header">
          <div>
            <h2>Emergency Procedures</h2>
            <p>
              Response procedures and evacuation
              information.
            </p>
          </div>

          {canManage && <button
            className="primary-button"
            onClick={openAddProcedure}
          >
            <Plus size={18} />
            Add Procedure
          </button>}
        </div>

        {loading ? (
          <div className="empty-state">
            Loading emergency procedures...
          </div>
        ) : procedures.length === 0 ? (
          <div className="empty-state">
            No emergency procedures found.
          </div>
        ) : (
          <div className="procedure-grid">
            {procedures.map((procedure) => (
              <div
                className="procedure-card"
                key={procedure.procedure_id}
              >

                <div className="procedure-card-header">
                  <div>
                    <h3>
                      {procedure.procedure_name}
                    </h3>

                    <span className="emergency-type-badge">
                      {procedure.emergency_type}
                    </span>
                  </div>

                  {canManage && <div className="table-actions">

                    <button
                      className="action-button edit"
                      onClick={() =>
                        openEditProcedure(
                          procedure
                        )
                      }
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      className="action-button delete"
                      onClick={() =>
                        deleteProcedure(
                          procedure.procedure_id
                        )
                      }
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>}
                </div>

                <div className="procedure-content">

                  <div>
                    <strong>
                      Response Instructions
                    </strong>

                    <p>
                      {procedure.instructions}
                    </p>
                  </div>

                  <div className="evacuation-box">
                    <strong>
                      Evacuation Area
                    </strong>

                    <span>
                      {procedure.evacuation_area ||
                        "Not specified"}
                    </span>
                  </div>

                </div>

              </div>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          CONTACT MODAL
      ===================================================== */}

      {canManage && showContactForm && (
        <div className="modal-overlay">

          <div className="modal-card">

            <div className="modal-header">
              <div>
                <h2>
                  {editingContactId
                    ? "Edit Emergency Contact"
                    : "Add Emergency Contact"}
                </h2>
              </div>

              <button
                className="icon-button"
                onClick={closeContactForm}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleContactSubmit}
            >

              <div className="form-grid">

                <div className="form-group">
                  <label>
                    Contact Name
                  </label>

                  <input
                    type="text"
                    value={
                      contactForm.contact_name
                    }
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        contact_name:
                          e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Organization
                  </label>

                  <input
                    type="text"
                    value={
                      contactForm.organization
                    }
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        organization:
                          e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>
                    Contact Type
                  </label>

                  <select
                    value={
                      contactForm.contact_type
                    }
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        contact_type:
                          e.target.value,
                      })
                    }
                  >
                    <option value="">
                      Select Type
                    </option>
                    <option value="FIRE">
                      FIRE
                    </option>
                    <option value="POLICE">
                      POLICE
                    </option>
                    <option value="MEDICAL">
                      MEDICAL
                    </option>
                    <option value="HAZMAT">
                      HAZMAT
                    </option>
                    <option value="PLANT">
                      PLANT
                    </option>
                    <option value="GENERAL">
                      GENERAL
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Phone
                  </label>

                  <input
                    type="text"
                    value={contactForm.phone}
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        phone:
                          e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        email:
                          e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group checkbox-group">

                  <label>
                    <input
                      type="checkbox"
                      checked={
                        contactForm.is_active
                      }
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          is_active:
                            e.target.checked,
                        })
                      }
                    />

                    Active Contact
                  </label>

                </div>

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeContactForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingContactId
                    ? "Update Contact"
                    : "Save Contact"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* =====================================================
          PROCEDURE MODAL
      ===================================================== */}

      {canManage && showProcedureForm && (
        <div className="modal-overlay">

          <div className="modal-card modal-large">

            <div className="modal-header">
              <div>
                <h2>
                  {editingProcedureId
                    ? "Edit Emergency Procedure"
                    : "Add Emergency Procedure"}
                </h2>
              </div>

              <button
                className="icon-button"
                onClick={closeProcedureForm}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleProcedureSubmit}
            >

              <div className="form-grid">

                <div className="form-group">
                  <label>
                    Procedure Name
                  </label>

                  <input
                    type="text"
                    value={
                      procedureForm.procedure_name
                    }
                    onChange={(e) =>
                      setProcedureForm({
                        ...procedureForm,
                        procedure_name:
                          e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Emergency Type
                  </label>

                  <select
                    value={
                      procedureForm.emergency_type
                    }
                    onChange={(e) =>
                      setProcedureForm({
                        ...procedureForm,
                        emergency_type:
                          e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">
                      Select Emergency Type
                    </option>
                    <option value="CHEMICAL SPILL">
                      CHEMICAL SPILL
                    </option>
                    <option value="FIRE">
                      FIRE
                    </option>
                    <option value="GAS LEAK">
                      GAS LEAK
                    </option>
                    <option value="EXPLOSION">
                      EXPLOSION
                    </option>
                    <option value="TOXIC RELEASE">
                      TOXIC RELEASE
                    </option>
                    <option value="NATURAL DISASTER">
                      NATURAL DISASTER
                    </option>
                    <option value="OTHER">
                      OTHER
                    </option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>
                    Instructions
                  </label>

                  <textarea
                    rows={6}
                    value={
                      procedureForm.instructions
                    }
                    onChange={(e) =>
                      setProcedureForm({
                        ...procedureForm,
                        instructions:
                          e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>
                    Evacuation Area
                  </label>

                  <input
                    type="text"
                    value={
                      procedureForm.evacuation_area
                    }
                    onChange={(e) =>
                      setProcedureForm({
                        ...procedureForm,
                        evacuation_area:
                          e.target.value,
                      })
                    }
                  />
                </div>

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeProcedureForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingProcedureId
                    ? "Update Procedure"
                    : "Save Procedure"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default Emergency;
