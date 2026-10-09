import { useEffect, useState } from "react";
import axios from "axios";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  FileCheck,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  Download,
  FileText,
} from "lucide-react";

interface ComplianceRecord {
  compliance_id: number;
  requirement_name: string;
  regulatory_authority: string | null;
  description: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
  responsible_user: number | null;
  responsible_user_name?: string | null;
}

interface ComplianceDocument {
  document_id: number;
  compliance_id: number;
  document_name: string;
  document_path: string;
  uploaded_by: number | null;
  uploaded_at: string;
  requirement_name?: string;
  uploaded_by_name?: string | null;
}

interface ComplianceForm {
  requirement_name: string;
  regulatory_authority: string;
  description: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  responsible_user: string;
}

const API_URL = "http://localhost:5000/api/compliance";
const DOCUMENT_API_URL = "http://localhost:5000/api/compliance-documents";

const emptyForm: ComplianceForm = {
  requirement_name: "",
  regulatory_authority: "",
  description: "",
  issue_date: "",
  expiry_date: "",
  status: "ACTIVE",
  responsible_user: "",
};

// =====================================================
// DATE HANDLING
// =====================================================

// Convert PostgreSQL date timestamps to the local date.
// Handles both YYYY-MM-DD and ISO timestamp formats.
function toDateInput(value: string | null): string {
  if (!value) return "";

  // A date-only string should not undergo timezone conversion.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string | null): string {
  const date = toDateInput(value);

  if (!date) return "—";

  const [year, month, day] = date.split("-");

  return `${day}-${month}-${year}`;
}

// =====================================================
// EXPIRY STATUS
// =====================================================

function getExpiryStatus(record: ComplianceRecord): string {
  if (record.status.toUpperCase() !== "ACTIVE") {
    return record.status;
  }

  if (!record.expiry_date) {
    return "ACTIVE";
  }

  const expiry = toDateInput(record.expiry_date);

  if (!expiry) {
    return record.status;
  }

  const today = new Date();

  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return expiry < todayString ? "EXPIRED" : "ACTIVE";
}

// =====================================================
// COMPLIANCE PAGE
// =====================================================

