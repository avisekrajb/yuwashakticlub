import StatCards from "./StatCards";
import Avatar from "../common/Avatar";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { ago } from "../../utils";

export default function Dashboard({ go }) {
  const { d } = useApp();
  const { me } = useAuth();
  return (<>
    <div className="wl"><h1>Welcome back, {me.name.split(" ")[0]} 👋</h1><p>Here is what is happening at Shree Yuwa Shakti Club.</p>
      <div className="row2"><button className="btn sm" onClick={() => go("blogs")}>+ New blog</button><button className="btn ghost sm" onClick={() => go("gallery")}>+ Add photos</button><button className="btn ghost sm" onClick={() => go("users")}>Manage users</button></div></div>
    <StatCards d={d} go={go} />
    <div className="two">
      <div className="card"><h3>Latest comments</h3>{!d.comments.length && <p>No comments yet.</p>}
        {[...d.comments].reverse().slice(0, 3).map((c) => <div className="cm1" key={c.id}><Avatar u={d.users.find((x) => x.id === c.userId) || { name: c.name }} size={34} /><div className="grow"><b>{c.name}</b><small>{ago(c.t)}</small><p>{c.text}</p></div></div>)}</div>
      <div className="card"><h3>New members</h3>
        {d.users.filter((u) => u.role !== "admin").slice(-3).reverse().map((u) => <div className="cm1" key={u.id}><Avatar u={u} size={34} /><div className="grow"><b>{u.name}</b><p>{u.email}</p></div><span className={"pill" + (u.active ? "" : " off")}>{u.active ? "Active" : "Inactive"}</span></div>)}</div>
    </div>
  </>);
}
