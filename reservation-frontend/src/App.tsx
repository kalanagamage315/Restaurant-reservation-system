import { lazy, Suspense } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { RequireRole } from "./auth/RequireRole";
import { ErrorBoundary } from "./components/ErrorBoundary";

// ── Route-level code splitting — each page is a separate JS chunk ─────────────
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const RestaurantsPage = lazy(() => import("./pages/RestaurantsPage"));
const ReservationPage = lazy(() => import("./pages/ReservationPage"));
const AvailabilityPage = lazy(() => import("./pages/AvailabilityPage"));
const MyReservationsPage = lazy(() => import("./pages/MyReservationsPage"));
const StaffReservationsPage = lazy(() => import("./pages/StaffReservationsPage"));
const AdminTablesPage = lazy(() => import("./pages/admin/AdminTablesPage"));
const AdminStaffAssignPage = lazy(() => import("./pages/admin/AdminStaffAssignPage"));
const AdminRestaurantsPage = lazy(() => import("./pages/admin/AdminRestaurantsPage"));
const ConfirmedReservationsPage = lazy(() => import("./pages/ConfirmedReservationsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

// Fallback shown while a lazy chunk is loading
function PageLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "40vh" }}>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Loading…</div>
    </div>
  );
}


function NavBar() {
  const { user, logout, hasRole } = useAuth();
  const nav = useNavigate();

  const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    textDecoration: "none",
    padding: "7px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    color: isActive ? "#ffffff" : "rgba(255,255,255,0.7)",
    background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
    border: "1px solid",
    borderColor: isActive ? "rgba(255,255,255,0.3)" : "transparent",
    transition: "all 150ms ease",
    whiteSpace: "nowrap" as const,
  });

  const groupStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(15, 15, 25, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "12px 20px",
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              color: "white",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              fontSize: 15,
              boxShadow: "0 0 12px rgba(168,85,247,0.5)",
              flexShrink: 0,
            }}
            title="Reservation System"
          >
            🍽️
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 16,
              color: "#ffffff",
              letterSpacing: "-0.3px",
              whiteSpace: "nowrap",
            }}
          >
            Dine<span style={{ color: "#a855f7" }}>Ease</span>
          </span>
        </div>

        {/* Links */}
        <nav style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          {/* Public */}
          <div style={groupStyle}>
            <NavLink to="/" style={linkStyle} end>
              🏠 Restaurants
            </NavLink>
          </div>

          {/* Customer */}
          {user && (
            <div style={groupStyle}>
              <NavLink to="/availability" style={linkStyle}>
                📅 Availability
              </NavLink>
              <NavLink to="/my-reservations" style={linkStyle}>
                📋 My Reservations
              </NavLink>
            </div>
          )}

          {/* Admin */}
          {user && hasRole("ADMIN") && (
            <div style={groupStyle}>
              <NavLink to="/admin/tables" style={linkStyle}>
                🪑 Manage Tables
              </NavLink>
              <NavLink to="/admin/staff-assign" style={linkStyle}>
                👥 Manage Staff
              </NavLink>
              <NavLink to="/admin/restaurants" style={linkStyle}>
                🍴 Manage Restaurants
              </NavLink>
            </div>
          )}

          {/* Staff/Admin */}
          {user && hasRole("STAFF", "ADMIN") && (
            <div style={groupStyle}>
              <NavLink to="/staff" style={linkStyle}>
                🗂️ Manage Reservations
              </NavLink>
              <NavLink to="/confirmed" style={linkStyle}>
                ✅ Confirmed
              </NavLink>
            </div>
          )}
        </nav>

        {/* Right side auth */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {!user ? (
            <>
              <NavLink to="/login" style={linkStyle}>
                Login
              </NavLink>
              <NavLink
                to="/register"
                style={() => ({
                  textDecoration: "none",
                  padding: "7px 16px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  border: "1px solid rgba(168,85,247,0.4)",
                  transition: "all 150ms ease",
                  boxShadow: "0 0 10px rgba(168,85,247,0.3)",
                })}
              >
                Register
              </NavLink>
            </>
          ) : (
            <>
              <button
                onClick={() => nav("/profile")}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.08)",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.85)",
                  maxWidth: 200,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                title="Edit Profile"
              >
                <span style={{ fontSize: 16 }}>👤</span>
                <span>
                  <b style={{ color: "#ffffff" }}>{user.fullName ?? user.email}</b>{" "}
                  <span style={{ opacity: 0.6, fontSize: 11 }}>({user.roles.join(", ")})</span>
                </span>
              </button>

              <button
                onClick={() => logout()}
                style={{
                  padding: "7px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(239,68,68,0.4)",
                  background: "rgba(239,68,68,0.12)",
                  color: "#f87171",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span>🚪</span> Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(135deg, #432a5bff 0%, #343e88ff 50%, #77829cff 100%)",
      }}
    >
      <NavBar />

      <div
        style={{
          padding: 24,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<ErrorBoundary><RestaurantsPage /></ErrorBoundary>} />
            <Route path="/restaurants/:id" element={<ErrorBoundary><ReservationPage /></ErrorBoundary>} />

            {/* Auth */}
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
            <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" replace />} />

            {/* Customer */}
            <Route path="/availability" element={user ? <ErrorBoundary><AvailabilityPage /></ErrorBoundary> : <Navigate to="/login" replace />} />
            <Route path="/my-reservations" element={user ? <ErrorBoundary><MyReservationsPage /></ErrorBoundary> : <Navigate to="/login" replace />} />

            {/* Profile (all logged-in users) */}
            <Route path="/profile" element={user ? <ErrorBoundary><ProfilePage /></ErrorBoundary> : <Navigate to="/login" replace />} />

            {/* Staff/Admin */}
            <Route
              path="/staff"
              element={
                <RequireRole roles={["STAFF", "ADMIN"]}>
                  <ErrorBoundary><StaffReservationsPage /></ErrorBoundary>
                </RequireRole>
              }
            />
            <Route
              path="/restaurants/:id/reserve"
              element={
                <RequireRole roles={["ADMIN", "STAFF", "CUSTOMER"]}>
                  <ErrorBoundary><ReservationPage /></ErrorBoundary>
                </RequireRole>
              }
            />
            <Route
              path="/admin/tables"
              element={
                <RequireRole roles={["ADMIN"]}>
                  <AdminTablesPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/staff-assign"
              element={
                <RequireRole roles={["ADMIN"]}>
                  <AdminStaffAssignPage />
                </RequireRole>
              }
            />
            <Route
              path="/confirmed"
              element={
                <RequireRole roles={["STAFF", "ADMIN"]}>
                  <ConfirmedReservationsPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/restaurants"
              element={
                <RequireRole roles={["ADMIN"]}>
                  <AdminRestaurantsPage />
                </RequireRole>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}