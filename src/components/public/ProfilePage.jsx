import { useRef, useState } from "react";
import Avatar from "../common/Avatar";
import Loader from "../common/Loader";
import { I } from "../common/Icon";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import { uploadAvatar } from "../../lib/upload";

export default function ProfilePage() {
  const { me, updateMe } = useAuth();
  const { posts, setUsers, say } = useApp();
  const [name, setName] = useState(me.name || "");
  const [bio, setBio] = useState(me.bio || "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef(null);

  const myPosts = posts.filter((p) => p.author?.id === me.id || p.mine);

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    setUploading(true);
    try {
      const result = await uploadAvatar(file, setProgress);
      const next = result.user || { photo: result.url };
      updateMe(next);
      setUsers((list) => list.map((u) => (u.id === me.id ? { ...u, ...next } : u)));
      say("Profile photo updated");
    } catch (x) {
      setErr(x.message || "Could not upload the photo");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const removePhoto = async () => {
    setErr("");
    try {
      const user = await api.patch("/users/me", { photo: "", photoPublicId: "" });
      updateMe(user);
      setUsers((list) => list.map((u) => (u.id === me.id ? { ...u, photo: "" } : u)));
      say("Profile photo removed");
    } catch (x) {
      setErr(x.message || "Could not remove the photo");
    }
  };

  const save = async () => {
    if (saving) return;
    if (name.trim().length < 2) return setErr("Enter your name (min 2 characters).");
    setSaving(true);
    setErr("");
    try {
      const user = await api.patch("/users/me", { name: name.trim(), bio: bio.trim() });
      updateMe(user);
      setUsers((list) => list.map((u) => (u.id === me.id ? { ...u, ...user } : u)));
      say("Profile updated");
    } catch (x) {
      setErr(x.message || "Could not save your profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="set">
      <h1 className="ttl">Profile</h1>
      <p className="sub">Your account details and how other members see you.</p>

      <div className="card pf profile-card">
        <Avatar u={me} size={92} />
        <div className="profile-main">
          <h3>{me.name}</h3>
          <p>{me.email}</p>
          <div className="profile-badges">
            <span className="tag">{me.role === "admin" ? "Club admin" : "Member"}</span>
            <span className="meta">
              {myPosts.length} post{myPosts.length === 1 ? "" : "s"}
              {me.createdAt ? ` · joined ${new Date(me.createdAt).toLocaleDateString()}` : ""}
            </span>
          </div>
          <div className="row2" style={{ marginTop: 10 }}>
            <button
              className="btn sm"
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader /> : me.photo ? "Change photo" : "Upload photo"}
            </button>
            {me.photo && (
              <button className="btn line sm" type="button" onClick={removePhoto} disabled={uploading}>
                Remove photo
              </button>
            )}
          </div>
          {uploading && progress > 0 && (
            <div className="pc-progress" style={{ marginTop: 10 }}>
              <span style={{ width: progress + "%" }} />
              <small>{progress}%</small>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
      </div>

      <div className="card" onKeyDown={(e) => e.key === "Enter" && e.target.tagName === "INPUT" && save()}>
        <h3>Edit details</h3>
        <label className="fl">Name</label>
        <input
          className="in"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErr("");
          }}
          maxLength={80}
        />
        <label className="fl">Email</label>
        <input className="in" value={me.email || ""} disabled />
        <label className="fl">About you</label>
        <textarea
          className="in"
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            setErr("");
          }}
          maxLength={300}
          placeholder="Tell the club a little about yourself…"
        />
        <small className="muted">{bio.length}/300</small>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn full" type="button" onClick={save} disabled={saving}>
          {saving ? <Loader /> : "Save changes"}
        </button>
      </div>

      <div className="card profile-tips">
        <h3>Your content</h3>
        <div className="profile-rows">
          <div>
            <span>{I("image", 18)} Posts</span>
            <b>{myPosts.length}</b>
          </div>
          <div>
            <span>{I("chat", 18)} Member since</span>
            <b>{me.createdAt ? new Date(me.createdAt).toLocaleDateString() : "—"}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
