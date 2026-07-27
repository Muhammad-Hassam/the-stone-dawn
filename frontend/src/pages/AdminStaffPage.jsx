import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

const emptyForm = { name: "", email: "", password: "", role: "user" };

export default function AdminStaffPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get("/auth/users");
      setUsers(data.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axiosClient.post("/auth/users", form);
      toast.success(`${form.name} added`);
      setForm(emptyForm);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRoleToggle = async (u) => {
    const newRole = u.role === "admin" ? "user" : "admin";
    try {
      await axiosClient.patch(`/auth/users/${u.id}`, { role: newRole });
      toast.success(`${u.name} is now ${newRole}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleActiveToggle = async (u) => {
    try {
      await axiosClient.patch(`/auth/users/${u.id}`, { isActive: !u.isActive });
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Remove ${u.name} permanently?`)) return;
    try {
      await axiosClient.delete(`/auth/users/${u.id}`);
      toast.success("Staff member removed");
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-3xl mx-auto px-6 pt-14 pb-24">
        <h1 className="font-display text-3xl text-ink mb-8">Staff</h1>

        {/* New staff form */}
        <form
          onSubmit={handleCreate}
          className="bg-card border border-rule rounded-md p-6 mb-10 grid sm:grid-cols-2 gap-4"
        >
          <div className="sm:col-span-2">
            <h3 className="font-display text-lg text-ink mb-1">Add staff</h3>
            <p className="font-ui text-[12px] text-muted">
              Creates a login the new staff member can use right away.
            </p>
          </div>

          <div>
            <label className="block font-ui text-[12px] text-muted mb-1.5">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full font-serif border border-rule rounded-md focus:border-ink bg-paper px-3 py-2 outline-none"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block font-ui text-[12px] text-muted mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full font-serif border border-rule rounded-md focus:border-ink bg-paper px-3 py-2 outline-none"
              placeholder="jane@example.com"
            />
          </div>

          <div>
            <label className="block font-ui text-[12px] text-muted mb-1.5">
              Temporary Password
            </label>
            <input
              type="text"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full font-serif border border-rule rounded-md focus:border-ink bg-paper px-3 py-2 outline-none"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="block font-ui text-[12px] text-muted mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full font-serif border border-rule rounded-md focus:border-ink bg-paper px-3 py-2 outline-none"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="font-ui text-sm font-medium bg-ink text-card px-5 py-2.5 rounded-md hover:opacity-85 disabled:opacity-50 transition-opacity"
            >
              {creating ? "Adding…" : "Add Staff"}
            </button>
          </div>
        </form>

        {/* Roster list */}
        {loading && <p className="font-serif text-muted">Loading…</p>}

        <div className="divide-y divide-rule border border-rule rounded-md">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-display text-base text-ink">
                  {u.name}
                  {u.id === currentUser.id && (
                    <span className="font-ui text-[11px] text-muted ml-2">(you)</span>
                  )}
                </p>
                <p className="font-ui text-[12px] text-muted mt-1">
                  {u.email} &middot; joined {new Date(u.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm ${
                    u.role === "admin" ? "text-redpen border-redpen" : "text-muted border-rule"
                  }`}
                >
                  {u.role === "admin" ? "Admin" : "User"}
                </span>

                <span
                  className={`font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm ${
                    u.isActive ? "text-greenpen border-greenpen" : "text-muted border-rule"
                  }`}
                >
                  {u.isActive ? "Active" : "Suspended"}
                </span>

                <button
                  onClick={() => handleRoleToggle(u)}
                  disabled={u.id === currentUser.id}
                  className="font-ui text-[12px] text-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Make {u.role === "admin" ? "User" : "Admin"}
                </button>

                <button
                  onClick={() => handleActiveToggle(u)}
                  disabled={u.id === currentUser.id}
                  className="font-ui text-[12px] text-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {u.isActive ? "Suspend" : "Reinstate"}
                </button>

                <button
                  onClick={() => handleDelete(u)}
                  disabled={u.id === currentUser.id}
                  className="font-ui text-[12px] text-muted hover:text-redpen disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
