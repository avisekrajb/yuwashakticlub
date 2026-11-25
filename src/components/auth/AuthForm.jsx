import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function AuthForm({ mode, onDone, switchTo }) {
  const { login, register } = useAuth();
  const [f, setF] = useState({ name: "", email: "", pw: "", pw2: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setF({ ...f, [key]: e.target.value });
  const loginMode = mode === "login";

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr("");
    const email = f.email.trim().toLowerCase();
    if (!loginMode) {
      if (f.name.trim().length < 2) return setErr("Enter your full name.");
      if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email address.");
      if (f.pw.length < 6) return setErr("Password needs at least 6 characters.");
      if (f.pw !== f.pw2) return setErr("Passwords don't match.");
    } else {
      if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email address.");
      if (!f.pw) return setErr("Enter your password.");
    }
    setBusy(true);
    try {
      if (loginMode) {
        const user = await login(email, f.pw);
        onDone(user, "Welcome back, " + user.name.split(" ")[0] + "!", false);
      } else {
        const user = await register(f.name.trim(), email, f.pw);
        onDone(user, "Account created. Welcome to the club!", true);
      }
    } catch (x) {
      setErr(x.message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {!loginMode && (
        <>
          <label className="fl">Full name</label>
          <input className="in" value={f.name} onChange={set("name")} autoComplete="name" />
        </>
      )}
      <label className="fl">Email</label>
      <input className="in" type="email" value={f.email} onChange={set("email")} autoComplete="email" />
      <label className="fl">Password</label>
      <input
        className="in"
        type="password"
        value={f.pw}
        onChange={set("pw")}
        autoComplete={loginMode ? "current-password" : "new-password"}
      />
      {!loginMode && (
        <>
          <label className="fl">Confirm password</label>
          <input className="in" type="password" value={f.pw2} onChange={set("pw2")} autoComplete="new-password" />
        </>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Please wait…" : loginMode ? "Log in" : "Create account"}
      </button>
      <p className="ctr">
        {loginMode ? "New here? " : "Already a member? "}
        <button type="button" className="lnk" onClick={switchTo}>
          {loginMode ? "Sign up" : "Log in"}
        </button>
      </p>
      {loginMode && <p className="muted ctr" style={{ fontSize: 12 }}>Demo: a@gmail.com / 123456</p>}
    </form>
  );
}
