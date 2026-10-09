import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
} from "react-router-dom";

import {
  LayoutDashboard,
  FlaskConical,
  ClipboardCheck,
  TriangleAlert,
  Siren,
  FileCheck,
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Chemicals from "./pages/Chemicals";
import Inspections from "./pages/Inspections";
import Incidents from "./pages/Incidents";
import Emergency from "./pages/Emergency";
import Compliance from "./pages/Compliance";

import "./App.css";

// =====================================================
// MAIN APPLICATION
// =====================================================

function App() {
  const navigation = [
    {
      name: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Chemicals",
      path: "/chemicals",
      icon: FlaskConical,
    },
    {
      name: "Inspections",
      path: "/inspections",
      icon: ClipboardCheck,
    },
    {
      name: "Incidents",
      path: "/incidents",
      icon: TriangleAlert,
    },
    {
      name: "Emergency",
      path: "/emergency",
      icon: Siren,
    },
    {
      name: "Compliance",
      path: "/compliance",
      icon: FileCheck,
    },
  ];

  return (
    <BrowserRouter>
      <div className="app-shell">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="sidebar">

          {/* BRAND */}

          <div className="brand">
            <div className="brand-icon">
              <FlaskConical size={24} />
            </div>

            <div>
              <div className="brand-title">
                CHEM-SAFE
              </div>

              <div className="brand-subtitle">
                SAFETY MANAGEMENT
              </div>
            </div>
          </div>

          {/* NAVIGATION */}

          <nav className="sidebar-nav">
            <div className="nav-label">
              MAIN MENU
            </div>

            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                >
                  <Icon size={19} />

                  <span>
                    {item.name}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          {/* SIDEBAR FOOTER */}

          <div className="sidebar-footer">
            <div className="system-status">
              <span className="status-dot"></span>

              <div>
                <div className="status-title">
                  System Online
                </div>

                <div className="status-text">
                  Safety platform active
                </div>
              </div>
            </div>
          </div>

        </aside>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <main className="main-content">

          {/* TOP BAR */}

          <header className="topbar">
            <div>
              <span className="topbar-label">
                CHEMICAL PLANT
              </span>

              <h2>
                Safety & Compliance Management
              </h2>
            </div>

            {/* USER */}

            <div className="topbar-right">
              <div className="user-info">
                <div className="user-avatar">
                  AD
                </div>

                <div>
                  <div className="user-name">
                    Administrator
                  </div>

                  <div className="user-role">
                    Safety Management
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* PAGE CONTENT */}

          <div className="page-content">
            <Routes>

              {/* DASHBOARD */}

              <Route
                path="/"
                element={<Dashboard />}
              />

              {/* CHEMICAL MANAGEMENT */}

              <Route
                path="/chemicals"
                element={<Chemicals />}
              />

              {/* SAFETY INSPECTIONS */}

              <Route
                path="/inspections"
                element={<Inspections />}
              />

              {/* INCIDENT MANAGEMENT */}

              <Route
                path="/incidents"
                element={<Incidents />}
              />

              {/* EMERGENCY RESPONSE */}

              <Route
                path="/emergency"
                element={<Emergency />}
              />

              {/* STATUTORY COMPLIANCE */}

              <Route
                path="/compliance"
                element={<Compliance />}
              />

            </Routes>
          </div>

        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;