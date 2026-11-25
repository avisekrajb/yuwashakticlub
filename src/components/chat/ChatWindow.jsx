import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "../common/Avatar";
import Loader from "../common/Loader";
import Modal from "../common/Modal";
import { I } from "../common/Icon";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import DaySeparator from "./DaySeparator";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { uploadFile, checkFileSize, recordAudio } from "../../lib/upload";
import { sameDay } from "../../utils";

export default function ChatWindow({ conv, messages, typing, online, onBack }) {
  const { me } = useAuth();
  const {
    users,
    sendChat,
    sendTyping,
    loadMessages,
    reactChatMessage,
    editChatMessage,
    deleteChatMessage,
    deleteConversation,
    say,
    config,
  } = useApp();
  const [text, setText] = useState("");
  const [reply, setReply] = useState(null);
  const [editing, setEditing] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const [menuMsg, setMenuMsg] = useState(null);
  const [picker, setPicker] = useState(null);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState("");
  const [light, setLight] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [err, setErr] = useState("");

  const scrollRef = useRef(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const recRef = useRef(null);
  const typingTimer = useRef(null);
  const nearBottom = useRef(true);

  const isGroup = conv.type === "group";
  const other = useMemo(() => {
    if (isGroup) return null;
    const id = (conv.members || []).find((m) => m !== me?.id);
    return users.find((u) => u.id === id) || null;
  }, [conv.members, isGroup, users, me]);

  const userFor = (id) => users.find((u) => u.id === id) || { id, name: "Former member" };

  useEffect(() => {
    setText("");
    setReply(null);
    setEditing(null);
    setAttachments([]);
    setMenuMsg(null);
    setPicker(null);
    setSearch(false);
    setQ("");
    setErr("");
    setRecording(false);
    recRef.current?.cancel?.();
    recRef.current = null;
    setRecordSec(0);
    setTimeout(() => {
      nearBottom.current = true;
      endRef.current?.scrollIntoView({ block: "end" });
    }, 60);
  }, [conv.id]);

  useEffect(
    () => () => {
      clearTimeout(typingTimer.current);
      recRef.current?.cancel?.();
    },
    []
  );

  const visible = useMemo(() => {
    const sorted = [...messages].sort((a, b) => (a.t || 0) - (b.t || 0));
    if (!q.trim()) return sorted;
    const needle = q.trim().toLowerCase();
    return sorted.filter(
      (m) => (m.text || "").toLowerCase().includes(needle) || (m.attachments || []).some((a) => (a.name || "").toLowerCase().includes(needle))
    );
  }, [messages, q]);

  useEffect(() => {
    if (nearBottom.current) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [visible.length, typing]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const notifyTyping = (value) => {
    setText(value);
    sendTyping(conv.id, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(conv.id, false), 1600);
  };

  const addFiles = async (e) => {
    const files = [...(e.target.files || [])].slice(0, 10);
    e.target.value = "";
    if (!files.length) return;
    setErr("");
    setUploading(true);
    try {
      for (const file of files) {
        if (!/^(image|video|audio)\//.test(file.type)) {
          setErr("Only photos, videos and audio can be attached.");
          continue;
        }
        checkFileSize(file, file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image", {
          maxVideoMb: config?.limits?.maxVideoMb,
          maxImageMb: config?.limits?.maxImageMb,
          maxAudioMb: config?.limits?.maxAudioMb,
        });
        const uploaded = await uploadFile(file, "chat", setProgress);
        setAttachments((prev) => [...prev, uploaded].slice(0, 10));
        setProgress(0);
      }
    } catch (x) {
      setErr(x.message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const startRecording = async () => {
    if (recording || uploading) return;
    setErr("");
    try {
      setRecordSec(0);
      const session = await recordAudio({
        maxSeconds: 120,
        onTick: (s) => setRecordSec(s),
      });
      recRef.current = session;
      setRecording(true);
      session.done.then(async (result) => {
        setRecording(false);
        recRef.current = null;
        if (result.error) {
          setErr(result.error.message || "Recording failed");
          return;
        }
        if (result.cancelled || !result.file) return;
        if (result.duration < 0.7) {
          setErr("That voice note was too short.");
          return;
        }
        setUploading(true);
        try {
          const uploaded = await uploadFile(result.file, "chat", setProgress);
          const audio = {
            ...uploaded,
            type: "audio",
            duration: result.duration || uploaded.duration || 0,
            name: "Voice note",
          };
          await sendChat({ conversationId: conv.id, text: "", attachments: [audio], replyTo: reply || null });
          setReply(null);
        } catch (x) {
          setErr(x.message || "Could not send the voice note");
        } finally {
          setUploading(false);
          setProgress(0);
        }
      });
    } catch (x) {
      setErr(x.message || "Microphone is not available");
    }
  };

  const stopRecording = () => recRef.current?.stop();
  const cancelRecording = () => {
    recRef.current?.cancel?.();
    recRef.current = null;
    setRecording(false);
    setRecordSec(0);
  };

  const send = async () => {
    if (sending || uploading || recording) return;
    if (editing) {
      const value = text.trim();
      if (!value) return;
      setSending(true);
      try {
        await editChatMessage(conv.id, editing.id, value);
        setEditing(null);
        setText("");
        sendTyping(conv.id, false);
      } catch (x) {
        setErr(x.message || "Could not edit the message");
      } finally {
        setSending(false);
      }
      return;
    }
    const value = text.trim();
    if (!value && !attachments.length) return;
    setSending(true);
    setErr("");
    try {
      await sendChat({
        conversationId: conv.id,
        text: value,
        attachments: attachments.map((a) => ({
          url: a.url,
          publicId: a.publicId,
          type: a.type,
          poster: a.poster || "",
          name: a.name || "",
          size: a.size || 0,
          duration: a.duration || 0,
        })),
        replyTo: reply || null,
      });
      setText("");
      setAttachments([]);
      setReply(null);
      sendTyping(conv.id, false);
      nearBottom.current = true;
    } catch (x) {
      setErr(x.message || "Could not send the message");
    } finally {
      setSending(false);
    }
  };

  const react = async (m, emoji) => {
    setPicker(null);
    try {
      await reactChatMessage(conv.id, m.id, emoji);
    } catch (x) {
      say(x.message || "Could not react");
    }
  };

  const removeMessage = async (forEveryone) => {
    const m = menuMsg;
    setMenuMsg(null);
    if (!m) return;
    if (forEveryone && !window.confirm("Delete this message for everyone?")) return;
    try {
      await deleteChatMessage(conv.id, m.id, forEveryone);
    } catch (x) {
      say(x.message || "Could not delete the message");
    }
  };

  const loadOlder = async () => {
    const first = [...messages].sort((a, b) => (a.t || 0) - (b.t || 0))[0];
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    try {
      await loadMessages(conv.id, { before: first.createdAt || new Date(first.t).toISOString() });
    } catch (x) {
      say(x.message || "Could not load older messages");
    } finally {
      setLoadingOlder(false);
    }
  };

  const startReply = (m) => {
    setMenuMsg(null);
    setEditing(null);
    setReply(m);
  };

  const startEdit = () => {
    const m = menuMsg;
    if (!m) return;
    setMenuMsg(null);
    setEditing(m);
    setText(m.text || "");
    setReply(null);
  };

  const copy = async () => {
    const m = menuMsg;
    setMenuMsg(null);
    if (!m?.text) return;
    try {
      await navigator.clipboard.writeText(m.text);
      say("Copied to clipboard");
    } catch (_err) {
      say("Could not copy the message");
    }
  };

  const removeConv = async () => {
    setMenuMsg(null);
    if (!window.confirm(isGroup ? "Delete this group chat for everyone?" : "Delete this conversation?")) return;
    try {
      await deleteConversation(conv.id);
      say("Conversation deleted");
      onBack();
    } catch (x) {
      say(x.message || "Could not delete the conversation");
    }
  };

  return (
    <div className="cm chat-window">
      <ChatHeader
        conv={conv}
        other={other}
        online={other ? online : false}
        typing={Boolean(typing)}
        onBack={onBack}
        onSearch={() => {
          setSearch((v) => !v);
          setQ("");
        }}
        searching={search}
      />

      {search && (
        <div className="chat-search">
          {I("search", 17)}
          <input
            className="in"
            placeholder="Search this conversation"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          {q && <small className="muted">{visible.length} found</small>}
        </div>
      )}

      <div className="ms chat-msgs" ref={scrollRef}>
        {messages.length > 8 && (
          <div className="chat-older">
            <button type="button" className="lnk xs" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder ? "Loading…" : "Load older messages"}
            </button>
          </div>
        )}
        {!visible.length && (
          <div className="chat-empty">
            <span>💬</span>
            <p>{q ? "No messages match your search." : "No messages yet. Say hello 👋"}</p>
          </div>
        )}
        {visible.map((m, i) => {
          const mine = m.from === me?.id || m.mine;
          const user = m.sender || userFor(m.from);
          const newDay = i === 0 || !sameDay(visible[i - 1].t || 0, m.t || 0);
          return (
            <div key={m.id || m.clientId} style={{ display: "contents" }}>
              {newDay && <DaySeparator t={m.t || Date.now()} />}
              <MessageBubble
                m={m}
                mine={mine}
                user={user}
                me={me}
                showName={isGroup && !mine}
                name={user?.name}
                pickerOpen={picker === m.id}
                onReply={startReply}
                onPickReaction={react}
                onTogglePicker={(msg) => setPicker((v) => (v === msg.id ? null : msg.id))}
                onMenu={(msg) => setMenuMsg(msg)}
                onOpenMedia={(a) => setLight(a.url)}
              />
            </div>
          );
        })}
        {typing && (
          <div className="chat-typing">
            <span />
            <span />
            <span />
            <small>{isGroup ? "Someone is typing…" : `${other?.name?.split(" ")[0] || "They"} is typing…`}</small>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {(reply || editing) && (
        <div className="chat-reply-bar">
          <div>
            <b>{editing ? "Editing message" : `Replying to ${reply?.sender?.name || userFor(reply?.from)?.name || "member"}`}</b>
            <small>{(editing ? editing.text : reply?.text) || "Attachment"}</small>
          </div>
          <button
            type="button"
            onClick={() => {
              setReply(null);
              setEditing(null);
              setText("");
            }}
            aria-label="Cancel"
          >
            ×
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="chat-attachments">
          {attachments.map((a, i) => (
            <div key={(a.publicId || a.url) + i} className="chat-att">
              {a.type === "image" ? <img src={a.url} alt="" /> : <span>{I(a.type === "video" ? "video" : a.type === "audio" ? "bell" : "blog", 18)}</span>}
              <small>{a.type === "audio" ? "Voice note" : a.type === "video" ? "Video" : a.type === "image" ? "Photo" : "File"}</small>
              <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, k) => k !== i))} aria-label="Remove">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading && progress > 0 && (
        <div className="pc-progress chat-progress">
          <span style={{ width: progress + "%" }} />
          <small>{progress}%</small>
        </div>
      )}

      {recording ? (
        <div className="chat-recording">
          <span className="rec-dot" />
          <b>Recording {Math.floor(recordSec / 60)}:{String(Math.floor(recordSec % 60)).padStart(2, "0")}</b>
          <button type="button" className="btn red sm" onClick={stopRecording}>
            Send
          </button>
          <button type="button" className="btn line sm" onClick={cancelRecording}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="cf chat-composer">
          <button
            type="button"
            className="ib"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || sending}
            aria-label="Attach photo or video"
          >
            {I("plus", 21)}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            hidden
            onChange={addFiles}
          />
          <textarea
            className="in chat-input"
            rows={1}
            placeholder={editing ? "Edit your message…" : "Type a message…"}
            value={text}
            onChange={(e) => notifyTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            maxLength={4000}
          />
          {!text.trim() && !attachments.length ? (
            <button type="button" className="ib chat-mic" onClick={startRecording} disabled={uploading} aria-label="Record voice note">
              {I("bell", 20)}
            </button>
          ) : (
            <button type="button" className="btn chat-send" onClick={send} disabled={sending || uploading} aria-label="Send">
              {sending ? <Loader /> : I("send", 19)}
            </button>
          )}
        </div>
      )}

      {err && <p className="err chat-err" role="alert">{err}</p>}

      {menuMsg && (
        <Modal onClose={() => setMenuMsg(null)} title="Message" sub="Choose an action">
          <div className="msg-menu">
            {menuMsg.text && (
              <button type="button" onClick={copy}>
                {I("blog", 17)} Copy text
              </button>
            )}
            <button type="button" onClick={() => startReply(menuMsg)}>
              {I("back", 17)} Reply
            </button>
            {menuMsg.mine && !menuMsg.deleted && menuMsg.text && (
              <button type="button" onClick={startEdit}>
                {I("edit", 17)} Edit
              </button>
            )}
            <button type="button" className="rd" onClick={() => removeMessage(false)}>
              {I("trash", 17)} Delete for me
            </button>
            {menuMsg.mine && !menuMsg.deleted && (
              <button type="button" className="rd" onClick={() => removeMessage(true)}>
                {I("trash", 17)} Delete for everyone
              </button>
            )}
            {isGroup && (
              <button type="button" className="rd" onClick={removeConv}>
                {I("trash", 17)} Delete group chat
              </button>
            )}
          </div>
        </Modal>
      )}

      {light && (
        <div className="lightbox" onClick={() => setLight(null)} role="dialog" aria-label="Photo">
          <button type="button" className="lightbox-x" onClick={() => setLight(null)} aria-label="Close">
            ×
          </button>
          <img src={light} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
