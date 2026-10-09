import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Plus,
  Pencil,
  Trash2,
  X,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import axios from "axios";


// =====================================================
// TYPES
// =====================================================

interface Inspection {
  inspection_id: number;
  inspector_id: number;
  inspector_name: string;
  inspection_date: string;
  area: string;
  status: string;
  remarks: string | null;
  created_at: string;
}

interface User {
  user_id: number;
  role_id: number;
  full_name: string;
  email: string;
  is_active: boolean;
}

interface Finding {
  finding_id: number;
  inspection_id: number;
  inspection_area?: string;
  inspection_date?: string;
  finding_description: string;
  severity: string;
  corrective_action: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
}

interface InspectionForm {
  inspector_id: number;
  inspection_date: string;
  area: string;
  status: string;
  remarks: string;
}

interface FindingForm {
  finding_description: string;
  severity: string;
  corrective_action: string;
  due_date: string;
  status: string;
}


// =====================================================
// API URL
// =====================================================

const API_URL = "http://localhost:5000/api";


// =====================================================
// MAIN COMPONENT
// =====================================================

const Inspections = () => {

  // ===================================================
  // INSPECTIONS
  // ===================================================

  const [inspections, setInspections] =
    useState<Inspection[]>([]);

  const [users, setUsers] =
    useState<User[]>([]);

  const [loading, setLoading] =
    useState(true);


  // ===================================================
  // INSPECTION FORM
  // ===================================================

  const [showInspectionForm, setShowInspectionForm] =
    useState(false);

  const [editingInspectionId, setEditingInspectionId] =
    useState<number | null>(null);

  const [inspectionForm, setInspectionForm] =
    useState<InspectionForm>({
      inspector_id: 0,
      inspection_date:
        new Date().toISOString().split("T")[0],
      area: "",
      status: "SCHEDULED",
      remarks: "",
    });


  // ===================================================
  // FINDINGS
  // ===================================================

  const [selectedInspection, setSelectedInspection] =
    useState<Inspection | null>(null);

  const [findings, setFindings] =
    useState<Finding[]>([]);

  const [findingsLoading, setFindingsLoading] =
    useState(false);


  // ===================================================
  // FINDING FORM
  // ===================================================

  const [showFindingForm, setShowFindingForm] =
    useState(false);

  const [editingFindingId, setEditingFindingId] =
    useState<number | null>(null);

  const [findingForm, setFindingForm] =
    useState<FindingForm>({
      finding_description: "",
      severity: "MEDIUM",
      corrective_action: "",
      due_date: "",
      status: "OPEN",
    });


  // ===================================================
  // MESSAGES
  // ===================================================

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  // ===================================================
  // LOAD INSPECTIONS + USERS
  // ===================================================

  const fetchData = async () => {

    try {

      setLoading(true);

      const [
        inspectionResponse,
        userResponse,
      ] = await Promise.all([
        axios.get<Inspection[]>(
          `${API_URL}/inspections`
        ),
        axios.get<User[]>(
          `${API_URL}/users`
        ),
      ]);

      setInspections(
        inspectionResponse.data
      );

      setUsers(
        userResponse.data
      );

      setError("");

    } catch (err) {

      console.error(
        "Failed to load inspection data:",
        err
      );

      setError(
        "Unable to load inspection data. Make sure the backend is running."
      );

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {

    fetchData();

  }, []);


  // ===================================================
  // INSPECTION FORM RESET
  // ===================================================

  const resetInspectionForm = () => {

    setInspectionForm({
      inspector_id:
        users.length > 0
          ? users[0].user_id
          : 0,

      inspection_date:
        new Date().toISOString().split("T")[0],

      area: "",

      status: "SCHEDULED",

      remarks: "",
    });

    setEditingInspectionId(null);

    setShowInspectionForm(false);

  };


  // ===================================================
  // INSPECTION FORM CHANGE
  // ===================================================

  const handleInspectionChange = (
    field: keyof InspectionForm,
    value: string | number
  ) => {

    setInspectionForm(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );

  };


  // ===================================================
  // CREATE / UPDATE INSPECTION
  // ===================================================

  const handleInspectionSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    setMessage("");
    setError("");


    if (!inspectionForm.inspector_id) {

      setError(
        "Please select an inspector."
      );

      return;
    }


    if (!inspectionForm.area.trim()) {

      setError(
        "Inspection area is required."
      );

      return;
    }


    try {

      if (
        editingInspectionId !== null
      ) {

        await axios.put(
          `${API_URL}/inspections/${editingInspectionId}`,
          inspectionForm
        );

        setMessage(
          "Inspection updated successfully."
        );

      } else {

        await axios.post(
          `${API_URL}/inspections`,
          inspectionForm
        );

        setMessage(
          "Inspection created successfully."
        );

      }


      await fetchData();

      resetInspectionForm();

    } catch (err) {

      console.error(
        "Inspection save error:",
        err
      );

      setError(
        "Failed to save inspection."
      );

    }

  };


  // ===================================================
  // EDIT INSPECTION
  // ===================================================

  const handleEditInspection = (
    inspection: Inspection
  ) => {

    setInspectionForm({

      inspector_id:
        inspection.inspector_id,

      inspection_date:
        inspection.inspection_date
          .split("T")[0],

      area:
        inspection.area,

      status:
        inspection.status,

      remarks:
        inspection.remarks ?? "",
    });

    setEditingInspectionId(
      inspection.inspection_id
    );

    setShowInspectionForm(true);

    setMessage("");
    setError("");

  };


  // ===================================================
  // DELETE INSPECTION
  // ===================================================

  const handleDeleteInspection = async (
    id: number
  ) => {

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this inspection? Any findings linked to this inspection will also be deleted."
      );

    if (!confirmed) {
      return;
    }


    try {

      await axios.delete(
        `${API_URL}/inspections/${id}`
      );

      setMessage(
        "Inspection deleted successfully."
      );

      await fetchData();

    } catch (err) {

      console.error(
        "Inspection delete error:",
        err
      );

      setError(
        "Failed to delete inspection."
      );

    }

  };


  // ===================================================
  // LOAD FINDINGS
  // ===================================================

  const loadFindings = async (
    inspection: Inspection
  ) => {

    try {

      setSelectedInspection(
        inspection
      );

      setFindingsLoading(true);

      setMessage("");
      setError("");

      const response =
        await axios.get<Finding[]>(
          `${API_URL}/findings/inspection/${inspection.inspection_id}`
        );

      setFindings(
        response.data
      );

    } catch (err) {

      console.error(
        "Failed to load findings:",
        err
      );

      setError(
        "Failed to load inspection findings."
      );

    } finally {

      setFindingsLoading(false);

    }

  };


  // ===================================================
  // CLOSE FINDINGS
  // ===================================================

  const closeFindings = () => {

    setSelectedInspection(null);

    setFindings([]);

    setShowFindingForm(false);

    setEditingFindingId(null);

    setMessage("");
    setError("");

  };


  // ===================================================
  // FINDING FORM RESET
  // ===================================================

  const resetFindingForm = () => {

    setFindingForm({

      finding_description: "",

      severity: "MEDIUM",

      corrective_action: "",

      due_date: "",

      status: "OPEN",

    });

    setEditingFindingId(null);

    setShowFindingForm(false);

  };


  // ===================================================
  // FINDING FORM CHANGE
  // ===================================================

  const handleFindingChange = (
    field: keyof FindingForm,
    value: string
  ) => {

    setFindingForm(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );

  };


  // ===================================================
  // CREATE / UPDATE FINDING
  // ===================================================

  const handleFindingSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    setMessage("");
    setError("");


    if (!selectedInspection) {

      setError(
        "No inspection selected."
      );

      return;
    }


    if (
      !findingForm.finding_description.trim()
    ) {

      setError(
        "Finding description is required."
      );

      return;
    }


    try {

      const data = {

        inspection_id:
          selectedInspection.inspection_id,

        finding_description:
          findingForm.finding_description,

        severity:
          findingForm.severity,

        corrective_action:
          findingForm.corrective_action,

        due_date:
          findingForm.due_date || undefined,

        status:
          findingForm.status,
      };


      if (
        editingFindingId !== null
      ) {

        await axios.put(
          `${API_URL}/findings/${editingFindingId}`,
          data
        );

        setMessage(
          "Finding updated successfully."
        );

      } else {

        await axios.post(
          `${API_URL}/findings`,
          data
        );

        setMessage(
          "Finding created successfully."
        );

      }


      const response =
        await axios.get<Finding[]>(
          `${API_URL}/findings/inspection/${selectedInspection.inspection_id}`
        );

      setFindings(
        response.data
      );

      resetFindingForm();

    } catch (err) {

      console.error(
        "Finding save error:",
        err
      );

      setError(
        "Failed to save finding."
      );

    }

  };


  // ===================================================
  // EDIT FINDING
  // ===================================================

  const handleEditFinding = (
    finding: Finding
  ) => {

    setFindingForm({

      finding_description:
        finding.finding_description,

      severity:
        finding.severity,

      corrective_action:
        finding.corrective_action ?? "",

      due_date:
        finding.due_date
          ? finding.due_date.split("T")[0]
          : "",

      status:
        finding.status,

    });

    setEditingFindingId(
      finding.finding_id
    );

    setShowFindingForm(true);

    setMessage("");
    setError("");

  };


  // ===================================================
  // DELETE FINDING
  // ===================================================

  const handleDeleteFinding = async (
    id: number
  ) => {

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this finding?"
      );

    if (!confirmed) {
      return;
    }


    try {

      await axios.delete(
        `${API_URL}/findings/${id}`
      );

      setMessage(
        "Finding deleted successfully."
      );


      if (selectedInspection) {

        const response =
          await axios.get<Finding[]>(
            `${API_URL}/findings/inspection/${selectedInspection.inspection_id}`
          );

        setFindings(
          response.data
        );

      }

    } catch (err) {

      console.error(
        "Finding delete error:",
        err
      );

      setError(
        "Failed to delete finding."
      );

    }

  };


  // ===================================================
  // RENDER FINDINGS VIEW
  // ===================================================

  if (selectedInspection) {

    return (
      <div className="inspections-page">

        {/* BACK */}

        <button
          className="inspection-back-button"
          onClick={closeFindings}
        >
          <ArrowLeft size={17} />
          Back to Inspections
        </button>


        {/* HEADER */}

        <div className="inspection-page-header">

          <div>

            <span className="page-eyebrow">
              INSPECTION FINDINGS
            </span>

            <h1>
              {selectedInspection.area}
            </h1>

            <p>
              Inspection #
              {selectedInspection.inspection_id}
              {" • "}
              {selectedInspection.inspector_name}
              {" • "}
              {new Date(
                selectedInspection.inspection_date
              ).toLocaleDateString()}
            </p>

          </div>


          <button
            className="inspection-primary-button"
            onClick={() => {

              resetFindingForm();

              setShowFindingForm(true);

              setMessage("");
              setError("");

            }}
          >
            <Plus size={18} />
            Add Finding
          </button>

        </div>


        {/* MESSAGES */}

        {message && (
          <div className="inspection-message success">
            {message}
          </div>
        )}

        {error && (
          <div className="inspection-message error">
            {error}
          </div>
        )}


        {/* FINDING FORM */}

        {showFindingForm && (

          <div className="inspection-form-card">

            <div className="inspection-form-header">

              <div>

                <span className="card-eyebrow">
                  CORRECTIVE ACTION
                </span>

                <h2>
                  {editingFindingId !== null
                    ? "Edit Finding"
                    : "Add Finding"}
                </h2>

              </div>


              <button
                className="inspection-close-button"
                onClick={resetFindingForm}
                type="button"
              >
                <X size={19} />
              </button>

            </div>


            <form
              onSubmit={
                handleFindingSubmit
              }
            >

              <div className="inspection-form-grid">


                {/* DESCRIPTION */}

                <div className="inspection-form-group full-width">

                  <label htmlFor="finding_description">
                    Finding Description
                  </label>

                  <textarea
                    id="finding_description"
                    placeholder="Describe the safety finding..."
                    value={
                      findingForm.finding_description
                    }
                    onChange={(event) =>
                      handleFindingChange(
                        "finding_description",
                        event.target.value
                      )
                    }
                    rows={4}
                    required
                  />

                </div>


                {/* SEVERITY */}

                <div className="inspection-form-group">

                  <label htmlFor="severity">
                    Severity
                  </label>

                  <select
                    id="severity"
                    value={
                      findingForm.severity
                    }
                    onChange={(event) =>
                      handleFindingChange(
                        "severity",
                        event.target.value
                      )
                    }
                  >

                    <option value="LOW">
                      Low
                    </option>

                    <option value="MEDIUM">
                      Medium
                    </option>

                    <option value="HIGH">
                      High
                    </option>

                    <option value="CRITICAL">
                      Critical
                    </option>

                  </select>

                </div>


                {/* STATUS */}

                <div className="inspection-form-group">

                  <label htmlFor="finding_status">
                    Status
                  </label>

                  <select
                    id="finding_status"
                    value={
                      findingForm.status
                    }
                    onChange={(event) =>
                      handleFindingChange(
                        "status",
                        event.target.value
                      )
                    }
                  >

                    <option value="OPEN">
                      Open
                    </option>

                    <option value="IN_PROGRESS">
                      In Progress
                    </option>

                    <option value="COMPLETED">
                      Completed
                    </option>

                    <option value="CLOSED">
                      Closed
                    </option>

                  </select>

                </div>


                {/* CORRECTIVE ACTION */}

                <div className="inspection-form-group full-width">

                  <label htmlFor="corrective_action">
                    Corrective Action
                  </label>

                  <textarea
                    id="corrective_action"
                    placeholder="Describe the corrective action required..."
                    value={
                      findingForm.corrective_action
                    }
                    onChange={(event) =>
                      handleFindingChange(
                        "corrective_action",
                        event.target.value
                      )
                    }
                    rows={3}
                  />

                </div>


                {/* DUE DATE */}

                <div className="inspection-form-group">

                  <label htmlFor="due_date">
                    Due Date
                  </label>

                  <input
                    id="due_date"
                    type="date"
                    value={
                      findingForm.due_date
                    }
                    onChange={(event) =>
                      handleFindingChange(
                        "due_date",
                        event.target.value
                      )
                    }
                  />

                </div>


              </div>


              {/* ACTIONS */}

              <div className="inspection-form-actions">

                <button
                  type="button"
                  className="inspection-secondary-button"
                  onClick={
                    resetFindingForm
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="inspection-primary-button"
                >
                  {editingFindingId !== null
                    ? "Update Finding"
                    : "Create Finding"}
                </button>

              </div>

            </form>

          </div>

        )}


        {/* FINDINGS LIST */}

        <div className="inspection-list-card">

          <div className="inspection-list-header">

            <div>

              <span className="card-eyebrow">
                SAFETY FINDINGS
              </span>

              <h2>
                Inspection Findings
              </h2>

            </div>

            <div className="inspection-count">
              {findings.length} Findings
            </div>

          </div>


          {findingsLoading ? (

            <div className="inspection-empty">
              Loading findings...
            </div>

          ) : findings.length === 0 ? (

            <div className="inspection-empty">

              <AlertTriangle size={35} />

              <h3>
                No findings recorded
              </h3>

              <p>
                Add a finding when a safety issue
                is identified during this inspection.
              </p>

            </div>

          ) : (

            <div className="finding-list">

              {findings.map((finding) => (

                <div
                  className="finding-card"
                  key={finding.finding_id}
                >

                  <div className="finding-card-main">

                    <div className="finding-card-title">

                      <span className="finding-id">
                        FINDING #{finding.finding_id}
                      </span>

                      <span
                        className={`finding-severity severity-${finding.severity.toLowerCase()}`}
                      >
                        {finding.severity}
                      </span>

                      <span
                        className={`finding-status finding-status-${finding.status.toLowerCase()}`}
                      >
                        {finding.status.replace(
                          "_",
                          " "
                        )}
                      </span>

                    </div>


                    <h3>
                      {finding.finding_description}
                    </h3>


                    {finding.corrective_action && (

                      <div className="finding-detail">

                        <span>
                          CORRECTIVE ACTION
                        </span>

                        <p>
                          {finding.corrective_action}
                        </p>

                      </div>

                    )}


                    <div className="finding-meta">

                      <div>

                        <span>
                          DUE DATE
                        </span>

                        <strong>
                          {finding.due_date
                            ? new Date(
                                finding.due_date
                              ).toLocaleDateString()
                            : "Not specified"}
                        </strong>

                      </div>

                      <div>

                        <span>
                          CREATED
                        </span>

                        <strong>
                          {new Date(
                            finding.created_at
                          ).toLocaleDateString()}
                        </strong>

                      </div>

                    </div>

                  </div>


                  <div className="finding-actions">

                    <button
                      className="inspection-edit-button"
                      onClick={() =>
                        handleEditFinding(
                          finding
                        )
                      }
                      title="Edit finding"
                    >
                      <Pencil size={16} />
                    </button>


                    <button
                      className="inspection-delete-button"
                      onClick={() =>
                        handleDeleteFinding(
                          finding.finding_id
                        )
                      }
                      title="Delete finding"
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>
    );
  }


  // ===================================================
  // RENDER INSPECTIONS LIST
  // ===================================================

  return (

    <div className="inspections-page">

      {/* PAGE HEADER */}

      <div className="inspection-page-header">

        <div>

          <span className="page-eyebrow">
            SAFETY MANAGEMENT
          </span>

          <h1>
            Safety Inspections
          </h1>

          <p>
            Schedule, monitor and manage plant safety inspections.
          </p>

        </div>


        <button
          className="inspection-primary-button"
          onClick={() => {

            setEditingInspectionId(null);

            setInspectionForm({

              inspector_id:
                users.length > 0
                  ? users[0].user_id
                  : 0,

              inspection_date:
                new Date()
                  .toISOString()
                  .split("T")[0],

              area: "",

              status: "SCHEDULED",

              remarks: "",
            });

            setShowInspectionForm(true);

            setMessage("");
            setError("");

          }}
        >
          <Plus size={18} />
          New Inspection
        </button>

      </div>


      {/* MESSAGES */}

      {message && (
        <div className="inspection-message success">
          {message}
        </div>
      )}

      {error && (
        <div className="inspection-message error">
          {error}
        </div>
      )}


      {/* INSPECTION FORM */}

      {showInspectionForm && (

        <div className="inspection-form-card">

          <div className="inspection-form-header">

            <div>

              <span className="card-eyebrow">
                INSPECTION RECORD
              </span>

              <h2>
                {editingInspectionId !== null
                  ? "Edit Inspection"
                  : "Create Inspection"}
              </h2>

            </div>


            <button
              className="inspection-close-button"
              onClick={
                resetInspectionForm
              }
              type="button"
            >
              <X size={19} />
            </button>

          </div>


          <form
            onSubmit={
              handleInspectionSubmit
            }
          >

            <div className="inspection-form-grid">


              {/* INSPECTOR */}

              <div className="inspection-form-group">

                <label htmlFor="inspector">
                  Inspector
                </label>

                <select
                  id="inspector"
                  value={
                    inspectionForm.inspector_id
                  }
                  onChange={(event) =>
                    handleInspectionChange(
                      "inspector_id",
                      Number(
                        event.target.value
                      )
                    )
                  }
                  required
                >

                  <option value={0}>
                    Select Inspector
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


              {/* DATE */}

              <div className="inspection-form-group">

                <label htmlFor="inspection_date">
                  Inspection Date
                </label>

                <input
                  id="inspection_date"
                  type="date"
                  value={
                    inspectionForm.inspection_date
                  }
                  onChange={(event) =>
                    handleInspectionChange(
                      "inspection_date",
                      event.target.value
                    )
                  }
                  required
                />

              </div>


              {/* AREA */}

              <div className="inspection-form-group">

                <label htmlFor="area">
                  Inspection Area
                </label>

                <input
                  id="area"
                  type="text"
                  placeholder="e.g. Chemical Storage Area"
                  value={
                    inspectionForm.area
                  }
                  onChange={(event) =>
                    handleInspectionChange(
                      "area",
                      event.target.value
                    )
                  }
                  maxLength={150}
                  required
                />

              </div>


              {/* STATUS */}

              <div className="inspection-form-group">

                <label htmlFor="status">
                  Status
                </label>

                <select
                  id="status"
                  value={
                    inspectionForm.status
                  }
                  onChange={(event) =>
                    handleInspectionChange(
                      "status",
                      event.target.value
                    )
                  }
                >

                  <option value="SCHEDULED">
                    Scheduled
                  </option>

                  <option value="IN_PROGRESS">
                    In Progress
                  </option>

                  <option value="COMPLETED">
                    Completed
                  </option>

                  <option value="CANCELLED">
                    Cancelled
                  </option>

                </select>

              </div>


              {/* REMARKS */}

              <div className="inspection-form-group full-width">

                <label htmlFor="remarks">
                  Remarks
                </label>

                <textarea
                  id="remarks"
                  placeholder="Enter inspection notes or remarks..."
                  value={
                    inspectionForm.remarks
                  }
                  onChange={(event) =>
                    handleInspectionChange(
                      "remarks",
                      event.target.value
                    )
                  }
                  rows={4}
                />

              </div>


            </div>


            <div className="inspection-form-actions">

              <button
                type="button"
                className="inspection-secondary-button"
                onClick={
                  resetInspectionForm
                }
              >
                Cancel
              </button>


              <button
                type="submit"
                className="inspection-primary-button"
              >
                {editingInspectionId !== null
                  ? "Update Inspection"
                  : "Create Inspection"}
              </button>

            </div>

          </form>

        </div>

      )}


      {/* INSPECTION LIST */}

      <div className="inspection-list-card">

        <div className="inspection-list-header">

          <div>

            <span className="card-eyebrow">
              RECORDS
            </span>

            <h2>
              Inspection Records
            </h2>

          </div>

          <div className="inspection-count">
            {inspections.length} Records
          </div>

        </div>


        {loading ? (

          <div className="inspection-empty">
            Loading inspection records...
          </div>

        ) : inspections.length === 0 ? (

          <div className="inspection-empty">

            <ClipboardCheck size={35} />

            <h3>
              No inspections recorded
            </h3>

            <p>
              Create your first safety inspection
              to begin monitoring plant safety
              activities.
            </p>

          </div>

        ) : (

          <div className="inspection-table-wrapper">

            <table className="inspection-table">

              <thead>

                <tr>

                  <th>
                    ID
                  </th>

                  <th>
                    Inspector
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Area
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Remarks
                  </th>

                  <th>
                    Findings
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {inspections.map(
                  (inspection) => (

                    <tr
                      key={
                        inspection.inspection_id
                      }
                    >

                      <td>
                        #
                        {
                          inspection.inspection_id
                        }
                      </td>


                      <td>

                        <strong>
                          {
                            inspection.inspector_name
                          }
                        </strong>

                      </td>


                      <td>
                        {new Date(
                          inspection.inspection_date
                        ).toLocaleDateString()}
                      </td>


                      <td>
                        {inspection.area}
                      </td>


                      <td>

                        <span
                          className={`inspection-status status-${inspection.status.toLowerCase()}`}
                        >
                          {inspection.status.replace(
                            "_",
                            " "
                          )}
                        </span>

                      </td>


                      <td>
                        {
                          inspection.remarks ||
                          "—"
                        }
                      </td>


                      <td>

                        <button
                          className="view-findings-button"
                          onClick={() =>
                            loadFindings(
                              inspection
                            )
                          }
                        >
                          <AlertTriangle
                            size={15}
                          />

                          View Findings
                        </button>

                      </td>


                      <td>

                        <div className="inspection-actions">

                          <button
                            className="inspection-edit-button"
                            onClick={() =>
                              handleEditInspection(
                                inspection
                              )
                            }
                            title="Edit inspection"
                          >
                            <Pencil size={16} />
                          </button>


                          <button
                            className="inspection-delete-button"
                            onClick={() =>
                              handleDeleteInspection(
                                inspection.inspection_id
                              )
                            }
                            title="Delete inspection"
                          >
                            <Trash2 size={16} />
                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
};


export default Inspections;