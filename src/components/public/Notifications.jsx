import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { I } from "../common/Icon";
import { ago } from "../../utils";

const ICONS = {
  post: "blog",
  story: "image",
  live: "video",
  comment: "chat",
  reaction: "check",
  share: "send",
  message: "chat",
  call: "phone",
  welcome: "check",
  system: "info",
};

export default function Notifications({ onOpen }) {
  const { me } = useAuth();
  const { notifs, unreadNotifs, markAllNotifsRead, clearNotifs, removeNotif, markNotifRead } = useApp();
  const [open, setOpen] = useState(false);

  if (!me) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadNotifs > 0) markAllNotifsRead();
  };

  const pick = (n) => {
    setOpen(false);
    if (!n.read) markNotifRead(n.id);
    if (onOpen) onOpen(n);
  };

  return (
    <div className="nb">
      <button
        className="bell"
        onClick={toggle}
        aria-label={unreadNotifs > 0 ? `${unreadNotifs} new notifications` : "Notifications"}
        aria-expanded={open}
      >
        {I("bell", 20)}
        {unreadNotifs > 0 && <i className="bdg">{unreadNotifs > 9 ? "9+" : unreadNotifs}</i>}
      </button>
      {open && (
        <>
          <div className="pop-scrim" onClick={() => setOpen(false)} />
          <div className="np" role="dialog" aria-label="Notifications">
            <div className="nph">
              <b>Notifications</b>
              <div className="nph-actions">
                {notifs.length > 0 && <button className="lnk xs" onClick={clearNotifs}>Clear</button>}
                <button className="ib" style={{ width: 30, height: 30 }} onClick={() => setOpen(false)} aria-label="Close">×</button>
              </div>
            </div>
            <div className="npl">
              {!notifs.length && <p className="muted ctr" style={{ padding: "22px 0" }}>You are all caught up 🎉</p>}
              {notifs.slice(0, 30).map((n) => (
                <div key={n.id} className={"nt" + (n.read ? "" : " new")}>
                  <button className="nt-main" onClick={() => pick(n)}>
                    <span className={"ti2 " + (n.type || "system")}>{I(ICONS[n.type] || "info", 16)}</span>
                    <span className="nt-txt">
                      <b>{n.text}</b>
                      <small>{ago(n.t)}</small>
                    </span>
                  </button>
                  <button className="nt-x" onClick={() => removeNotif(n.id)} aria-label="Delete notification">×</button>
                </div>
              ))}
            </div>
            <div className="npf">Notifications are removed automatically after 30 days.</div>
          </div>
        </>
      )}
    </div>
  );
}
