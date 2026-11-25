import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "../common/Avatar";
import Loader from "../common/Loader";
import { I } from "../common/Icon";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { ago } from "../../utils";

function CommentRow({ c, me, isAdmin, onReply, onDelete, busyId }) {
  const mine = me && (c.userId === me.id || c.mine);
  return (
    <div className={"pc-cmt" + (c.parent ? " reply" : "")}>
      <Avatar u={{ name: c.name || "Member", photo: c.photo }} size={32} />
      <div className="pc-cmt-body">
        <div className="pc-cmt-name">
          <b>{c.name || "Former member"}</b>
          <small>{ago(c.t)}</small>
        </div>
        <p>{c.text}</p>
        <div className="pc-cmt-actions">
          {!c.parent && (
            <button type="button" className="lnk xs" onClick={() => onReply(c)}>
              Reply
            </button>
          )}
          {(mine || isAdmin) && (
            <button
              type="button"
              className="lnk xs danger"
              onClick={() => onDelete(c)}
              disabled={busyId === c.id}
            >
              {busyId === c.id ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostComments({ post, openAuth }) {
  const { me, isAdmin } = useAuth();
  const { postComments, loadPostComments, addPostComment, deletePostComment, say } = useApp();
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [reply, setReply] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadPostComments(post.id)
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [post.id, loadPostComments]);

  const list = useMemo(
    () =>
      postComments
        .filter((c) => c.postId === post.id)
        .sort((a, b) => (a.t || 0) - (b.t || 0)),
    [postComments, post.id]
  );

  const roots = list.filter((c) => !c.parent);
  const repliesFor = (id) => list.filter((c) => c.parent === id);

  const submit = async () => {
    const value = text.trim();
    if (!value || busy) return;
    if (!me) return openAuth && openAuth("login");
    setBusy(true);
    setErr("");
    try {
      await addPostComment(post.id, value, reply?.id || null);
      setText("");
      setReply(null);
    } catch (e) {
      setErr(e.message || "Could not add the comment");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm("Delete this comment?")) return;
    setBusyId(c.id);
    try {
      await deletePostComment(post.id, c.id);
      say("Comment deleted");
    } catch (e) {
      say(e.message || "Could not delete the comment");
    } finally {
      setBusyId(null);
    }
  };

  const replyTo = (c) => {
    setReply(c);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  return (
    <section className="pc-comments">
      {me ? (
        <div className="pc-cmt-form">
          <Avatar u={me} size={32} />
          <div className="pc-cmt-input">
            {reply && (
              <div className="pc-reply-chip">
                Replying to {reply.name || "member"}
                <button type="button" onClick={() => setReply(null)} aria-label="Cancel reply">
                  ×
                </button>
              </div>
            )}
            <input
              ref={inputRef}
              className="in"
              placeholder={reply ? `Reply to ${reply.name || "member"}…` : "Write a comment…"}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setErr("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              maxLength={2000}
            />
          </div>
          <button type="button" className="btn sm" onClick={submit} disabled={busy || !text.trim()}>
            {busy ? <Loader /> : I("send", 17)}
          </button>
        </div>
      ) : (
        <div className="pc-login-note">
          <span>Log in to comment on this post.</span>
          <button type="button" className="btn sm" onClick={() => openAuth && openAuth("login")}>
            Log in
          </button>
        </div>
      )}

      {loading && <p className="muted ctr"><Loader /></p>}
      {!loading && !roots.length && <p className="muted pc-empty">No comments yet. Start the conversation.</p>}

      {roots.map((c) => (
        <div key={c.id}>
          <CommentRow
            c={c}
            me={me}
            isAdmin={isAdmin}
            onReply={replyTo}
            onDelete={remove}
            busyId={busyId}
          />
          {repliesFor(c.id).map((r) => (
            <CommentRow
              key={r.id}
              c={r}
              me={me}
              isAdmin={isAdmin}
              onReply={replyTo}
              onDelete={remove}
              busyId={busyId}
            />
          ))}
        </div>
      ))}
      {err && <p className="err" role="alert">{err}</p>}
    </section>
  );
}
