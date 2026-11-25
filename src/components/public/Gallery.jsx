import { useState } from "react";
import Photo from "../common/Photo";
import VideoCard from "./VideoCard";

export default function Gallery({ d, onPlay, initTab }) {
  const [tab, setTab] = useState(initTab || "photos");
  const photos = d.gallery.filter((g) => g.type !== "video");
  const videos = d.gallery.filter((g) => g.type === "video");
  return (<>
    <h1 className="ttl">Gallery</h1><p className="sub">Moments from our events and activities.</p>
    <div className="seg">{[["photos", "Photos", photos.length], ["videos", "Videos", videos.length]].map(([k, l, n]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l} <span>{n}</span></button>)}</div>
    {tab === "photos"
      ? (photos.length ? <div className="gal">{photos.map((g, i) => <Photo key={g.id} g={g} i={i} />)}</div> : <p className="muted">No photos yet.</p>)
      : (videos.length ? <div className="gal vid">{videos.map((g, i) => <VideoCard key={g.id} g={g} i={i} onPlay={onPlay} />)}</div> : <p className="muted">No videos yet.</p>)}
  </>);
}
