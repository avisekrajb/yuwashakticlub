import { useEffect, useMemo, useState } from "react";
import Crud, { up, rm } from "./Crud";
import Loader from "../common/Loader";
import Avatar from "../common/Avatar";
import { I } from "../common/Icon";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { stamp } from "../../utils";

function previewOf(m) {
  if (m.deleted) return "This message was deleted";
  if (m.text) return m.text;
  const first = (m.attachments || [])[0];
  if (!first) return "Message";
  if (first.type === "image") return "📷 Photo";
  if (first.type === "video") return "🎬 Video";
  if (first.type === "audio") return "🎤 Voice note";
  return first.name || "Attachment";
}

export default function ChatTab() {
  const { d, set, conversations, messages, users, loadMessages, deleteChatMessage, say } = useApp();
  const { me } = useAuth();
  const [room, setRoom] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const rooms = useMemo(() => {
    const map = new Map();
    d.groups.forEach((g) =>
      map.set(g.id, {
        id: g.id,
        type: "group",
        name: g.name,
        desc: g.desc || "",
        members: g.members || [],
      })
    );
    conversations.forEach((c) => {
      if (c.type === "group") {
        if (!map.has(c.id)) return;
        map.set(c.id, { ...map.get(c.id), ...c });
      } else {
        map.set(c.id, c);
      }
    });
    return Array.from(map.values());
  }, [conversations, d.groups]);

  const nameOf = (u) => {
    const id = (u.members || []).find((m) => m !== me?.id);
    return users.find((x) => x.id === id)?.name || u.name || "Direct message";
  };

  useEffect(() => {
    if (!room && rooms.length) setRoom(rooms[0].id);
    if (room && rooms.length && !rooms.some((r) => r.id === room)) setRoom(rooms[0].id);
  }, [rooms, room]);

  useEffect(() => {
    if (!room) return;
    loadMessages(room).catch((err) => say(err.message || "Could not load messages"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const current = rooms.find((r) => r.id === room) || null;
  const list = useMemo(
    () => [...(messages[room] || [])].sort((a, b) => (a.t || 0) - (b.t || 0)),
    [messages, room]
  );

  const removeMessage = async (m) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    setBusyId(m.id);
    try {
      await deleteChatMessage(room, m.id, true);
      say("Message deleted");
    } catch (err) {
      say(err.message || "Could not delete the message");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Crud
        title="Chat groups"
        items={d.groups}
        say={say}
        onSave={up(set.groups)}
        onDel={(g) => {
          rm(set.groups)(g);
          if (room === g.id) setRoom(null);
        }}
        fields={[
          { k: "name", label: "Group name" },
          { k: "desc", label: "Description", opt: true },
        ]}
        card={(g) => (
          <>
            <b># {g.name}</b>
            <small>{g.desc || "Club group chat"}</small>
          </>
        )}
      />

      <div className="bar" style={{ marginTop: 26 }}>
        <h2>Moderate messages</h2>
        <select
          className="in"
          style={{ width: "auto", maxWidth: 260 }}
          value={room || ""}
          onChange={(e) => setRoom(e.target.value)}
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.type === "group" ? `# ${r.name}` : `DM · ${nameOf(r)}`}
            </option>
          ))}
        </select>
      </div>

      {!current && <p className="muted">Create a group or start a direct message to moderate it.</p>}

      {current && (
        <div className="mod-head">
          {current.type === "group" ? (
            <div className="av grad chat-group-av">#</div>
          ) : (
            <Avatar u={users.find((u) => u.id === (current.members || []).find((m) => m !== me?.id)) || { name: nameOf(current) }} />
          )}
          <div>
            <b>{current.type === "group" ? `# ${current.name}` : nameOf(current)}</b>
            <small className="muted">
              {current.type === "group"
                ? `${(current.members || []).length} members`
                : "Direct message"}{" "}
              · {list.length} message{list.length === 1 ? "" : "s"}
            </small>
          </div>
          <button
            type="button"
            className="btn line sm"
            onClick={() => loadMessages(room).catch((err) => say(err.message || "Could not refresh"))}
          >
            Refresh
          </button>
        </div>
      )}

      {current && !list.length && <p className="muted">No messages in this conversation.</p>}

      {current &&
        list.map((m) => {
          const sender = users.find((u) => u.id === m.from) || m.sender;
          return (
            <div className="row mod-row" key={m.id}>
              <div className="grow">
                <small>
                  {sender?.name || "Former member"} · {stamp(m.t)}
                  {m.editedAt ? " · edited" : ""}
                </small>
                <b style={{ whiteSpace: "normal" }}>{previewOf(m)}</b>
                {m.replyTo?.text && <small className="muted">↪ {m.replyTo.text}</small>}
              </div>
              <button
                type="button"
                className="ib red"
                aria-label="Delete message"
                onClick={() => removeMessage(m)}
                disabled={busyId === m.id}
              >
                {busyId === m.id ? <Loader /> : I("trash")}
              </button>
            </div>
          );
        })}
    </>
  );
}
