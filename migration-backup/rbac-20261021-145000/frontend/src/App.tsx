import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import {
  ClipboardCheck,
  FileCheck,
  FlaskConical,
  LayoutDashboard,
  Siren,
  TriangleAlert,
} from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Chemicals from "./pages/Chemicals";
import Compliance from "./pages/Compliance";
import Emergency from "./pages/Emergency";
import Incidents from "./pages/Incidents";
import Inspections from "./pages/Inspections";
import Login from "./pages/Login";
import Monitoring from "./pages/Monitoring";
import { AuthProvider } from "./auth/AuthProvider";
import { useAuth } from "./auth/useAuth";
import "./App.css";

const navigation = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "EMPLOYEE", "COMPLIANCE_OFFICER"] },
  { name: "Chemicals", path: "/chemicals", icon: FlaskConical, roles: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "EMPLOYEE", "COMPLIANCE_OFFICER"] },
  { name: "Inspections", path: "/inspections", icon: ClipboardCheck, roles: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "EMPLOYEE", "COMPLIANCE_OFFICER"] },
  { name: "Incidents", path: "/incidents", icon: TriangleAlert, roles: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "EMPLOYEE", "COMPLIANCE_OFFICER"] },
  { name: "Emergency", path: "/emergency", icon: Siren, roles: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "EMPLOYEE", "COMPLIANCE_OFFICER"] },
  { name: "Compliance", path: "/compliance", icon: FileCheck, roles: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "COMPLIANCE_OFFICER"] },
  { name: "Monitoring", path: "/monitoring", icon: TriangleAlert, roles: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"] },
];

function ProtectedLayout() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="login-page">Loading session...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><FlaskConical size={24} /></div>
          <div><div className="brand-title">CHEM-SAFE</div><div className="brand-subtitle">SAFETY MANAGEMENT</div></div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-label">MAIN MENU</div>
          {navigation.filter((item) => item.roles.includes(user.roleName)).map(({ name, path, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === "/"} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <Icon size={19} /><span>{name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer"><div className="system-status"><span className="status-dot"></span><div><div className="status-title">System Online</div><div className="status-text">{user.roleName}</div></div></div></div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div><span className="topbar-label">CHEMICAL PLANT</span><h2>Safety & Compliance Management</h2></div>
          <div className="topbar-right"><div className="user-info"><div className="user-avatar">{user.fullName.slice(0, 2).toUpperCase()}</div><div><div className="user-name">{user.fullName}</div><div className="user-role">{user.roleName}</div></div><button type="button" onClick={() => void logout()}>Log out</button></div></div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chemicals" element={<Chemicals />} />
            <Route path="/inspections" element={<Inspections />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/emergency" element={<Emergency />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/monitoring" element={<Monitoring />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
