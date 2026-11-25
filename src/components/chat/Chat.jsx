import { useEffect, useRef, useState } from "react";
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";
import { I } from "../common/Icon";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../lib/socket";

export default function Chat({ openAuth, focusConversationId, focusNonce = 0, onFocusHandled, onActiveChange }) {
  const {
    conversations,
    users,
    messages,
    loadMessages,
    ensureDirect,
    setActiveConversation,
    typing,
    onlineIds,
    refreshBootstrap,
    say,
  } = useApp();
  const { me } = useAuth();
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const loaded = useRef(new Set());
  const focusHandled = useRef(null);

  const conv = conversations.find((c) => c.id === selectedId) || (draft && draft.id === selectedId ? draft : null);
  const list = messages[selectedId] || [];
  const unread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);

  useEffect(() => {
    const key = `${focusConversationId}:${focusNonce}`;
    if (!focusConversationId || !me || focusHandled.current === key) return;
    const found = conversations.find((c) => c.id === focusConversationId);
    if (found) {
      focusHandled.current = key;
      setSelectedId(found.id);
      onFocusHandled && onFocusHandled();
    } else {
      refreshBootstrap();
      focusHandled.current = key;
      onFocusHandled && onFocusHandled();
    }
  }, [focusConversationId, focusNonce, conversations, me, refreshBootstrap, onFocusHandled]);

  useEffect(() => {
    if (!selectedId || !me) return undefined;
    setActiveConversation(selectedId);
    const socket = getSocket();
    if (socket?.connected) socket.emit("chat:open", { conversationId: selectedId });
    if (!loaded.current.has(selectedId)) {
      loaded.current.add(selectedId);
      loadMessages(selectedId).catch((err) => say(err.message || "Could not load messages"));
    }
    return () => setActiveConversation(null);
  }, [selectedId, me, setActiveConversation, loadMessages, say]);

  useEffect(() => {
    if (selectedId && conv) return;
    if (selectedId && conversations.length && !conversations.some((c) => c.id === selectedId) && !draft) {
      setSelectedId(null);
    }
  }, [conversations, selectedId, conv, draft]);

  useEffect(() => {
    if (onActiveChange) onActiveChange(Boolean(selectedId));
    return () => {
      if (onActiveChange) onActiveChange(false);
    };
  }, [selectedId, onActiveChange]);

  if (!me) {
    return (
      <div className="card lockc chat-lock">
        <i className="grad">{I("lock", 34)}</i>
        <h2>Log in to chat</h2>
        <p className="muted" style={{ margin: "8px 0 18px" }}>
          Club chat is for members only. Log in or create an account to message other members and
          join group chats.
        </p>
        <div className="row2" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={() => openAuth("login")}>
            Log in
          </button>
          <button className="btn line" onClick={() => openAuth("signup")}>
            Sign up
          </button>
        </div>
      </div>
    );
  }

  const selectConv = (c) => {
    setDraft(null);
    setSelectedId(c.id);
  };

  const selectUser = async (u) => {
    try {
      const id = await ensureDirect(u.id);
      setDraft({
        id,
        type: "direct",
        name: u.name,
        desc: "Direct message",
        avatar: u.photo || "",
        members: [me.id, u.id],
        unread: 0,
        lastMessage: null,
        lastAt: null,
      });
      setSelectedId(id);
    } catch (err) {
      say(err.message || "Could not open that chat");
    }
  };

  return (
    <div className={"chat chat2" + (selectedId ? " sel" : "")}>
      <ChatList
        conversations={conversations}
        users={users}
        me={me}
        selectedId={selectedId}
        onSelect={selectConv}
        onSelectUser={selectUser}
        onlineIds={onlineIds}
        typing={typing}
        unread={unread}
      />
      <div className="cm">
        {!conv || !selectedId ? (
          <div className="chat-welcome">
            <div className="em">💬</div>
            <h2>Your club chats</h2>
            <p className="muted">Pick a group or a member to start chatting.</p>
            <div className="chat-welcome-hints">
              <span>{I("video", 16)} Voice &amp; video calls</span>
              <span>{I("image", 16)} Photos and voice notes</span>
              <span>{I("check", 16)} Read receipts</span>
            </div>
          </div>
        ) : (
          <ChatWindow
            conv={conv}
            messages={list}
            typing={typing[conv.id]}
            online={conv.type !== "group" && (conv.members || []).some((id) => id !== me.id && onlineIds.includes(id))}
            onBack={() => {
              setSelectedId(null);
              setDraft(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
