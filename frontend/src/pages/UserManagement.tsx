import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { RefreshCw, UserPlus, Users } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../auth/useAuth";
import type { RoleName } from "../auth/authContext";
import "./UserManagement.css";

interface ManagedUser {
  user_id: number;
  role_id: number;
  role_name: RoleName;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface CreateUserForm {
  full_name: string;
  email: string;
  password: string;
  role_id: number;
}

const roles: { role_id: number; role_name: RoleName }[] = [
  { role_id: 1, role_name: "ADMIN" },
  { role_id: 2, role_name: "SAFETY_OFFICER" },
  { role_id: 3, role_name: "PLANT_MANAGER" },
  { role_id: 4, role_name: "EMPLOYEE" },
  { role_id: 5, role_name: "COMPLIANCE_OFFICER" },
];

const responseMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === "string") return response.data.message;
  }
  return fallback;
};

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState<CreateUserForm>({
    full_name: "",
    email: "",
    password: "",
    role_id: 4,
  });
  const [roleDrafts, setRoleDrafts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ success: boolean; users: ManagedUser[] }>("/users/manage");
      setUsers(response.data.users);
      setRoleDrafts(Object.fromEntries(response.data.users.map((item) => [item.user_id, item.role_id])));
      setError("");
    } catch (loadError) {
      setError(responseMessage(loadError, "Unable to load users."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.post("/users", {
        ...form,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        role_id: Number(form.role_id),
      });
      setForm({ full_name: "", email: "", password: "", role_id: 4 });
      setMessage("User created successfully.");
      await loadUsers();
    } catch (createError) {
      setError(responseMessage(createError, "Unable to create user."));
    } finally {
      setSaving(false);
    }
  };

  const saveRole = async (managedUser: ManagedUser) => {
    const role_id = Number(roleDrafts[managedUser.user_id]);
    if (role_id === managedUser.role_id) return;
    setError("");
    setMessage("");
    try {
      const response = await api.patch<{ success: boolean; user: ManagedUser }>(
        `/users/${managedUser.user_id}/role`,
        { role_id }
      );
      setUsers((current) => current.map((item) => item.user_id === managedUser.user_id ? response.data.user : item));
      setRoleDrafts((current) => ({ ...current, [managedUser.user_id]: response.data.user.role_id }));
      setMessage(`Role updated for ${managedUser.full_name}.`);
    } catch (roleError) {
      setError(responseMessage(roleError, "Unable to update role."));
      await loadUsers();
    }
  };

  const toggleActive = async (managedUser: ManagedUser) => {
    setError("");
    setMessage("");
    try {
      const response = await api.patch<{ success: boolean; user: ManagedUser }>(
        `/users/${managedUser.user_id}/status`,
        { is_active: !managedUser.is_active }
      );
      setUsers((current) => current.map((item) => item.user_id === managedUser.user_id ? response.data.user : item));
      setMessage(`${managedUser.full_name} ${response.data.user.is_active ? "activated" : "deactivated"}.`);
    } catch (statusError) {
      setError(responseMessage(statusError, "Unable to update account status."));
    }
  };

  return (
    <div className="users-page">
      <div className="users-heading">
        <div>
          <span className="page-eyebrow">ADMINISTRATION</span>
          <h1>User Management</h1>
          <p>Create accounts and manage role assignments and active status.</p>
        </div>
        <button className="users-refresh-button" type="button" onClick={() => void loadUsers()} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <div className="users-message error" role="alert">{error}</div>}
      {message && <div className="users-message success" role="status">{message}</div>}

      <section className="users-card">
        <div className="users-card-heading">
          <UserPlus size={20} />
          <div><h2>Create user</h2><p>Set an initial password for the new account.</p></div>
        </div>
        <form className="users-create-form" onSubmit={(event) => void createUser(event)}>
          <label>Full name<input required maxLength={100} value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} /></label>
          <label>Email<input required type="email" maxLength={150} autoComplete="off" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
          <label>Initial password<input required type="password" minLength={12} autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></label>
          <label>Role<select value={form.role_id} onChange={(event) => setForm((current) => ({ ...current, role_id: Number(event.target.value) }))}>{roles.map((role) => <option key={role.role_id} value={role.role_id}>{role.role_name.replaceAll("_", " ")}</option>)}</select></label>
          <button className="users-primary-button" type="submit" disabled={saving}>{saving ? "Creating..." : "Create user"}</button>
        </form>
      </section>

      <section className="users-card">
        <div className="users-card-heading users-list-heading">
          <Users size={20} />
          <div><h2>Accounts</h2><p>{users.length} user{users.length === 1 ? "" : "s"}, including inactive accounts.</p></div>
        </div>
        {loading ? <div className="users-empty">Loading users...</div> : users.length === 0 ? <div className="users-empty">No user accounts found.</div> : (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{users.map((managedUser) => (
                <tr key={managedUser.user_id}>
                  <td><strong>{managedUser.full_name}</strong><small>#{managedUser.user_id}</small></td>
                  <td>{managedUser.email}</td>
                  <td>
                    <div className="users-role-control">
                      <select aria-label={`Role for ${managedUser.full_name}`} value={roleDrafts[managedUser.user_id] ?? managedUser.role_id} onChange={(event) => setRoleDrafts((current) => ({ ...current, [managedUser.user_id]: Number(event.target.value) }))}>
                        {roles.map((role) => <option key={role.role_id} value={role.role_id}>{role.role_name.replaceAll("_", " ")}</option>)}
                      </select>
                      <button type="button" className="users-small-button" disabled={roleDrafts[managedUser.user_id] === managedUser.role_id || managedUser.user_id === user?.userId} onClick={() => void saveRole(managedUser)}>Save</button>
                    </div>
                  </td>
                  <td><span className={`users-status ${managedUser.is_active ? "active" : "inactive"}`}>{managedUser.is_active ? "Active" : "Inactive"}</span></td>
                  <td><button type="button" className={`users-status-button ${managedUser.is_active ? "deactivate" : "activate"}`} disabled={managedUser.user_id === user?.userId} onClick={() => void toggleActive(managedUser)}>{managedUser.is_active ? "Deactivate" : "Activate"}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default UserManagement;
