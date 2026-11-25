import { I } from "../common/Icon";
import { GR } from "../../utils";

export default function StatCards({ d, go }) {
  const items = [["Members", d.users.length, "users", "users"], ["Active", d.users.filter((u) => u.active).length, "user", "users"], ["Blogs", d.blogs.length, "blog", "blogs"], ["Comments", d.comments.length, "chat", "comments"],
    ["Gallery items", d.gallery.length, "image", "gallery"], ["Banners", d.banners.length, "film", "banners"], ["Team", d.team.length, "users", "team"], ["Chat groups", d.groups.length, "chat", "chat"]];
  return (
    <div className="sg">{items.map(([l, n, ic, t], i) => (
      <button className="stt" key={l} onClick={() => go(t)}><i style={{ background: `linear-gradient(135deg,${GR[i % 6]})` }}>{I(ic, 22)}</i><div><b>{n}</b><span>{l}</span></div></button>))}</div>
  );
}
