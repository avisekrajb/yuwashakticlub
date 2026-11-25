import { I } from "./Icon";

export default function Toast({ toast, onChat, onDismiss }) {
  if (!toast) return null;
  const bad = /wrong|couldn't|can't|invalid|deactivated|don't match/i.test(toast.t);
  const kind = toast.chat ? "chat" : bad ? "bad" : "ok";
  return (
    <div key={toast.id} className={"toast " + kind} role="status" style={{ "--d": (toast.chat ? 4200 : 2400) + "ms", cursor: toast.chat ? "pointer" : "default" }}
      onClick={() => { if (toast.chat && onChat) onChat(); onDismiss(); }}>
      <span className="ti">{I(kind === "chat" ? "chat" : kind === "bad" ? "info" : "check", 18)}</span>
      <span className="tt">{toast.chat ? toast.t.replace("💬 ", "") : toast.t}</span>
      <i className="tprog" />
    </div>
  );
}