function Compliance() {
  const [records, setRecords] = useState<ComplianceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ComplianceForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Compliance document management
  const [documentRecord, setDocumentRecord] =
    useState<ComplianceRecord | null>(null);
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const [documentMessage, setDocumentMessage] = useState("");

  // =====================================================
  // FETCH COMPLIANCE RECORDS
  // =====================================================

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await axios.get<ComplianceRecord[]>(API_URL);

      setRecords(response.data);
    } catch (err) {
      console.error("Failed to load compliance records:", err);
      setError(
        "Unable to load compliance records. Check the backend."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRecords();
  }, []);

  // =====================================================
  // ADD RECORD
  // =====================================================

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  // =====================================================
  // EDIT RECORD
  // =====================================================

  const openEditForm = (record: ComplianceRecord) => {
    setEditingId(record.compliance_id);

    setForm({
      requirement_name: record.requirement_name,
      regulatory_authority:
        record.regulatory_authority ?? "",
      description: record.description ?? "",
      issue_date: toDateInput(record.issue_date),
      expiry_date: toDateInput(record.expiry_date),
      status: record.status,
      responsible_user:
        record.responsible_user?.toString() ?? "",
    });

    setShowForm(true);
  };

  // =====================================================
  // CLOSE FORM
  // =====================================================

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  // =====================================================
  // CREATE / UPDATE RECORD
  // =====================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!form.requirement_name.trim()) {
      setError("Requirement name is required.");
      return;
    }

    if (
      form.issue_date &&
      form.expiry_date &&
      form.expiry_date < form.issue_date
    ) {
      setError("Expiry date cannot be before the issue date.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        requirement_name: form.requirement_name.trim(),
        regulatory_authority:
          form.regulatory_authority.trim() || null,
        description: form.description.trim() || null,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        status: form.status,
        responsible_user: form.responsible_user
          ? Number(form.responsible_user)
          : null,
      };

      if (editingId !== null) {
        await axios.put(
          `${API_URL}/${editingId}`,
          payload
        );
      } else {
        await axios.post(API_URL, payload);
      }

      closeForm();
      await fetchRecords();
    } catch (err) {
      console.error("Failed to save compliance record:", err);
      setError(
        "Unable to save the record. Please check the entered details."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE RECORD
  // =====================================================

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this compliance record?"
    );

    if (!confirmed) return;

    try {
      setError("");

      await axios.delete(`${API_URL}/${id}`);

      await fetchRecords();
    } catch (err) {
      console.error("Failed to delete compliance record:", err);
      setError("Unable to delete the compliance record.");
    }
  };

  // =====================================================
  // COMPLIANCE DOCUMENT MANAGEMENT
  // =====================================================

  const fetchDocuments = async (complianceId: number) => {
    try {
      setDocumentsLoading(true);
      setDocumentError("");
      const response = await axios.get<ComplianceDocument[]>(
        `${DOCUMENT_API_URL}/requirement/${complianceId}`
      );
      setDocuments(response.data);
    } catch (err) {
      console.error("Failed to load compliance documents:", err);
      setDocumentError("Unable to load documents. Check the backend.");
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const openDocuments = async (record: ComplianceRecord) => {
    setDocumentRecord(record);
    setDocuments([]);
    setDocumentName("");
    setSelectedFile(null);
    setDocumentError("");
    setDocumentMessage("");
    await fetchDocuments(record.compliance_id);
  };

  const closeDocuments = () => {
    setDocumentRecord(null);
    setDocuments([]);
    setDocumentName("");
    setSelectedFile(null);
    setDocumentError("");
    setDocumentMessage("");
  };

  const handleDocumentUpload = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!documentRecord) return;
    if (!documentName.trim()) {
      setDocumentError("Enter a document name.");
      return;
    }
    if (!selectedFile) {
      setDocumentError("Choose a PDF file to upload.");
      return;
    }
    if (
      !selectedFile.name.toLowerCase().endsWith(".pdf") ||
      selectedFile.type !== "application/pdf"
    ) {
      setDocumentError("Only PDF files are allowed.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setDocumentError("The PDF must be 10 MB or smaller.");
      return;
    }

    try {
      setUploadingDocument(true);
      setDocumentError("");
      setDocumentMessage("");

      const payload = new FormData();
      payload.append("compliance_id", String(documentRecord.compliance_id));
      payload.append("document_name", documentName.trim());
      payload.append("document", selectedFile);

      await axios.post(DOCUMENT_API_URL, payload);

      setDocumentMessage("PDF uploaded successfully.");
      setDocumentName("");
      setSelectedFile(null);
      const fileInput = document.getElementById(
        "compliance-document-file"
      ) as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      await fetchDocuments(documentRecord.compliance_id);
    } catch (err) {
      console.error("Failed to upload compliance document:", err);
      setDocumentError(
        "Unable to upload the PDF. Check the file and backend response."
      );
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDocumentDelete = async (document: ComplianceDocument) => {
    const confirmed = window.confirm(
      `Delete "${document.document_name}"? This will remove the stored PDF and its database record.`
    );
    if (!confirmed || !documentRecord) return;

    try {
      setDocumentError("");
      setDocumentMessage("");
      await axios.delete(`${DOCUMENT_API_URL}/${document.document_id}`);
      setDocumentMessage("Document deleted successfully.");
      await fetchDocuments(documentRecord.compliance_id);
    } catch (err) {
      console.error("Failed to delete compliance document:", err);
      setDocumentError("Unable to delete the document.");
    }
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredRecords = records.filter((record) => {
    const query = search.toLowerCase();

    return (
      record.requirement_name.toLowerCase().includes(query) ||
      (record.regulatory_authority ?? "")
        .toLowerCase()
        .includes(query) ||
      record.status.toLowerCase().includes(query)
    );
  });

  // =====================================================
  // STATISTICS
  // =====================================================

  const activeCount = records.filter(
    (record) => getExpiryStatus(record) === "ACTIVE"
  ).length;

  const expiredCount = records.filter(
    (record) => getExpiryStatus(record) === "EXPIRED"
  ).length;

  const otherCount =
    records.length - activeCount - expiredCount;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="compliance-page">
      {/* PAGE HEADING */}

      <div className="page-heading">
        <div>
          <span className="page-eyebrow">
            REGULATORY MANAGEMENT
          </span>

          <h1>Statutory Compliance</h1>

          <p>
            Track regulatory requirements, certificates, and expiry dates.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Requirement
        </button>
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div className="compliance-error">
          <AlertCircle size={18} />

          <span>{error}</span>

          <button
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* STATISTICS */}

      <div className="compliance-stats">
        <div className="compliance-stat-card">
          <div className="compliance-stat-icon">
            <FileCheck size={21} />
          </div>

          <div>
            <span>Total Requirements</span>
            <strong>{records.length}</strong>
          </div>
        </div>

        <div className="compliance-stat-card">
          <div className="compliance-stat-icon active">
            <CheckCircle size={21} />
          </div>

          <div>
            <span>Active</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="compliance-stat-card">
          <div className="compliance-stat-icon expired">
            <AlertCircle size={21} />
          </div>

          <div>
            <span>Expired</span>
            <strong>{expiredCount}</strong>
          </div>
        </div>

        <div className="compliance-stat-card">
          <div className="compliance-stat-icon pending">
            <Clock size={21} />
          </div>

          <div>
            <span>Other Status</span>
            <strong>{otherCount}</strong>
          </div>
        </div>
      </div>

      {/* COMPLIANCE REGISTER */}

      <section className="compliance-panel">
        <div className="compliance-panel-header">
          <div>
            <h2>Compliance Register</h2>

            <p>
              Manage statutory requirements and their validity.
            </p>
          </div>

          {/* SEARCH */}

          <div className="compliance-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search requirements..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="compliance-empty">
            Loading compliance records...
          </div>
        ) : filteredRecords.length === 0 ? (
          /* EMPTY STATE */

          <div className="compliance-empty">
            <FileCheck size={32} />

            <strong>No compliance records found</strong>

            <span>
              {search
                ? "Try a different search term."
                : "Add a requirement to get started."}
            </span>
          </div>
        ) : (
          /* RECORD TABLE */

          <div className="compliance-table-wrapper">
            <table className="compliance-table">
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>Authority</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Responsible Person</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => {
                  const status = getExpiryStatus(record);

                  return (
                    <tr key={record.compliance_id}>
                      <td>
                        <div className="compliance-requirement">
                          <strong>
                            {record.requirement_name}
                          </strong>

                          {record.description && (
                            <span>
                              {record.description}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        {record.regulatory_authority || "—"}
                      </td>

                      <td>
                        {formatDate(record.issue_date)}
                      </td>

                      <td>
                        {formatDate(record.expiry_date)}
                      </td>

                      <td>
                        {record.responsible_user_name || "—"}
                      </td>

                      <td>
                        <span
                          className={`compliance-badge ${status
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td>
                        <div className="compliance-actions">
                          <button
                            className="icon-button"
                            title="Manage documents"
                            aria-label={`Manage documents for ${record.requirement_name}`}
                            onClick={() => void openDocuments(record)}
                          >
                            <FileText size={16} />
                          </button>

                          <button
                            className="icon-button"
                            title="Edit"
                            onClick={() =>
                              openEditForm(record)
                            }
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            className="icon-button danger"
                            title="Delete"
                            onClick={() =>
                              void handleDelete(
                                record.compliance_id
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ADD / EDIT MODAL */}

      {showForm && (
        <div className="compliance-modal-backdrop">
          <div
            className="compliance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compliance-form-title"
          >
            <div className="compliance-modal-header">
              <div>
                <span className="page-eyebrow">
                  COMPLIANCE REGISTER
                </span>

                <h2 id="compliance-form-title">
                  {editingId === null
                    ? "Add Requirement"
                    : "Edit Requirement"}
                </h2>
              </div>

              <button
                className="icon-button"
                onClick={closeForm}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="compliance-form-grid">
                {/* REQUIREMENT NAME */}

                <label className="compliance-form-full">
                  Requirement Name *

                  <input
                    required
                    value={form.requirement_name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        requirement_name: event.target.value,
                      })
                    }
                    placeholder="e.g. Fire Safety Certificate"
                  />
                </label>

                {/* AUTHORITY */}

                <label className="compliance-form-full">
                  Regulatory Authority

                  <input
                    value={form.regulatory_authority}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        regulatory_authority:
                          event.target.value,
                      })
                    }
                    placeholder="e.g. Regulatory authority"
                  />
                </label>

                {/* ISSUE DATE */}

                <label>
                  Issue Date

                  <input
                    type="date"
                    value={form.issue_date}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        issue_date: event.target.value,
                      })
                    }
                  />
                </label>

                {/* EXPIRY DATE */}

                <label>
                  Expiry Date

                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        expiry_date: event.target.value,
                      })
                    }
                  />
                </label>

                {/* STATUS */}

                <label>
                  Status

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value,
                      })
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="UNDER_REVIEW">
                      Under Review
                    </option>
                  </select>
                </label>

                {/* RESPONSIBLE USER */}

                <label>
                  Responsible User ID

                  <input
                    type="number"
                    min="1"
                    value={form.responsible_user}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        responsible_user: event.target.value,
                      })
                    }
                    placeholder="e.g. 1"
                  />
                </label>

                {/* DESCRIPTION */}

                <label className="compliance-form-full">
                  Description

                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        description: event.target.value,
                      })
                    }
                    placeholder="Additional details..."
                  />
                </label>
              </div>

              {/* FORM ACTIONS */}

              <div className="compliance-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId === null
                      ? "Create Requirement"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLIANCE DOCUMENTS MODAL */}
      {documentRecord && (
        <div className="compliance-modal-backdrop">
          <div
            className="compliance-modal compliance-documents-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compliance-documents-title"
          >
            <div className="compliance-modal-header">
              <div>
                <span className="page-eyebrow">DOCUMENT MANAGEMENT</span>
                <h2 id="compliance-documents-title">Compliance Documents</h2>
                <p>{documentRecord.requirement_name}</p>
              </div>
              <button
                className="icon-button"
                onClick={closeDocuments}
                aria-label="Close document manager"
              >
                <X size={20} />
              </button>
            </div>

            {documentError && (
              <div className="compliance-error">
                <AlertCircle size={18} />
                <span>{documentError}</span>
                <button
                  onClick={() => setDocumentError("")}
                  aria-label="Dismiss error"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {documentMessage && (
              <div className="compliance-document-success">
                <CheckCircle size={17} />
                <span>{documentMessage}</span>
              </div>
            )}

            <form onSubmit={handleDocumentUpload} className="compliance-document-form">
              <h3>Upload a PDF</h3>
              <label>
                Document name *
                <input
                  required
                  value={documentName}
                  onChange={(event) => setDocumentName(event.target.value)}
                  placeholder="e.g. Fire Safety Certificate"
                />
              </label>
              <label>
                PDF file * (maximum 10 MB)
                <input
                  id="compliance-document-file"
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] ?? null)
                  }
                />
              </label>
              <div className="compliance-form-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={uploadingDocument}
                >
                  <Upload size={17} />
                  {uploadingDocument ? "Uploading..." : "Upload PDF"}
                </button>
              </div>
            </form>

            <div className="compliance-document-list">
              <h3>Uploaded Documents</h3>
              {documentsLoading ? (
                <div className="compliance-empty">Loading documents...</div>
              ) : documents.length === 0 ? (
                <div className="compliance-empty">
                  <FileText size={28} />
                  <strong>No documents uploaded</strong>
                  <span>Upload a PDF to attach it to this requirement.</span>
                </div>
              ) : (
                <div className="compliance-document-items">
                  {documents.map((document) => (
                    <div
                      className="compliance-document-item"
                      key={document.document_id}
                    >
                      <div className="compliance-document-info">
                        <FileText size={20} />
                        <div>
                          <strong>{document.document_name}</strong>
                          <span>
                            Uploaded {formatDate(document.uploaded_at)}
                          </span>
                        </div>
                      </div>
                      <div className="compliance-actions">
                        <a
                          className="icon-button"
                          title="Download PDF"
                          aria-label={`Download ${document.document_name}`}
                          href={`${DOCUMENT_API_URL}/${document.document_id}/download`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download size={16} />
                        </a>
                        <button
                          className="icon-button danger"
                          title="Delete document"
                          aria-label={`Delete ${document.document_name}`}
                          onClick={() => void handleDocumentDelete(document)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="compliance-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeDocuments}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Compliance;