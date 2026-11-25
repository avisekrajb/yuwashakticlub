import { useMemo, useState } from "react";
import Avatar from "../common/Avatar";
import { I } from "../common/Icon";
import { stamp } from "../../utils";

function previewOf(conv) {
  const last = conv.lastMessage;
  if (!last) return "No messages yet";
  if (typeof last === "string") return last;
  if (last.text) return last.text;
  if (last.attachments?.length) return "📎 Attachment";
  return "No messages yet";
}

function timeOf(conv) {
  const t = conv.lastAt || conv.t || conv.lastMessage?.at || conv.lastMessage?.createdAt;
  return t ? stamp(new Date(t).getTime()) : "";
}

export default function ChatList({
  conversations,
  users,
  me,
  selectedId,
  onSelect,
  onSelectUser,
  onlineIds = [],
  typing = {},
  unread = 0,
}) {
  const [q, setQ] = useState("");
  const [people, setPeople] = useState(false);

  const otherOf = (conv) => {
    if (conv.type === "group") return null;
    const id = (conv.members || []).find((m) => m !== me.id);
    return users.find((u) => u.id === id) || null;
  };

  const sorted = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        const ta = new Date(a.lastAt || a.t || 0).getTime();
        const tb = new Date(b.lastAt || b.t || 0).getTime();
        return tb - ta;
      }),
    [conversations]
  );

  const groups = sorted.filter((c) => c.type === "group");
  const directs = sorted.filter((c) => c.type !== "group");
  const needle = q.trim().toLowerCase();
  const matchConv = (c) => {
    if (!needle) return true;
    const name = c.type === "group" ? c.name : otherOf(c)?.name || c.name || "";
    return (
      String(name).toLowerCase().includes(needle) ||
      String(previewOf(c)).toLowerCase().includes(needle)
    );
  };
  const members = users.filter(
    (u) =>
      u.id !== me.id &&
      u.active !== false &&
      (!needle || u.name?.toLowerCase().includes(needle) || u.email?.toLowerCase().includes(needle))
  );

  const item = (conv) => {
    const isGroup = conv.type === "group";
    const other = otherOf(conv);
    const title = isGroup ? conv.name : other?.name || conv.name || "Member";
    const isOnline = other ? onlineIds.includes(other.id) : false;
    const isTyping = Boolean(typing[conv.id]);
    return (
      <button
        key={conv.id}
        type="button"
        className={"ci" + (selectedId === conv.id ? " on" : "")}
        onClick={() => onSelect(conv)}
      >
        {isGroup ? (
          <div className="av grad chat-group-av">#</div>
        ) : (
          <span className="chat-av-wrap">
            <Avatar u={other || { name: title }} />
            <i className={"chat-presence" + (isOnline ? " on" : "")} />
          </span>
        )}
        <div className="ci-main">
          <b>{title}</b>
          <small className={isTyping ? "typing" : ""}>
            {isTyping ? "typing…" : previewOf(conv)}
          </small>
        </div>
        <div className="rt">
          <span className="cd">{timeOf(conv)}</span>
          {conv.unread > 0 && <i className="bdg inl">{conv.unread > 99 ? "99+" : conv.unread}</i>}
        </div>
      </button>
    );
  };

  return (
    <div className="cl chat-list">
      <div className="ct chat-list-head">
        <div>
          <h2>Chats</h2>
          <small className="muted">
            {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
            {unread > 0 ? ` · ${unread} unread` : ""}
          </small>
        </div>
        <button
          type="button"
          className={"ib" + (people ? " on" : "")}
          onClick={() => setPeople((v) => !v)}
          aria-label="New chat"
          title="New chat"
        >
          {I("plus", 20)}
        </button>
      </div>

      <div className="sbx chat-search-box">
        {I("search", 18)}
        <input
          className="in"
          placeholder="Search chats and members"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search chats"
        />
      </div>

      {people && (
        <>
          <h4>Start a new chat</h4>
          {!members.length && <p className="muted chat-list-empty">No members found.</p>}
          {members.slice(0, 40).map((u) => (
            <button
              key={u.id}
              type="button"
              className="ci"
              onClick={() => {
                setPeople(false);
                onSelectUser(u);
              }}
            >
              <span className="chat-av-wrap">
                <Avatar u={u} />
                <i className={"chat-presence" + (onlineIds.includes(u.id) ? " on" : "")} />
              </span>
              <div className="ci-main">
                <b>{u.name}</b>
                <small>{onlineIds.includes(u.id) ? "Online" : u.bio || "Club member"}</small>
              </div>
              {I("chat", 17)}
            </button>
          ))}
        </>
      )}

      {!people && (
        <>
          <h4>Groups</h4>
          {groups.length ? groups.filter(matchConv).map(item) : <p className="muted chat-list-empty">No group chats yet.</p>}

          <h4>Direct messages</h4>
          {directs.length ? (
            directs.filter(matchConv).map(item)
          ) : (
            <p className="muted chat-list-empty">
              No direct messages yet — tap <b>+</b> to start one.
            </p>
          )}

          {needle && (
            <>
              <h4>Members</h4>
              {members.slice(0, 30).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="ci"
                  onClick={() => onSelectUser(u)}
                >
                  <Avatar u={u} />
                  <div className="ci-main">
                    <b>{u.name}</b>
                    <small>Start a conversation</small>
                  </div>
                </button>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
