import Avatar from "../common/Avatar";
import { I } from "../common/Icon";

export default function AdminHeader({ setOpen, cur, tab, dark, setDark, me }) {
  return (
    <header className="atb">
      <button className="ib hb" onClick={() => setOpen(true)} aria-label="Open menu">{I("menu", 22)}</button>
      <div className="sp"><small>Admin / {cur[1]}</small><h2>{tab === "home" ? "Dashboard" : cur[1]}</h2></div>
      <button className="ib" onClick={() => setDark(!dark)} aria-label="Toggle dark mode">{I(dark ? "sun" : "moon", 20)}</button>
      <div className="chip"><Avatar u={me} size={32} /><span>{me.name}</span></div>
    </header>
  );
}
