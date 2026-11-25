import { useMemo } from "react";
import Avatar from "../common/Avatar";
import { I } from "../common/Icon";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

export default function StoryBar({ onOpen, onAdd }) {
  const { stories } = useApp();
  const { me } = useAuth();

  const groups = useMemo(() => {
    const byAuthor = new Map();
    stories.forEach((s) => {
      const id = s.author?.id || "unknown";
      if (!byAuthor.has(id)) {
        byAuthor.set(id, {
          author: s.author || { name: "Member" },
          stories: [],
          seen: false,
          latest: 0,
        });
      }
      const g = byAuthor.get(id);
      g.stories.push(s);
      if (!s.seen) g.seen = false;
      g.latest = Math.max(g.latest, s.t || 0);
    });
    const list = Array.from(byAuthor.values());
    list.forEach((g) => {
      g.stories.sort((a, b) => (a.t || 0) - (b.t || 0));
      g.seen = g.stories.every((s) => s.seen || s.mine);
    });
    if (me) {
      list.sort((a, b) => {
        if (a.author.id === me.id) return -1;
        if (b.author.id === me.id) return 1;
        if (a.seen !== b.seen) return a.seen ? 1 : -1;
        return b.latest - a.latest;
      });
    }
    return list;
  }, [stories, me]);

  if (!me && !groups.length) return null;

  return (
    <div className="story-bar-wrap">
      <div className="story-bar" role="list">
        {me && (
          <button type="button" className="story-bubble add" onClick={onAdd} role="listitem">
            <span className="story-ring add-ring">
              <span className="story-face add-face">
                <Avatar u={me} size={58} />
                <i className="story-plus">{I("plus", 14)}</i>
              </span>
            </span>
            <span className="story-name">Your story</span>
          </button>
        )}
        {groups.map((g) => (
          <button
            key={g.author.id}
            type="button"
            className={"story-bubble" + (g.seen ? " seen" : "")}
            onClick={() => onOpen(g)}
            role="listitem"
          >
            <span className={"story-ring" + (g.seen ? " seen" : "")}>
              <span className="story-face">
                <Avatar u={g.author} size={58} />
              </span>
            </span>
            <span className="story-name">
              {me && g.author.id === me.id ? "You" : g.author.name?.split(" ")[0] || "Member"}
            </span>
          </button>
        ))}
        {!groups.length && !me && <p className="muted" style={{ padding: "8px 0" }}>No stories yet.</p>}
      </div>
    </div>
  );
}
