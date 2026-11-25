import { useEffect, useRef, useState } from "react";
import Avatar from "../common/Avatar";
import { I } from "../common/Icon";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { ago } from "../../utils";
import PostComments from "./PostComments";

const REACTIONS = [
  ["like", "👍", "Like"],
  ["love", "❤️", "Love"],
  ["haha", "😂", "Haha"],
  ["wow", "😮", "Wow"],
  ["sad", "😢", "Sad"],
  ["angry", "😠", "Angry"],
];
const EMOJI = Object.fromEntries(REACTIONS.map(([k, e]) => [k, e]));

function MediaItem({ m, onOpen }) {
  if (!m?.url) return null;
  if (m.type === "video") {
    return (
      <div className="pmedia video">
        <video src={m.url} poster={m.poster || undefined} controls playsInline preload="metadata" />
      </div>
    );
  }
  if (m.type === "audio") {
    return (
      <div className="pmedia audio">
        <div className="pmedia-audio-ic">{I("bell", 20)}</div>
        <audio src={m.url} controls preload="metadata" />
      </div>
    );
  }
  if (m.type === "file") {
    return (
      <a className="pmedia file" href={m.url} target="_blank" rel="noreferrer">
        {I("blog", 20)}
        <span>{m.name || "Attachment"}</span>
      </a>
    );
  }
  return (
    <button type="button" className="pmedia image" onClick={() => onOpen(m)} aria-label="Open photo">
      <img src={m.url} alt={m.name || "Post photo"} loading="lazy" />
    </button>
  );
}

export default function PostCard({ post, openAuth, initialComments = false }) {
  const { me, isAdmin } = useAuth();
  const { reactPost, deletePost, sharePost, say } = useApp();
  const [showComments, setShowComments] = useState(initialComments);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [light, setLight] = useState(null);
  const [menu, setMenu] = useState(false);
  const pickerRef = useRef(null);
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    try {
      const key = "syc_view_" + post.id;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        api.post(`/posts/${post.id}/view`).catch(() => {});
      }
    } catch (_err) {
      /* ignore storage errors */
    }
  }, [post.id]);

  useEffect(() => {
    if (!picker) return undefined;
    const close = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPicker(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [picker]);

  const media = post.media || [];
  const counts = post.reactions?.counts || {};
  const mine = post.reactions?.mine;
  const total = post.reactions?.total || 0;

  const react = async (type) => {
    if (!me) return openAuth && openAuth("login");
    if (busy) return;
    setBusy(true);
    setPicker(false);
    try {
      await reactPost(post.id, type);
    } catch (e) {
      say(e.message || "Could not react");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!me) return openAuth && openAuth("login");
    if (sharing) return;
    setSharing(true);
    try {
      const result = await sharePost(post.id);
      const link = `${window.location.origin}${window.location.pathname}?post=${post.id}`;
      try {
        if (navigator.share) {
          await navigator.share({ title: "Shree Yuwa Shakti Club", text: post.text || "Club post", url: link });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(link);
        }
      } catch (_err) {
        /* sharing is best-effort */
      }
      say(result?.already ? "You already shared this post" : "Post shared");
    } catch (e) {
      say(e.message || "Could not share the post");
    } finally {
      setSharing(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try {
      await deletePost(post.id);
      say("Post deleted");
    } catch (e) {
      say(e.message || "Could not delete the post");
    }
    setMenu(false);
  };

  const toggleComments = () => {
    setShowComments((v) => !v);
  };

  return (
    <article className="post-card" id={"post-" + post.id}>
      <header className="pc-top">
        <Avatar u={post.author || { name: "Member" }} size={44} />
        <div className="pc-who">
          <b>
            {post.author?.name || "Former member"}
            {post.author?.role === "admin" && <span className="pc-admin">Admin</span>}
          </b>
          <small>
            {ago(post.t)} · {post.category || "General"}
          </small>
        </div>
        {(post.mine || isAdmin) && (
          <div className="pc-menu">
            <button
              type="button"
              className="ib"
              aria-label="Post options"
              onClick={() => setMenu((v) => !v)}
            >
              {I("menu", 20)}
            </button>
            {menu && (
              <>
                <div className="pop-scrim" onClick={() => setMenu(false)} />
                <div className="pc-drop">
                  <button type="button" className="rd" onClick={remove}>
                    {I("trash", 17)} Delete post
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {post.text && <p className="pc-text">{post.text}</p>}

      {media.length > 0 && (
        <div className={"pc-media n" + Math.min(media.length, 4)}>
          {media.map((m, i) => (
            <MediaItem key={(m.publicId || m.url || "") + i} m={m} onOpen={setLight} />
          ))}
        </div>
      )}

      <div className="pc-stats">
        <span>
          {total > 0 ? (
            <>
              <span className="pc-emoji-row">
                {Object.entries(counts)
                  .filter(([, n]) => n > 0)
                  .slice(0, 3)
                  .map(([k]) => (
                    <i key={k}>{EMOJI[k]}</i>
                  ))}
              </span>
              {total}
            </>
          ) : (
            "No reactions yet"
          )}
        </span>
        <span>
          {post.commentsCount || 0} comment{(post.commentsCount || 0) === 1 ? "" : "s"} ·{" "}
          {post.sharesCount || 0} share{(post.sharesCount || 0) === 1 ? "" : "s"}
        </span>
      </div>

      <div className="pc-actions">
        <div className="pc-react-wrap" ref={pickerRef}>
          <button
            type="button"
            className={"pc-action" + (mine ? " on" : "")}
            onClick={() => (mine ? react(mine) : react("like"))}
            onContextMenu={(e) => {
              e.preventDefault();
              setPicker((v) => !v);
            }}
            disabled={busy}
          >
            <span className="pc-emoji">{mine ? EMOJI[mine] : "👍"}</span>
            {mine ? mine[0].toUpperCase() + mine.slice(1) : "Like"}
          </button>
          <button
            type="button"
            className="pc-pick-toggle"
            aria-label="Choose a reaction"
            onClick={() => setPicker((v) => !v)}
          >
            ▾
          </button>
          {picker && (
            <div className="pc-reaction-picker" role="menu">
              {REACTIONS.map(([k, e, label]) => (
                <button
                  key={k}
                  type="button"
                  title={label}
                  aria-label={label}
                  className={mine === k ? "on" : ""}
                  onClick={() => react(k)}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className={"pc-action" + (showComments ? " on" : "")} onClick={toggleComments}>
          <span className="pc-emoji">{I("chat", 19)}</span>
          Comment
        </button>
        <button type="button" className="pc-action" onClick={share} disabled={sharing}>
          <span className="pc-emoji">{I("send", 19)}</span>
          {sharing ? "Sharing…" : "Share"}
        </button>
      </div>

      {showComments && <PostComments post={post} openAuth={openAuth} />}

      {light && (
        <div className="lightbox" onClick={() => setLight(null)} role="dialog" aria-label="Photo">
          <button type="button" className="lightbox-x" onClick={() => setLight(null)} aria-label="Close">
            ×
          </button>
          <img src={light.url} alt={light.name || "Post photo"} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </article>
  );
}
