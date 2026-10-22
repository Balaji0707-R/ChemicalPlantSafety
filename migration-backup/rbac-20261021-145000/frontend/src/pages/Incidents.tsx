import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Plus,
  Pencil,
  Trash2,
  ListChecks,
  X,
  CheckCircle2,
} from "lucide-react";

const API_URL = "";

// =====================================================
// TYPES
// =====================================================

interface Incident {
  incident_id: number;
  reported_by: number;
  reporter_name?: string;
  incident_type: string;
  severity: string;
  location: string;
  incident_date: string;
  description: string;
  status: string;
  created_at: string;
}

interface User {
  user_id: number;
  full_name: string;
  email: string;
  role_id: number;
  is_active: boolean;
}

interface IncidentForm {
  reported_by: string;
  incident_type: string;
  severity: string;
  location: string;
  incident_date: string;
  description: string;
  status: string;
}

interface IncidentAction {
  action_id: number;
  incident_id: number;
  action_description: string;
  assigned_to: number | null;
  assigned_name?: string;
  due_date: string | null;
  status: string;
  completed_at: string | null;
}

interface ActionForm {
  action_description: string;
  assigned_to: string;
  due_date: string;
  status: string;
}

// =====================================================
// INITIAL FORMS
// =====================================================

const emptyIncidentForm: IncidentForm = {
  reported_by: "",
  incident_type: "Chemical Spill",
  severity: "MEDIUM",
  location: "",
  incident_date: "",
  description: "",
  status: "OPEN",
};

const emptyActionForm: ActionForm = {
  action_description: "",
  assigned_to: "",
  due_date: "",
  status: "PENDING",
};

// =====================================================
// DATE HELPERS
// =====================================================

const formatDateTime = (value: string) => {
  if (!value) return "-";

  return new Date(value).toLocaleString();
};

const formatDate = (value: string | null) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString();
};

