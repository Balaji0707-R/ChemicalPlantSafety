-- Chemical Plant Safety Management System
-- PostgreSQL Database Schema

-- =========================
-- ROLES
-- =========================

CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- =========================
-- USERS
-- =========================

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(role_id),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- CHEMICALS
-- =========================

CREATE TABLE chemicals (
    chemical_id SERIAL PRIMARY KEY,
    chemical_name VARCHAR(150) NOT NULL,
    cas_number VARCHAR(50),
    hazard_class VARCHAR(100),
    physical_state VARCHAR(30),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- CHEMICAL STORAGE
-- =========================

CREATE TABLE chemical_storage (
    storage_id SERIAL PRIMARY KEY,
    chemical_id INTEGER NOT NULL REFERENCES chemicals(chemical_id),
    storage_location VARCHAR(150) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit VARCHAR(30) NOT NULL,
    maximum_capacity DECIMAL(12,2),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- SAFETY INSPECTIONS
-- =========================

CREATE TABLE inspections (
    inspection_id SERIAL PRIMARY KEY,
    inspector_id INTEGER NOT NULL REFERENCES users(user_id),
    inspection_date DATE NOT NULL,
    area VARCHAR(150) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- INSPECTION FINDINGS
-- =========================

CREATE TABLE inspection_findings (
    finding_id SERIAL PRIMARY KEY,
    inspection_id INTEGER NOT NULL REFERENCES inspections(inspection_id)
        ON DELETE CASCADE,
    finding_description TEXT NOT NULL,
    severity VARCHAR(30) NOT NULL,
    corrective_action TEXT,
    due_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- INCIDENTS
-- =========================

CREATE TABLE incidents (
    incident_id SERIAL PRIMARY KEY,
    reported_by INTEGER NOT NULL REFERENCES users(user_id),
    incident_type VARCHAR(100) NOT NULL,
    severity VARCHAR(30) NOT NULL,
    location VARCHAR(150) NOT NULL,
    incident_date TIMESTAMP NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- INCIDENT ACTIONS
-- =========================

CREATE TABLE incident_actions (
    action_id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incidents(incident_id)
        ON DELETE CASCADE,
    action_description TEXT NOT NULL,
    assigned_to INTEGER REFERENCES users(user_id),
    due_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    completed_at TIMESTAMP
);

-- =========================
-- EMERGENCY CONTACTS
-- =========================

CREATE TABLE emergency_contacts (
    contact_id SERIAL PRIMARY KEY,
    contact_name VARCHAR(100) NOT NULL,
    organization VARCHAR(150),
    contact_type VARCHAR(50),
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- =========================
-- EMERGENCY PROCEDURES
-- =========================

CREATE TABLE emergency_procedures (
    procedure_id SERIAL PRIMARY KEY,
    procedure_name VARCHAR(150) NOT NULL,
    emergency_type VARCHAR(100) NOT NULL,
    instructions TEXT NOT NULL,
    evacuation_area VARCHAR(150),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- COMPLIANCE RECORDS
-- =========================

CREATE TABLE compliance_records (
    compliance_id SERIAL PRIMARY KEY,
    requirement_name VARCHAR(200) NOT NULL,
    regulatory_authority VARCHAR(150),
    description TEXT,
    issue_date DATE,
    expiry_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    responsible_user INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- COMPLIANCE DOCUMENTS
-- =========================

CREATE TABLE compliance_documents (
    document_id SERIAL PRIMARY KEY,
    compliance_id INTEGER NOT NULL REFERENCES compliance_records(compliance_id)
        ON DELETE CASCADE,
    document_name VARCHAR(200) NOT NULL,
    document_path TEXT,
    uploaded_by INTEGER REFERENCES users(user_id),
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);