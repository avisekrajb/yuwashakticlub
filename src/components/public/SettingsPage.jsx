import { useState } from "react";
import Modal from "../common/Modal";
import Loader from "../common/Loader";
import { I } from "../common/Icon";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../lib/api";
import { beep } from "../../utils";

export default function SettingsPage({ askLogout }) {
  const { me, updateMe, logout } = useAuth();
  const { say } = useApp();
  const { dark, setDark, notif, setNotif } = useTheme();

  const settings = me?.settings || {};
  const [noise, setNoise] = useState(settings.noiseCancellation !== false);
  const [speaker, setSpeaker] = useState(settings.speakerDefault !== false);
  const [savingSetting, setSavingSetting] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delPassword, setDelPassword] = useState("");
  const [delConfirm, setDelConfirm] = useState("");
  const [delErr, setDelErr] = useState("");
  const [delBusy, setDelBusy] = useState(false);

  const saveSetting = async (patch) => {
    setSavingSetting(true);
    try {
      const user = await api.patch("/users/me/settings", patch);
      updateMe(user);
    } catch (x) {
      say(x.message || "Could not save the setting");
    } finally {
      setSavingSetting(false);
    }
  };

  const toggleDark = () => {
    const value = !dark;
    setDark(value);
    saveSetting({ theme: value ? "dark" : "light" });
    say(value ? "Dark mode on" : "Light mode on");
  };

  const toggleNotif = () => {
    const value = !notif;
    setNotif(value);
    saveSetting({ notifyChat: value, notifyPosts: value, notifyCalls: value });
    if (value) {
      try {
        if (window.Notification && Notification.permission === "default") Notification.requestPermission();
      } catch (_err) {
        /* ignore */
      }
      beep();
    }
    say(value ? "Notifications turned on" : "Notifications muted");
  };

  const toggleNoise = () => {
    const value = !noise;
    setNoise(value);
    saveSetting({ noiseCancellation: value });
    say(value ? "Noise cancellation on by default" : "Noise cancellation off by default");
  };

  const toggleSpeaker = () => {
    const value = !speaker;
    setSpeaker(value);
    saveSetting({ speakerDefault: value });
    say(value ? "Speaker on by default" : "Speaker off by default");
  };

  const changePassword = async () => {
    if (pwdBusy) return;
    setPwdErr("");
    if (!current) return setPwdErr("Enter your current password.");
    if (next.length < 6) return setPwdErr("New password needs at least 6 characters.");
    if (next === current) return setPwdErr("New password must be different from the current one.");
    if (next !== confirm) return setPwdErr("New passwords don't match.");
    setPwdBusy(true);
    try {
      await api.patch("/auth/password", { currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      say("Password changed. Use it next time you log in.");
    } catch (x) {
      setPwdErr(x.message || "Could not change the password");
    } finally {
      setPwdBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (delBusy) return;
    setDelErr("");
    if (!delPassword) return setDelErr("Enter your password.");
    if (delConfirm.trim().toUpperCase() !== "DELETE") return setDelErr('Type DELETE to confirm.');
    setDelBusy(true);
    try {
      await api.delete("/auth/account", { body: { password: delPassword, confirm: "DELETE" } });
      say("Your account has been permanently deleted");
      setDelOpen(false);
      logout();
    } catch (x) {
      setDelErr(x.message || "Could not delete the account");
    } finally {
      setDelBusy(false);
    }
  };

  return (
    <div className="set">
      <h1 className="ttl">Settings</h1>
      <p className="sub">Make the club app yours.</p>

      <div className="card">
        <h3>Preferences</h3>
        <div className="sw">
          <span>
            Dark mode
            <small className="muted" style={{ display: "block" }}>Easier on the eyes at night</small>
          </span>
          <button
            className={"tg" + (dark ? " on" : "")}
            onClick={toggleDark}
            role="switch"
            aria-checked={dark}
            aria-label="Dark mode"
          />
        </div>
        <div className="sw">
          <span>
            Notifications
            <small className="muted" style={{ display: "block" }}>Chat, posts, calls and live alerts</small>
          </span>
          <button
            className={"tg" + (notif ? " on" : "")}
            onClick={toggleNotif}
            role="switch"
            aria-checked={notif}
            aria-label="Notifications"
          />
        </div>
        <div className="sw">
          <span>
            Noise cancellation
            <small className="muted" style={{ display: "block" }}>Use it by default in calls</small>
          </span>
          <button
            className={"tg" + (noise ? " on" : "")}
            onClick={toggleNoise}
            role="switch"
            aria-checked={noise}
            aria-label="Noise cancellation"
            disabled={savingSetting}
          />
        </div>
        <div className="sw" style={{ borderBottom: 0 }}>
          <span>
            Speaker by default
            <small className="muted" style={{ display: "block" }}>Use the speaker in calls</small>
          </span>
          <button
            className={"tg" + (speaker ? " on" : "")}
            onClick={toggleSpeaker}
            role="switch"
            aria-checked={speaker}
            aria-label="Speaker by default"
            disabled={savingSetting}
          />
        </div>
      </div>

      <div className="card" onKeyDown={(e) => e.key === "Enter" && changePassword()}>
        <h3>Change password</h3>
        <input
          className="in"
          type="password"
          placeholder="Current password"
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value);
            setPwdErr("");
          }}
          autoComplete="current-password"
          style={{ marginTop: 10 }}
        />
        <input
          className="in"
          type="password"
          placeholder="New password (min 6 characters)"
          style={{ marginTop: 8 }}
          value={next}
          onChange={(e) => {
            setNext(e.target.value);
            setPwdErr("");
          }}
          autoComplete="new-password"
        />
        <input
          className="in"
          type="password"
          placeholder="Confirm new password"
          style={{ marginTop: 8 }}
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setPwdErr("");
          }}
          autoComplete="new-password"
        />
        {pwdErr && <p className="err" role="alert">{pwdErr}</p>}
        <button className="btn full" type="button" onClick={changePassword} disabled={pwdBusy}>
          {pwdBusy ? <Loader /> : "Update password"}
        </button>
      </div>

      <div className="card danger-card">
        <h3>Delete account</h3>
        <p className="muted">
          Permanently remove your profile, posts, stories, messages and notifications. This cannot
          be undone.
        </p>
        <button className="btn red full" type="button" onClick={() => setDelOpen(true)}>
          {I("trash", 17)} Delete my account
        </button>
      </div>

      <button className="btn line full" onClick={askLogout}>
        {I("out", 17)} Log out
      </button>

      {delOpen && (
        <Modal
          title="Delete your account?"
          sub="Everything you created will be permanently deleted. This cannot be undone."
          onClose={delBusy ? () => {} : () => setDelOpen(false)}
        >
          <label className="fl">Password</label>
          <input
            className="in"
            type="password"
            value={delPassword}
            onChange={(e) => {
              setDelPassword(e.target.value);
              setDelErr("");
            }}
            autoComplete="current-password"
            disabled={delBusy}
          />
          <label className="fl">Type DELETE to confirm</label>
          <input
            className="in"
            value={delConfirm}
            onChange={(e) => {
              setDelConfirm(e.target.value);
              setDelErr("");
            }}
            placeholder="DELETE"
            disabled={delBusy}
          />
          {delErr && <p className="err" role="alert">{delErr}</p>}
          <div className="row2" style={{ marginTop: 10 }}>
            <button className="btn line" type="button" onClick={() => setDelOpen(false)} disabled={delBusy}>
              Cancel
            </button>
            <button className="btn red" type="button" onClick={deleteAccount} disabled={delBusy}>
              {delBusy ? <Loader /> : "Delete forever"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
