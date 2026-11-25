import { I } from "../common/Icon";
import Notifications from "./Notifications";
import AccountMenu from "./AccountMenu";

export default function Header({ nav, page, go, unreadTotal, compact, hideOnMobile, openAuth, askLogout, onOpenNotif }) {
  return (
    <header className={"hd" + (compact ? " compact" : "") + (hideOnMobile ? " chat-hide-mob" : "")}>
      <div className="logo" onClick={() => go("home")} style={{ cursor: "pointer" }}>
        <i className="grad">Y</i>
        <b>
          Yuwa Shakti<small>Shree Club</small>
        </b>
      </div>
      {!compact && (
        <nav className="dnav">
          {nav.map(([key, label, icon]) => (
            <button key={key} className={page === key ? "on" : ""} onClick={() => go(key)}>
              {I(icon, 18)}
              {label}
              {key === "chat" && unreadTotal > 0 && <i className="bdg inl">{unreadTotal > 99 ? "99+" : unreadTotal}</i>}
            </button>
          ))}
        </nav>
      )}
      <div className="hr">
        <Notifications onOpen={onOpenNotif} />
        <AccountMenu go={go} openAuth={openAuth} askLogout={askLogout} />
      </div>
    </header>
  );
}
