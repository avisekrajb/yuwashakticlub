import Crud, { up, rm } from "./Crud";
import BlogForm from "./BlogForm";
import Thumbs from "../common/Thumbs";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

export default function BlogsTab() {
  const { d, set, say, pushNotif } = useApp();
  const { me } = useAuth();
  return (
    <Crud title="Blogs" items={d.blogs} say={say} Form={BlogForm}
      onSave={(b, e) => { up(set.blogs)(b, e); if (!e) pushNotif({ type: "blog", text: "New blog: " + b.title, ref: b.id, by: me.id }); }}
      onDel={(b) => { rm(set.blogs)(b); set.comments((l) => l.filter((c) => c.blogId !== b.id)); }}
      card={(b) => <><b>{b.title}</b><small>{b.tag} · {b.date}{(b.photos || []).length > 0 ? " · " + b.photos.length + " photo" + (b.photos.length > 1 ? "s" : "") : ""}</small><Thumbs list={b.photos || []} sm /></>} />
  );
}
