import { I } from "../common/Icon";

export default function BottomNav({ nav, page, go, unreadTotal, hidden }) {
  return (
    <nav className={"bn mob" + (hidden ? " hide" : "")}>
      {nav.map(([key, label, icon]) => (
        <button key={key} className={(page === key ? "on" : "") + (key === "posts" ? " nav-post" : "")} onClick={() => go(key)}>
          <span className="ic">
            {I(icon, 22)}
            {key === "chat" && unreadTotal > 0 && <i className="bdg">{unreadTotal > 99 ? "99+" : unreadTotal}</i>}
          </span>
          <span className="lb">{label}</span>
        </button>
      ))}
    </nav>
  );
}