const toDateTimeLocal = (value: string) => {
  if (!value) return "";

  const date = new Date(value);

  const pad = (number: number) =>
    String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

// =====================================================
// COMPONENT
// =====================================================

function Incidents() {
  // ===================================================
  // INCIDENT STATE
  // ===================================================

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);

  const [showIncidentForm, setShowIncidentForm] =
    useState(false);

  const [editingIncidentId, setEditingIncidentId] =
    useState<number | null>(null);

  const [incidentForm, setIncidentForm] =
    useState<IncidentForm>(emptyIncidentForm);

  // ===================================================
  // ACTION STATE
  // ===================================================

  const [selectedIncidentId, setSelectedIncidentId] =
    useState<number | null>(null);

  const [actions, setActions] =
    useState<IncidentAction[]>([]);

  const [loadingActions, setLoadingActions] =
    useState(false);

  const [showActionForm, setShowActionForm] =
    useState(false);

  const [editingActionId, setEditingActionId] =
    useState<number | null>(null);

  const [actionForm, setActionForm] =
    useState<ActionForm>(emptyActionForm);

  // ===================================================
  // MESSAGE STATE
  // ===================================================

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ===================================================
  // LOAD DATA
  // ===================================================

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [incidentResponse, userResponse] =
        await Promise.all([
          api.get(`${API_URL}/incidents`),
          api.get(`${API_URL}/users`),
        ]);

      setIncidents(incidentResponse.data);
      setUsers(userResponse.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load incident data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // ===================================================
  // INCIDENT FORM
  // ===================================================

  const handleIncidentChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    setIncidentForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openNewIncidentForm = () => {
    setEditingIncidentId(null);

    setIncidentForm({
      ...emptyIncidentForm,
      reported_by:
        users.length > 0
          ? String(users[0].user_id)
          : "",
      incident_date: toDateTimeLocal(
        new Date().toISOString()
      ),
    });

    setShowIncidentForm(true);
    setMessage("");
    setError("");
  };

  const openEditIncidentForm = (
    incident: Incident
  ) => {
    setEditingIncidentId(incident.incident_id);

    setIncidentForm({
      reported_by: String(incident.reported_by),
      incident_type: incident.incident_type,
      severity: incident.severity,
      location: incident.location,
      incident_date: toDateTimeLocal(
        incident.incident_date
      ),
      description: incident.description,
      status: incident.status,
    });

    setShowIncidentForm(true);
    setMessage("");
    setError("");
  };

  const cancelIncidentForm = () => {
    setShowIncidentForm(false);
    setEditingIncidentId(null);
    setIncidentForm(emptyIncidentForm);
  };

  const saveIncident = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      setError("");
      setMessage("");

      const payload = {
        reported_by: Number(incidentForm.reported_by),
        incident_type: incidentForm.incident_type,
        severity: incidentForm.severity,
        location: incidentForm.location,
        incident_date: incidentForm.incident_date,
        description: incidentForm.description,
        status: incidentForm.status,
      };

      if (editingIncidentId !== null) {
        await api.put(
          `${API_URL}/incidents/${editingIncidentId}`,
          payload
        );

        setMessage("Incident updated successfully.");
      } else {
        await api.post(
          `${API_URL}/incidents`,
          payload
        );

        setMessage("Incident created successfully.");
      }

      await fetchData();

      setShowIncidentForm(false);
      setEditingIncidentId(null);
      setIncidentForm(emptyIncidentForm);
    } catch (err) {
      console.error(err);
      setError("Failed to save incident.");
    }
  };

  // ===================================================
  // DELETE INCIDENT
  // ===================================================

  const deleteIncident = async (
    id: number
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this incident?"
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `${API_URL}/incidents/${id}`
      );

      if (selectedIncidentId === id) {
        setSelectedIncidentId(null);
        setActions([]);
      }

      setMessage("Incident deleted successfully.");
      setError("");

      await fetchData();
    } catch (err) {
      console.error(err);
      setError("Failed to delete incident.");
    }
  };

  // ===================================================
  // LOAD INCIDENT ACTIONS
  // ===================================================

  const loadActions = async (
    incidentId: number
  ) => {
    try {
      setLoadingActions(true);
      setError("");
      setMessage("");

      const response = await api.get(
        `${API_URL}/incidents/${incidentId}/actions`
      );

      setActions(response.data);
      setSelectedIncidentId(incidentId);

      setShowActionForm(false);
      setEditingActionId(null);
      setActionForm(emptyActionForm);
    } catch (err) {
      console.error(err);
      setError(
        "Failed to load corrective actions."
      );
    } finally {
      setLoadingActions(false);
    }
  };

  // ===================================================
  // ACTION FORM
  // ===================================================

  const handleActionChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    setActionForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openNewActionForm = () => {
    setEditingActionId(null);

    setActionForm({
      ...emptyActionForm,
      assigned_to:
        users.length > 0
          ? String(users[0].user_id)
          : "",
    });

    setShowActionForm(true);
    setMessage("");
    setError("");
  };

  const openEditActionForm = (
    action: IncidentAction
  ) => {
    setEditingActionId(action.action_id);

    setActionForm({
      action_description:
        action.action_description,
      assigned_to: action.assigned_to
        ? String(action.assigned_to)
        : "",
      due_date: action.due_date
        ? action.due_date.substring(0, 10)
        : "",
      status: action.status,
    });

    setShowActionForm(true);
    setMessage("");
    setError("");
  };

  const cancelActionForm = () => {
    setShowActionForm(false);
    setEditingActionId(null);
    setActionForm(emptyActionForm);
  };

  // ===================================================
  // SAVE ACTION
  // ===================================================

  const saveAction = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!selectedIncidentId) {
      setError("Please select an incident first.");
      return;
    }

    try {
      setError("");
      setMessage("");

      const payload = {
        incident_id: selectedIncidentId,
        action_description:
          actionForm.action_description,
        assigned_to: actionForm.assigned_to
          ? Number(actionForm.assigned_to)
          : null,
        due_date: actionForm.due_date || null,
        status: actionForm.status,
      };

      if (editingActionId !== null) {
        await api.put(
          `${API_URL}/incidents/actions/${editingActionId}`,
          payload
        );

        setMessage(
          "Corrective action updated successfully."
        );
      } else {
        await api.post(
          `${API_URL}/incidents/actions`,
          payload
        );

        setMessage(
          "Corrective action added successfully."
        );
      }

      await loadActions(selectedIncidentId);

      setShowActionForm(false);
      setEditingActionId(null);
      setActionForm(emptyActionForm);
    } catch (err) {
      console.error(err);
      setError(
        "Failed to save corrective action."
      );
    }
  };

  // ===================================================
  // DELETE ACTION
  // ===================================================

  const deleteAction = async (
    actionId: number
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this corrective action?"
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `${API_URL}/incidents/actions/${actionId}`
      );

      setMessage(
        "Corrective action deleted successfully."
      );
      setError("");

      if (selectedIncidentId) {
        await loadActions(selectedIncidentId);
      }
    } catch (err) {
      console.error(err);
      setError(
        "Failed to delete corrective action."
      );
    }
  };

  // ===================================================
  // CLOSE ACTION PANEL
  // ===================================================

  const closeActionPanel = () => {
    setSelectedIncidentId(null);
    setActions([]);
    setShowActionForm(false);
    setEditingActionId(null);
    setActionForm(emptyActionForm);
  };

  // ===================================================
  // GET USER NAME
  // ===================================================

  const getUserName = (
    userId: number | null
  ) => {
    if (!userId) return "Unassigned";

    const user = users.find(
      (item) => item.user_id === userId
    );

    return user
      ? user.full_name
      : "Unknown User";
  };

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div className="incidents-page">
        <div className="incident-loading">
          Loading incident management...
        </div>
      </div>
    );
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="incidents-page">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="incident-page-header">

        <div>
          <span className="page-eyebrow">
            SAFETY MANAGEMENT
          </span>

          <h1>
            Incident Management
          </h1>

          <p>
            Record, monitor and manage workplace
            safety incidents.
          </p>
        </div>

        <button
          className="incident-primary-button"
          onClick={openNewIncidentForm}
        >
          <Plus size={18} />
          New Incident
        </button>

      </div>


      {/* =================================================
          MESSAGES
      ================================================= */}

      {message && (
        <div className="incident-success-message">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      {error && (
        <div className="incident-error-message">
          {error}
        </div>
      )}


      {/* =================================================
          INCIDENT FORM
      ================================================= */}

      {showIncidentForm && (
        <div className="incident-form-card">

          <div className="incident-form-header">

            <div>
              <span className="page-eyebrow">
                INCIDENT RECORD
              </span>

              <h2>
                {editingIncidentId !== null
                  ? "Edit Incident"
                  : "Report New Incident"}
              </h2>
            </div>

            <button
              className="incident-close-button"
              onClick={cancelIncidentForm}
              type="button"
            >
              <X size={20} />
            </button>

          </div>


          <form
            onSubmit={saveIncident}
            className="incident-form"
          >

            <div className="incident-form-grid">

              {/* REPORTED BY */}

              <div className="incident-form-group">

                <label>
                  Reported By
                </label>

                <select
                  name="reported_by"
                  value={incidentForm.reported_by}
                  onChange={handleIncidentChange}
                  required
                >
                  <option value="">
                    Select user
                  </option>

                  {users.map((user) => (
                    <option
                      key={user.user_id}
                      value={user.user_id}
                    >
                      {user.full_name}
                    </option>
                  ))}
                </select>

              </div>


              {/* INCIDENT TYPE */}

              <div className="incident-form-group">

                <label>
                  Incident Type
                </label>

                <select
                  name="incident_type"
                  value={incidentForm.incident_type}
                  onChange={handleIncidentChange}
                  required
                >
                  <option>
                    Chemical Spill
                  </option>

                  <option>
                    Fire
                  </option>

                  <option>
                    Gas Leak
                  </option>

                  <option>
                    Equipment Failure
                  </option>

                  <option>
                    Worker Injury
                  </option>

                  <option>
                    Environmental Release
                  </option>

                  <option>
                    Other
                  </option>

                </select>

              </div>


              {/* SEVERITY */}

              <div className="incident-form-group">

                <label>
                  Severity
                </label>

                <select
                  name="severity"
                  value={incidentForm.severity}
                  onChange={handleIncidentChange}
                  required
                >
                  <option value="LOW">
                    LOW
                  </option>

                  <option value="MEDIUM">
                    MEDIUM
                  </option>

                  <option value="HIGH">
                    HIGH
                  </option>

                  <option value="CRITICAL">
                    CRITICAL
                  </option>

                </select>

              </div>


              {/* STATUS */}

              <div className="incident-form-group">

                <label>
                  Status
                </label>

                <select
                  name="status"
                  value={incidentForm.status}
                  onChange={handleIncidentChange}
                  required
                >
                  <option value="OPEN">
                    OPEN
                  </option>

                  <option value="UNDER_INVESTIGATION">
                    UNDER INVESTIGATION
                  </option>

                  <option value="RESOLVED">
                    RESOLVED
                  </option>

                  <option value="CLOSED">
                    CLOSED
                  </option>

                </select>

              </div>


              {/* LOCATION */}

              <div className="incident-form-group">

                <label>
                  Location
                </label>

                <input
                  type="text"
                  name="location"
                  value={incidentForm.location}
                  onChange={handleIncidentChange}
                  placeholder="e.g. Chemical Storage Area"
                  required
                />

              </div>


              {/* DATE */}

              <div className="incident-form-group">

                <label>
                  Incident Date & Time
                </label>

                <input
                  type="datetime-local"
                  name="incident_date"
                  value={incidentForm.incident_date}
                  onChange={handleIncidentChange}
                  required
                />

              </div>

            </div>


            {/* DESCRIPTION */}

            <div className="incident-form-group">

              <label>
                Description
              </label>

              <textarea
                name="description"
                value={incidentForm.description}
                onChange={handleIncidentChange}
                placeholder="Describe what happened..."
                rows={5}
                required
              />

            </div>


            {/* FORM BUTTONS */}

            <div className="incident-form-actions">

              <button
                type="button"
                className="incident-secondary-button"
                onClick={cancelIncidentForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="incident-primary-button"
              >
                {editingIncidentId !== null
                  ? "Update Incident"
                  : "Save Incident"}
              </button>

            </div>

          </form>

        </div>
      )}


      {/* =================================================
          INCIDENT LIST
      ================================================= */}

      <div className="incident-list-card">

        <div className="incident-list-header">

          <div>
            <span className="page-eyebrow">
              INCIDENT RECORDS
            </span>

            <h2>
              Reported Incidents
            </h2>
          </div>

          <div className="incident-count">
            {incidents.length} Incident
            {incidents.length !== 1 ? "s" : ""}
          </div>

        </div>


        {incidents.length === 0 ? (

          <div className="incident-empty-state">
            <TriangleAlertIcon />
            <h3>
              No incidents recorded
            </h3>
            <p>
              Click "New Incident" to report
              a safety incident.
            </p>
          </div>

        ) : (

          <div className="incident-table-wrapper">

            <table className="incident-table">

              <thead>

                <tr>
                  <th>ID</th>
                  <th>TYPE</th>
                  <th>SEVERITY</th>
                  <th>LOCATION</th>
                  <th>REPORTED BY</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>

              </thead>

              <tbody>

                {incidents.map((incident) => (

                  <tr key={incident.incident_id}>

                    <td>
                      #{incident.incident_id}
                    </td>

                    <td>
                      <strong>
                        {incident.incident_type}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`incident-severity ${incident.severity.toLowerCase()}`}
                      >
                        {incident.severity}
                      </span>
                    </td>

                    <td>
                      {incident.location}
                    </td>

                    <td>
                      {incident.reporter_name ||
                        getUserName(
                          incident.reported_by
                        )}
                    </td>

                    <td>
                      {formatDateTime(
                        incident.incident_date
                      )}
                    </td>

                    <td>
                      <span
                        className={`incident-status ${incident.status
                          .toLowerCase()
                          .replaceAll("_", "-")}`}
                      >
                        {incident.status.replaceAll(
                          "_",
                          " "
                        )}
                      </span>
                    </td>

                    <td>

                      <div className="incident-action-buttons">

                        {/* VIEW CORRECTIVE ACTIONS */}

                        <button
                          className="incident-icon-button action-view"
                          title="View Corrective Actions"
                          onClick={() =>
                            loadActions(
                              incident.incident_id
                            )
                          }
                        >
                          <ListChecks size={17} />
                        </button>


                        {/* EDIT */}

                        <button
                          className="incident-icon-button"
                          title="Edit Incident"
                          onClick={() =>
                            openEditIncidentForm(
                              incident
                            )
                          }
                        >
                          <Pencil size={17} />
                        </button>


                        {/* DELETE */}

                        <button
                          className="incident-icon-button delete"
                          title="Delete Incident"
                          onClick={() =>
                            deleteIncident(
                              incident.incident_id
                            )
                          }
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* =================================================
          CORRECTIVE ACTION PANEL
      ================================================= */}

      {selectedIncidentId !== null && (

        <div className="incident-actions-card">

          <div className="incident-actions-header">

            <div>

              <span className="page-eyebrow">
                CORRECTIVE ACTIONS
              </span>

              <h2>
                Incident #{selectedIncidentId}
              </h2>

              <p>
                Track actions required to resolve
                this incident.
              </p>

            </div>


            <div className="incident-actions-header-buttons">

              <button
                className="incident-primary-button"
                onClick={openNewActionForm}
              >
                <Plus size={18} />
                Add Action
              </button>

              <button
                className="incident-close-button"
                onClick={closeActionPanel}
              >
                <X size={20} />
              </button>

            </div>

          </div>


          {/* =================================================
              ACTION FORM
          ================================================= */}

          {showActionForm && (

            <div className="corrective-action-form">

              <div className="corrective-action-form-title">

                <h3>
                  {editingActionId !== null
                    ? "Edit Corrective Action"
                    : "Add Corrective Action"}
                </h3>

              </div>


              <form
                onSubmit={saveAction}
              >

                <div className="incident-form-grid">

                  {/* ACTION DESCRIPTION */}

                  <div className="incident-form-group full-width">

                    <label>
                      Action Description
                    </label>

                    <textarea
                      name="action_description"
                      value={
                        actionForm.action_description
                      }
                      onChange={
                        handleActionChange
                      }
                      placeholder="Describe the corrective action..."
                      rows={4}
                      required
                    />

                  </div>


                  {/* ASSIGNED TO */}

                  <div className="incident-form-group">

                    <label>
                      Assigned To
                    </label>

                    <select
                      name="assigned_to"
                      value={
                        actionForm.assigned_to
                      }
                      onChange={
                        handleActionChange
                      }
                    >

                      <option value="">
                        Unassigned
                      </option>

                      {users.map((user) => (

                        <option
                          key={user.user_id}
                          value={user.user_id}
                        >
                          {user.full_name}
                        </option>

                      ))}

                    </select>

                  </div>


                  {/* DUE DATE */}

                  <div className="incident-form-group">

                    <label>
                      Due Date
                    </label>

                    <input
                      type="date"
                      name="due_date"
                      value={
                        actionForm.due_date
                      }
                      onChange={
                        handleActionChange
                      }
                    />

                  </div>


                  {/* STATUS */}

                  <div className="incident-form-group">

                    <label>
                      Status
                    </label>

                    <select
                      name="status"
                      value={actionForm.status}
                      onChange={
                        handleActionChange
                      }
                    >

                      <option value="PENDING">
                        PENDING
                      </option>

                      <option value="IN_PROGRESS">
                        IN PROGRESS
                      </option>

                      <option value="COMPLETED">
                        COMPLETED
                      </option>

                      <option value="CANCELLED">
                        CANCELLED
                      </option>

                    </select>

                  </div>

                </div>


                <div className="incident-form-actions">

                  <button
                    type="button"
                    className="incident-secondary-button"
                    onClick={cancelActionForm}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="incident-primary-button"
                  >
                    {editingActionId !== null
                      ? "Update Action"
                      : "Save Action"}
                  </button>

                </div>

              </form>

            </div>

          )}


          {/* =================================================
              ACTION LIST
          ================================================= */}

          {loadingActions ? (

            <div className="incident-actions-loading">
              Loading corrective actions...
            </div>

          ) : actions.length === 0 ? (

            <div className="incident-actions-empty">

              <ListChecks size={38} />

              <h3>
                No corrective actions
              </h3>

              <p>
                No corrective actions have been
                added for this incident yet.
              </p>

              <button
                className="incident-primary-button"
                onClick={openNewActionForm}
              >
                <Plus size={18} />
                Add First Action
              </button>

            </div>

          ) : (

            <div className="corrective-actions-list">

              {actions.map((action) => (

                <div
                  className="corrective-action-item"
                  key={action.action_id}
                >

                  <div className="corrective-action-main">

                    <div className="corrective-action-number">
                      #{action.action_id}
                    </div>

                    <div>

                      <h3>
                        {action.action_description}
                      </h3>

                      <div className="corrective-action-meta">

                        <span>
                          Assigned:{" "}
                          <strong>
                            {action.assigned_name ||
                              getUserName(
                                action.assigned_to
                              )}
                          </strong>
                        </span>

                        <span>
                          Due:{" "}
                          <strong>
                            {formatDate(
                              action.due_date
                            )}
                          </strong>
                        </span>

                        {action.completed_at && (
                          <span>
                            Completed:{" "}
                            <strong>
                              {formatDateTime(
                                action.completed_at
                              )}
                            </strong>
                          </span>
                        )}

                      </div>

                    </div>

                  </div>


                  <div className="corrective-action-right">

                    <span
                      className={`corrective-action-status ${action.status
                        .toLowerCase()
                        .replaceAll("_", "-")}`}
                    >
                      {action.status.replaceAll(
                        "_",
                        " "
                      )}
                    </span>


                    <div className="incident-action-buttons">

                      <button
                        className="incident-icon-button"
                        title="Edit Action"
                        onClick={() =>
                          openEditActionForm(
                            action
                          )
                        }
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        className="incident-icon-button delete"
                        title="Delete Action"
                        onClick={() =>
                          deleteAction(
                            action.action_id
                          )
                        }
                      >
                        <Trash2 size={17} />
                      </button>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      )}

    </div>
  );
}


// =====================================================
// EMPTY STATE ICON
// =====================================================

function TriangleAlertIcon() {
  return (
    <div className="incident-empty-icon">
      <ListChecks size={40} />
    </div>
  );
}


export default Incidents;