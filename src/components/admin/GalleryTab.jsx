import { useState } from "react";
import Crud, { up, rm } from "./Crud";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

export default function GalleryTab() {
  const { d, set, say, pushNotif } = useApp();
  const { me } = useAuth();
  const [gt, setGt] = useState("photo");
  return (<>
    <div className="seg">{[["photo", "Photos"], ["video", "Videos"]].map(([k, l]) => <button key={k} className={gt === k ? "on" : ""} onClick={() => setGt(k)}>{l} <span>{d.gallery.filter((g) => (g.type === "video") === (k === "video")).length}</span></button>)}</div>
    {gt === "photo"
      ? <Crud key="p" title="Photos" items={d.gallery.filter((g) => g.type !== "video")} say={say} onSave={up(set.gallery)} onDel={rm(set.gallery)}
          fields={[{ k: "title", label: "Caption" }, { k: "url", label: "Image link (optional)", opt: true }]}
          card={(g) => <><b>{g.title}</b><small>{g.url || "Placeholder image"}</small></>}
          extra={(g) => <button className={"pill" + (g.slide ? "" : " gr")} onClick={() => { set.gallery((l) => l.map((x) => (x.id === g.id ? { ...x, slide: !x.slide } : x))); say(g.slide ? "Removed from home slider" : "Added to home slider"); }}>{g.slide ? "In slider" : "Not in slider"}</button>} />
      : <Crud key="v" title="Videos" items={d.gallery.filter((g) => g.type === "video")} say={say}
          onSave={(v, e) => { up(set.gallery)({ ...v, type: "video" }, e); if (!e) pushNotif({ type: "video", text: "New vlog: " + v.title, ref: v.id, by: me.id }); }} onDel={rm(set.gallery)}
          fields={[{ k: "title", label: "Video title" }, { k: "url", label: "Video link (YouTube or .mp4 link)" }, { k: "thumb", label: "Cover image link (optional)", opt: true }]}
          card={(g) => <><b>▶ {g.title}</b><small>{g.url}</small></>} />}
  </>);
}
