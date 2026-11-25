import { useRef, useState } from "react";
import Avatar from "../common/Avatar";
import Loader from "../common/Loader";
import { I } from "../common/Icon";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { uploadAvatar } from "../../lib/upload";

export default function Sidebar({ tab, go, open, tabs, groups, counts, askLogout }) {
  const { setUsers, say } = useApp();
  const { me, updateMe } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pf = useRef(null);

  const onPhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadAvatar(f, setProgress);
      const user = result.user || { photo: result.url };
      updateMe(user);
      setUsers((l) => l.map((u) => (u.id === me.id ? { ...u, ...user } : u)));
      say("Profile photo updated");
    } catch (x) {
      say(x.message || "Couldn't upload that image");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <aside className={"sb" + (open ? " open" : "")}>
      <div className="brand logo">
        <i className="grad">Y</i>
        <b>
          Yuwa Shakti<small>Admin panel</small>
        </b>
      </div>
      {groups.map(([g, keys]) => (
        <div key={g}>
          <h6>{g}</h6>
          {keys.map((k) => {
            const t = tabs.find((x) => x[0] === k);
            return (
              <button key={k} className={"ni" + (tab === k ? " on" : "")} onClick={() => go(k)}>
                {I(t[2], 19)}
                {t[1]}
                {counts[k] != null && <em>{counts[k]}</em>}
              </button>
            );
          })}
        </div>
      ))}
      <div className="me">
        <div className="mc">
          <button
            className="avb"
            onClick={() => pf.current && pf.current.click()}
            title="Change photo"
            aria-label="Change profile photo"
            disabled={uploading}
          >
            {uploading ? <Loader /> : <Avatar u={me} size={38} />}
          </button>
          <input ref={pf} type="file" accept="image/*" hidden onChange={onPhoto} />
          <div>
            <b>{me.name}</b>
            <small>{me.email}</small>
            {uploading && progress > 0 && <small>{progress}%</small>}
          </div>
        </div>
        <button className="lo" onClick={askLogout}>
          {I("out", 18)}Logout
        </button>
      </div>
    </aside>
  );
}
