import { useEffect, useMemo, useState } from "react";
import Modal from "../common/Modal";
import Loader from "../common/Loader";
import Avatar from "../common/Avatar";
import { I } from "../common/Icon";
import { api } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

export default function UsersTab() {
  const { users, setUsers, say } = useApp();
  const { me } = useAuth();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", bio: "", role: "user" });
  const [formErr, setFormErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const list = await api.get("/users?includeInactive=true");
      if (Array.isArray(list)) setUsers(list);
    } catch (err) {
      say(err.message || "Could not load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (u) =>
        String(u.name || "").toLowerCase().includes(needle) ||
        String(u.email || "").toLowerCase().includes(needle)
    );
  }, [users, q]);

  const patch = async (u, body, message) => {
    if (busyId) return;
    setBusyId(u.id);
    try {
      const updated = await api.patch(`/users/${u.id}`, body);
      if (updated?.id) {
        setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
      }
      say(message);
      return updated;
    } catch (err) {
      say(err.message || "Could not update the member");
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const toggleRole = (u) => {
    if (u.id === me?.id) return say("You cannot change your own role");
    const next = u.role === "admin" ? "user" : "admin";
    patch(u, { role: next }, next === "admin" ? `${u.name} is now an admin` : `${u.name} is now a member`);
  };

  const toggleActive = (u) => {
    if (u.id === me?.id) return say("You cannot deactivate your own account");
    const next = u.active === false;
    patch(u, { active: next }, next ? `${u.name} reactivated` : `${u.name} deactivated`);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name || "", bio: u.bio || "", role: u.role || "user" });
    setFormErr("");
  };

  const save = async () => {
    if (!editing || saving) return;
    if (form.name.trim().length < 2) return setFormErr("Name needs at least 2 characters.");
    const body = { name: form.name.trim(), bio: form.bio.trim() };
    if (editing.id !== me?.id) body.role = form.role;
    setSaving(true);
    setFormErr("");
    try {
      const updated = await patch(editing, body, "Member updated");
      if (updated) setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const activeCount = users.filter((u) => u.active !== false).length;

  return (
    <div>
      <div className="bar">
        <h2>Members</h2>
        <button type="button" className="btn line sm" onClick={loadAll} disabled={loading}>
          {loading ? <Loader /> : "Refresh"}
        </button>
      </div>

      <div className="sbx" style={{ marginBottom: 14 }}>
        {I("search", 18)}
        <input
          className="in"
          placeholder="Search members by name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search members"
        />
      </div>

      <p className="meta" style={{ marginBottom: 12 }}>
        {activeCount} active · {users.length} total
      </p>

      {!filtered.length && <p className="muted">No members match your search.</p>}

      {filtered.map((u) => {
        const isSelf = u.id === me?.id;
        const busy = busyId === u.id;
        return (
          <div className="row" key={u.id}>
            <div className="grow" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Avatar u={u} size={38} />
              <div style={{ minWidth: 0 }}>
                <b>
                  {u.name}
                  {u.role === "admin" ? " (admin)" : ""}
                  {isSelf ? " · you" : ""}
                </b>
                <small>{u.email}</small>
              </div>
            </div>

            <span className={"pill" + (u.active === false ? " off" : "")}>
              {u.active === false ? "Inactive" : u.role === "admin" ? "Admin" : "Member"}
            </span>

            {!isSelf && (
              <button
                type="button"
                className="pill gr"
                onClick={() => toggleRole(u)}
                disabled={busy}
                title={u.role === "admin" ? "Demote to member" : "Promote to admin"}
              >
                {u.role === "admin" ? "Make member" : "Make admin"}
              </button>
            )}

            {!isSelf && (
              <button
                type="button"
                className={"pill" + (u.active === false ? "" : " off")}
                onClick={() => toggleActive(u)}
                disabled={busy}
                title={u.active === false ? "Reactivate member" : "Deactivate member"}
              >
                {u.active === false ? "Activate" : "Deactivate"}
              </button>
            )}

            <button type="button" className="ib" aria-label="Edit member" onClick={() => openEdit(u)} disabled={busy}>
              {busy ? <Loader /> : I("edit")}
            </button>
          </div>
        );
      })}

      {editing && (
        <Modal
          wide
          title="Edit member"
          sub={editing.email}
          onClose={saving ? () => {} : () => setEditing(null)}
        >
          <div className="pf" style={{ marginBottom: 8 }}>
            <Avatar u={editing} size={56} />
            <div>
              <b>{editing.name}</b>
              <small className="muted">
                Joined {editing.createdAt ? new Date(editing.createdAt).toLocaleDateString() : "—"}
              </small>
            </div>
          </div>

          <label className="fl">Name</label>
          <input
            className="in"
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              setFormErr("");
            }}
            maxLength={80}
            disabled={saving}
          />

          <label className="fl">About</label>
          <textarea
            className="in"
            value={form.bio}
            onChange={(e) => {
              setForm({ ...form, bio: e.target.value });
              setFormErr("");
            }}
            maxLength={300}
            disabled={saving}
          />

          {editing.id !== me?.id && (
            <>
              <label className="fl">Role</label>
              <select
                className="in"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                disabled={saving}
              >
                <option value="user">Member</option>
                <option value="admin">Admin</option>
              </select>
            </>
          )}

          {formErr && <p className="err" role="alert">{formErr}</p>}

          <div className="row2" style={{ marginTop: 10 }}>
            <button type="button" className="btn line" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn" onClick={save} disabled={saving}>
              {saving ? <Loader /> : "Save changes"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
