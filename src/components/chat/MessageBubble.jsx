import Avatar from "../common/Avatar";
import { I } from "../common/Icon";

const QUICK = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

function timeOf(t) {
  try {
    return new Date(t || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (_err) {
    return "";
  }
}

function groupReactions(reactions = []) {
  const map = new Map();
  reactions.forEach((r) => {
    if (!r?.emoji) return;
    if (!map.has(r.emoji)) map.set(r.emoji, { emoji: r.emoji, count: 0, mine: false });
    const item = map.get(r.emoji);
    item.count += 1;
  });
  return Array.from(map.values());
}

export default function MessageBubble({
  m,
  mine,
  user,
  me,
  showName,
  name,
  pickerOpen,
  onReply,
  onPickReaction,
  onTogglePicker,
  onMenu,
  onOpenMedia,
}) {
  const grouped = groupReactions(m.reactions);
  const mineReacted = (m.reactions || []).find((r) => r.user === me?.id);
  const othersRead = (m.readBy || []).some((id) => id !== me?.id);

  return (
    <div className={"mr" + (mine ? " me" : "")} data-msg={m.id}>
      {!mine && <Avatar u={user || { name: name || "Member" }} size={28} />}
      <div className="msg-wrap">
        {showName && !mine && <div className="msg-name">{name}</div>}
        <div
          className={
            "b" +
            (mine ? " me" : "") +
            (m.deleted ? " deleted" : "") +
            (m.pending ? " pending" : "") +
            (m.system ? " system" : "")
          }
        >
          {m.replyTo && !m.deleted && (
            <div className="msg-reply">
              <b>{m.replyTo.from === me?.id ? "You" : "Reply"}</b>
              <span>{m.replyTo.text || "Attachment"}</span>
            </div>
          )}

          {(m.attachments || []).length > 0 && (
            <div className="msg-media">
              {m.attachments.map((a, i) => {
                if (a.type === "image") {
                  return (
                    <button
                      type="button"
                      key={a.url + i}
                      className="msg-img"
                      onClick={() => onOpenMedia(a)}
                      aria-label="Open image"
                    >
                      <img src={a.url} alt={a.name || "Photo"} loading="lazy" />
                    </button>
                  );
                }
                if (a.type === "video") {
                  return (
                    <video key={a.url + i} src={a.url} poster={a.poster || undefined} controls playsInline preload="metadata" />
                  );
                }
                if (a.type === "audio") {
                  return (
                    <div key={a.url + i} className="msg-audio">
                      <span className="msg-audio-ic">{I("bell", 16)}</span>
                      <audio src={a.url} controls preload="metadata" />
                    </div>
                  );
                }
                return (
                  <a key={a.url + i} className="msg-file" href={a.url} target="_blank" rel="noreferrer">
                    {I("blog", 16)} {a.name || "Attachment"}
                  </a>
                );
              })}
            </div>
          )}

          {m.text && <span className="msg-text">{m.text}</span>}

          <small className="msg-meta">
            {timeOf(m.t)}
            {m.editedAt && !m.deleted ? " · edited" : ""}
            {mine && !m.pending && !m.deleted && (
              <span className={"msg-ticks" + (othersRead ? " read" : "")}>{othersRead ? "✓✓" : "✓"}</span>
            )}
            {m.pending && <span className="msg-pending">sending…</span>}
          </small>
        </div>

        {grouped.length > 0 && !m.deleted && (
          <div className={"msg-reactions" + (mine ? " me" : "")}>
            {grouped.map((r) => (
              <button
                key={r.emoji}
                type="button"
                className={mineReacted?.emoji === r.emoji ? "on" : ""}
                onClick={() => onPickReaction(m, r.emoji)}
                title="React"
              >
                {r.emoji}
                {r.count > 1 && <span>{r.count}</span>}
              </button>
            ))}
          </div>
        )}

        {!m.deleted && !m.system && (
          <div className="msg-tools">
            <button type="button" onClick={() => onTogglePicker(m)} aria-label="React">
              😊
            </button>
            <button type="button" onClick={() => onReply(m)} aria-label="Reply">
              {I("back", 14)}
            </button>
            <button type="button" onClick={() => onMenu(m)} aria-label="Message options">
              ⋯
            </button>
          </div>
        )}

        {pickerOpen && (
          <div className={"msg-quick" + (mine ? " me" : "")}>
            {QUICK.map((e) => (
              <button key={e} type="button" onClick={() => onPickReaction(m, e)}>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
