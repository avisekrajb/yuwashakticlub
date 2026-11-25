import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { api } from "../lib/api";
import { connectSocket, getSocket, disconnectSocket, emitWithAck } from "../lib/socket";
import useToast from "../hooks/useToast";
import { beep } from "../utils";
import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const SYNCED = ["about", "blogs", "gallery", "banners", "team", "groups", "comments"];
const COLLECTION_ENDPOINTS = {
  about: "/about",
  blogs: "/blogs",
  gallery: "/gallery",
  banners: "/banners",
  team: "/team",
  groups: "/groups",
  comments: "/collections/comments",
};

const BLANK = {
  users: [],
  about: [],
  blogs: [],
  gallery: [],
  banners: [],
  team: [],
  groups: [],
  comments: [],
  postComments: [],
  posts: [],
  stories: [],
  live: [],
  notifs: [],
  conversations: [],
};

function mergeById(list, incoming) {
  const map = new Map((list || []).map((item) => [item.id, item]));
  (incoming || []).forEach((item) => {
    if (!item?.id) return;
    map.set(item.id, { ...(map.get(item.id) || {}), ...item });
  });
  return Array.from(map.values());
}

function mapBootstrapMessages(byKey, conversations) {
  const out = {};
  (conversations || []).forEach((conv) => {
    const list = byKey && Array.isArray(byKey[conv.key]) ? byKey[conv.key] : [];
    out[conv.id] = list.slice();
  });
  Object.entries(byKey || {}).forEach(([key, list]) => {
    if (!out[key] && Array.isArray(list)) out[key] = list.slice();
  });
  return out;
}

export function AppProvider({ children }) {
  const { token, me, isAdmin, updateMe, logout } = useAuth();
  const { notif: notifEnabled } = useTheme();
  const { toast, say, dismiss } = useToast();

  const [data, setData] = useState(BLANK);
  const dataRef = useRef(BLANK);
  const [messages, setMessagesState] = useState({});
  const messagesRef = useRef({});
  const [config, setConfig] = useState({});
  const [stats, setStats] = useState({});
  const [onlineIds, setOnlineIds] = useState([]);
  const [typing, setTypingState] = useState({});
  const typingRef = useRef({});
  const typingTimers = useRef({});
  const [activeConversation, setActiveConversationState] = useState(null);
  const activeConvRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState("");
  const [postCursor, setPostCursor] = useState(null);
  const [postHasMore, setPostHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const runtime = useRef({});
  runtime.current = { me, isAdmin, notifEnabled, say };

  const commitData = useCallback((updater) => {
    const next = typeof updater === "function" ? updater(dataRef.current) : updater;
    dataRef.current = next;
    setData(next);
    return next;
  }, []);

  const updateMessages = useCallback((updater) => {
    const next = typeof updater === "function" ? updater(messagesRef.current) : updater;
    messagesRef.current = next;
    setMessagesState(next);
    return next;
  }, []);

  const setLocal = useCallback(
    (name, updater) => {
      const prev = dataRef.current[name];
      const next = typeof updater === "function" ? updater(prev) : updater;
      commitData((d) => ({ ...d, [name]: next }));
      return next;
    },
    [commitData]
  );

  // ── Admin collection syncing ──────────────────────────────────────────
  const syncTimers = useRef({});
  const syncSeq = useRef({});

  const queueSync = useCallback(
    (name, items) => {
      if (!SYNCED.includes(name) || !runtime.current.isAdmin) return;
      clearTimeout(syncTimers.current[name]);
      const seq = (syncSeq.current[name] || 0) + 1;
      syncSeq.current[name] = seq;
      syncTimers.current[name] = setTimeout(async () => {
        try {
          const saved = await api.put(`/admin/collections/${name}`, { items });
          if (syncSeq.current[name] !== seq) return;
          if (Array.isArray(saved)) commitData((d) => ({ ...d, [name]: saved }));
        } catch (err) {
          runtime.current.say(err.message || "Could not save changes");
        }
      }, 650);
    },
    [commitData]
  );

  const setCollection = useCallback(
    (name, updater) => {
      const prev = dataRef.current[name] || [];
      const next = typeof updater === "function" ? updater(prev) : updater;
      commitData((d) => ({ ...d, [name]: next }));
      queueSync(name, next);
      return next;
    },
    [commitData, queueSync]
  );

  // ── Bootstrap ─────────────────────────────────────────────────────────
  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setBootError("");
    try {
      const res = await api.get("/bootstrap");
      const next = {
        users: res.users || [],
        about: res.about || [],
        blogs: res.blogs || [],
        gallery: res.gallery || [],
        banners: res.banners || [],
        team: res.team || [],
        groups: res.groups || [],
        comments: res.comments || [],
        postComments: [],
        posts: res.posts || [],
        stories: res.stories || [],
        live: res.live || [],
        notifs: res.notifs || [],
        conversations: res.conversations || [],
      };
      dataRef.current = next;
      setData(next);

      const mapped = mapBootstrapMessages(res.messages, res.conversations);
      messagesRef.current = mapped;
      setMessagesState(mapped);

      setConfig(res.config || {});
      setStats(res.stats || {});
      const last = next.posts[next.posts.length - 1];
      setPostCursor(last?.createdAt || null);
      setPostHasMore(next.posts.length >= 20);
      if (res.me) updateMe(res.me);
    } catch (err) {
      setBootError(err.message || "Could not reach the club server");
      runtime.current.say(err.message || "Could not reach the club server");
    } finally {
      setLoading(false);
      setBooted(true);
    }
  }, [updateMe]);

  const lastAuth = useRef(undefined);
  useEffect(() => {
    const key = token || "guest";
    if (lastAuth.current === key) return;
    lastAuth.current = key;
    loadBootstrap();
  }, [token, loadBootstrap]);

  // ── State helpers ─────────────────────────────────────────────────────
  const upsertPost = useCallback(
    (post) => {
      if (!post?.id) return;
      commitData((prev) => {
        const exists = prev.posts.some((p) => p.id === post.id);
        return {
          ...prev,
          posts: exists
            ? prev.posts.map((p) => (p.id === post.id ? { ...p, ...post } : p))
            : [post, ...prev.posts],
        };
      });
    },
    [commitData]
  );

  const removePost = useCallback(
    (id) => commitData((prev) => ({ ...prev, posts: prev.posts.filter((p) => p.id !== id) })),
    [commitData]
  );

  const upsertStory = useCallback(
    (story) => {
      if (!story?.id) return;
      commitData((prev) => {
        const exists = prev.stories.some((s) => s.id === story.id);
        return {
          ...prev,
          stories: exists
            ? prev.stories.map((s) => (s.id === story.id ? { ...s, ...story } : s))
            : [story, ...prev.stories],
        };
      });
    },
    [commitData]
  );

  const removeStory = useCallback(
    (id) => commitData((prev) => ({ ...prev, stories: prev.stories.filter((s) => s.id !== id) })),
    [commitData]
  );

  const upsertLive = useCallback(
    (live) => {
      if (!live?.id) return;
      commitData((prev) => {
        const exists = prev.live.some((l) => l.id === live.id);
        return {
          ...prev,
          live: exists ? prev.live.map((l) => (l.id === live.id ? { ...l, ...live } : l)) : [live, ...prev.live],
        };
      });
    },
    [commitData]
  );

  const removeLive = useCallback(
    (id) => commitData((prev) => ({ ...prev, live: prev.live.filter((l) => l.id !== id) })),
    [commitData]
  );

  const upsertConversation = useCallback(
    (conversation) => {
      if (!conversation?.id) return;
      commitData((prev) => {
        const exists = prev.conversations.some((c) => c.id === conversation.id);
        return {
          ...prev,
          conversations: exists
            ? prev.conversations.map((c) => (c.id === conversation.id ? { ...c, ...conversation } : c))
            : [conversation, ...prev.conversations],
        };
      });
    },
    [commitData]
  );

  const addNotification = useCallback(
    (notification) => {
      if (!notification?.id) return;
      commitData((prev) => ({
        ...prev,
        notifs: [notification, ...prev.notifs.filter((n) => n.id !== notification.id)].slice(0, 100),
      }));
    },
    [commitData]
  );

  // ── Posts ─────────────────────────────────────────────────────────────
  const createPost = useCallback(
    async (payload) => {
      const post = await api.post("/posts", payload);
      upsertPost(post);
      return post;
    },
    [upsertPost]
  );

  const reactPost = useCallback(
    async (id, type) => {
      const post = await api.post(`/posts/${id}/react`, { type });
      upsertPost(post);
      return post;
    },
    [upsertPost]
  );

  const sharePost = useCallback(
    async (id) => {
      const result = await api.post(`/posts/${id}/share`);
      if (result?.post) upsertPost(result.post);
      return result;
    },
    [upsertPost]
  );

  const deletePost = useCallback(
    async (id) => {
      await api.delete(`/posts/${id}`);
      removePost(id);
    },
    [removePost]
  );

  const loadMorePosts = useCallback(async () => {
    if (!postCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get(`/posts?limit=20&cursor=${encodeURIComponent(postCursor)}`);
      const incoming = res.posts || [];
      commitData((prev) => ({
        ...prev,
        posts: [...prev.posts, ...incoming.filter((p) => !prev.posts.some((x) => x.id === p.id))],
      }));
      setPostCursor(res.nextCursor || null);
      setPostHasMore(Boolean(res.hasMore));
    } finally {
      setLoadingMore(false);
    }
  }, [postCursor, loadingMore, commitData]);

  // ── Post comments ─────────────────────────────────────────────────────
  const mergePostComments = useCallback(
    (list) => {
      if (!Array.isArray(list) || !list.length) return;
      commitData((prev) => ({ ...prev, postComments: mergeById(prev.postComments, list) }));
    },
    [commitData]
  );

  const loadPostComments = useCallback(
    async (postId) => {
      const list = await api.get(`/posts/${postId}/comments`);
      mergePostComments(list);
      return list;
    },
    [mergePostComments]
  );

  const addPostComment = useCallback(
    async (postId, text, parent = null) => {
      const comment = await api.post(`/posts/${postId}/comments`, { text, parent });
      commitData((prev) => ({
        ...prev,
        postComments: mergeById(prev.postComments, [comment]),
        posts: prev.posts.map((p) =>
          p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
        ),
      }));
      return comment;
    },
    [commitData]
  );

  const deletePostComment = useCallback(
    async (postId, commentId) => {
      const result = await api.delete(`/posts/${postId}/comments/${commentId}`);
      commitData((prev) => {
        const removed = new Set([commentId]);
        prev.postComments.forEach((c) => {
          if (c.parent === commentId) removed.add(c.id);
        });
        return {
          ...prev,
          postComments: prev.postComments.filter((c) => !removed.has(c.id)),
          posts: prev.posts.map((p) =>
            p.id === postId
              ? { ...p, commentsCount: result?.commentsCount ?? Math.max(0, (p.commentsCount || 0) - removed.size) }
              : p
          ),
        };
      });
      return result;
    },
    [commitData]
  );

  // ── Stories ───────────────────────────────────────────────────────────
  const createStory = useCallback(
    async (payload) => {
      const story = await api.post("/stories", payload);
      upsertStory(story);
      return story;
    },
    [upsertStory]
  );

  const deleteStory = useCallback(
    async (id) => {
      await api.delete(`/stories/${id}`);
      removeStory(id);
    },
    [removeStory]
  );

  const viewStory = useCallback(async (id) => {
    try {
      const result = await api.post(`/stories/${id}/view`);
      commitData((prev) => ({
        ...prev,
        stories: prev.stories.map((s) => (s.id === id ? { ...s, seen: true, views: result.views ?? s.views } : s)),
      }));
    } catch (_err) {
      /* viewing is best-effort */
    }
  }, [commitData]);

  // ── Live ──────────────────────────────────────────────────────────────
  const startLive = useCallback(
    async (title) => {
      const result = await api.post("/live", { title });
      if (result?.live) upsertLive(result.live);
      return result;
    },
    [upsertLive]
  );

  const endLive = useCallback(
    async (id) => {
      try {
        await api.post(`/live/${id}/end`);
      } finally {
        removeLive(id);
      }
    },
    [removeLive]
  );

  // ── Chat ──────────────────────────────────────────────────────────────
  const appendMessage = useCallback(
    (conversationId, message) => {
      if (!conversationId || !message) return;
      updateMessages((prev) => {
        const list = prev[conversationId] ? [...prev[conversationId]] : [];
        const index = list.findIndex(
          (m) =>
            m.id === message.id ||
            (message.clientId && m.clientId && m.clientId === message.clientId) ||
            (m.pending && message.clientId && m.clientId === message.clientId)
        );
        if (index >= 0) list[index] = { ...list[index], ...message, pending: false };
        else list.push(message);
        return { ...prev, [conversationId]: list };
      });
    },
    [updateMessages]
  );

  const loadMessages = useCallback(
    async (conversationId, opts = {}) => {
      const query = new URLSearchParams();
      if (opts.before) query.set("before", opts.before);
      if (opts.q) query.set("q", opts.q);
      if (opts.limit) query.set("limit", String(opts.limit));
      const suffix = query.toString() ? `?${query.toString()}` : "";
      const res = await api.get(`/messages/conversations/${conversationId}${suffix}`);
      const list = res.messages || [];
      if (opts.before) {
        updateMessages((prev) => ({
          ...prev,
          [conversationId]: [...list, ...(prev[conversationId] || [])],
        }));
      } else {
        updateMessages((prev) => ({ ...prev, [conversationId]: list }));
      }
      if (res.conversation) upsertConversation(res.conversation);
      return res;
    },
    [updateMessages, upsertConversation]
  );

  const ensureDirect = useCallback(
    async (userId) => {
      const conv = await api.post("/messages/conversations/direct", { userId });
      const existing = dataRef.current.conversations.find((c) => c.id === conv.id);
      if (!existing) {
        const other = dataRef.current.users.find((u) => u.id === userId);
        upsertConversation({
          id: conv.id,
          key: conv.key,
          type: "direct",
          name: other?.name || "Direct message",
          desc: "Direct message",
          avatar: other?.photo || "",
          members: conv.members || [],
          unread: 0,
          lastMessage: null,
          lastAt: null,
        });
      }
      if (!messagesRef.current[conv.id]) {
        updateMessages((prev) => ({ ...prev, [conv.id]: [] }));
      }
      return conv.id;
    },
    [upsertConversation, updateMessages]
  );

  const sendChat = useCallback(
    async ({ conversationId, text = "", attachments = [], replyTo = null }) => {
      const clientId = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const mine = runtime.current.me;
      const temp = {
        id: clientId,
        clientId,
        conversationId,
        from: mine?.id || null,
        sender: mine,
        text,
        attachments,
        replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, from: replyTo.from } : null,
        reactions: [],
        readBy: mine?.id ? [mine.id] : [],
        deliveredTo: mine?.id ? [mine.id] : [],
        mine: true,
        pending: true,
        t: Date.now(),
        createdAt: new Date().toISOString(),
      };
      appendMessage(conversationId, temp);
      const payload = { conversationId, text, attachments, replyTo: replyTo?.id || null, clientId };
      let message = null;
      try {
        const ack = await emitWithAck("chat:send", payload, 9000);
        message = ack.message;
      } catch (socketError) {
        try {
          message = await api.post(`/messages/conversations/${conversationId}/messages`, payload);
        } catch (_restError) {
          updateMessages((prev) => ({
            ...prev,
            [conversationId]: (prev[conversationId] || []).filter((m) => m.id !== clientId),
          }));
          throw socketError;
        }
      }
      if (message) appendMessage(conversationId, message);
      return message;
    },
    [appendMessage, updateMessages]
  );

  const markConversationRead = useCallback(
    (conversationId) => {
      if (!conversationId) return;
      commitData((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)),
      }));
      const socket = getSocket();
      if (socket?.connected) socket.emit("chat:read", { conversationId });
      else api.post(`/messages/conversations/${conversationId}/read`).catch(() => {});
    },
    [commitData]
  );

  const setActiveConversation = useCallback(
    (id) => {
      activeConvRef.current = id || null;
      setActiveConversationState(id || null);
      if (id) markConversationRead(id);
    },
    [markConversationRead]
  );

  const sendTyping = useCallback((conversationId, isTyping) => {
    const socket = getSocket();
    if (socket?.connected) socket.emit("chat:typing", { conversationId, typing: Boolean(isTyping) });
  }, []);

  const reactChatMessage = useCallback(
    async (conversationId, messageId, emoji = "❤️") => {
      let payload;
      try {
        const ack = await emitWithAck("chat:react", { messageId, emoji }, 6000);
        payload = ack;
      } catch (_err) {
        payload = await api.post(`/messages/${messageId}/react`, { emoji });
      }
      if (payload?.reactions) {
        updateMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map((m) =>
            m.id === messageId ? { ...m, reactions: payload.reactions } : m
          ),
        }));
      }
      return payload;
    },
    [updateMessages]
  );

  const editChatMessage = useCallback(
    async (conversationId, messageId, text) => {
      let payload;
      try {
        payload = await emitWithAck("chat:edit", { messageId, text }, 6000);
      } catch (_err) {
        payload = await api.patch(`/messages/${messageId}`, { text });
      }
      const editedAt = payload?.editedAt || Date.now();
      updateMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map((m) =>
          m.id === messageId ? { ...m, text, editedAt } : m
        ),
      }));
      return payload;
    },
    [updateMessages]
  );

  const deleteChatMessage = useCallback(
    async (conversationId, messageId, forEveryone = false) => {
      try {
        await emitWithAck("chat:delete", { messageId, forEveryone }, 6000);
      } catch (_err) {
        await api.delete(`/messages/${messageId}${forEveryone ? "?forEveryone=true" : ""}`);
      }
      updateMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || [])
          .map((m) =>
            m.id === messageId && forEveryone
              ? { ...m, deleted: true, text: "This message was deleted", attachments: [] }
              : m
          )
          .filter((m) => forEveryone || m.id !== messageId),
      }));
      return true;
    },
    [updateMessages]
  );

  const deleteConversation = useCallback(
    async (conversationId) => {
      await api.delete(`/messages/conversations/${conversationId}`);
      commitData((prev) => ({
        ...prev,
        conversations: prev.conversations.filter((c) => c.id !== conversationId),
      }));
      updateMessages((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
    },
    [commitData, updateMessages]
  );

  // ── Notifications ─────────────────────────────────────────────────────
  const markAllNotifsRead = useCallback(async () => {
    commitData((prev) => ({ ...prev, notifs: prev.notifs.map((n) => ({ ...n, read: true })) }));
    try {
      await api.post("/notifications/read-all");
    } catch (_err) {
      /* ignore */
    }
  }, [commitData]);

  const markNotifRead = useCallback(
    async (id) => {
      commitData((prev) => ({
        ...prev,
        notifs: prev.notifs.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }));
      try {
        await api.post(`/notifications/${id}/read`);
      } catch (_err) {
        /* ignore */
      }
    },
    [commitData]
  );

  const clearNotifs = useCallback(async () => {
    commitData((prev) => ({ ...prev, notifs: [] }));
    try {
      await api.delete("/notifications");
    } catch (_err) {
      /* ignore */
    }
  }, [commitData]);

  const removeNotif = useCallback(
    async (id) => {
      commitData((prev) => ({ ...prev, notifs: prev.notifs.filter((n) => n.id !== id) }));
      try {
        await api.delete(`/notifications/${id}`);
      } catch (_err) {
        /* ignore */
      }
    },
    [commitData]
  );

  const pushNotif = useCallback((n) => {
    if (!n) return;
    if (n.text) runtime.current.say(n.text);
    if (runtime.current.isAdmin && n.text) {
      api
        .post("/notifications/broadcast", {
          type: n.type || "system",
          text: n.text,
          ref: n.ref || null,
          refType: n.refType || null,
        })
        .catch(() => {});
    }
  }, []);

  const refreshCollection = useCallback(async (name) => {
    const endpoint = COLLECTION_ENDPOINTS[name];
    if (!endpoint) return;
    try {
      const items = await api.get(endpoint);
      if (Array.isArray(items)) commitData((prev) => ({ ...prev, [name]: items }));
    } catch (_err) {
      /* ignore background refresh errors */
    }
  }, [commitData]);

  // ── Socket lifecycle ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return undefined;
    }
    const socket = connectSocket(token);
    if (!socket) return undefined;

    const on = (event, handler) => socket.on(event, handler);

    on("post:new", (payload) => upsertPost(payload?.post));
    on("post:updated", (payload) => upsertPost(payload?.post));
    on("post:deleted", (payload) => removePost(payload?.postId));
    on("post:comment", (payload) => {
      if (!payload?.comment) return;
      commitData((prev) => ({
        ...prev,
        postComments: mergeById(prev.postComments, [payload.comment]),
        posts: prev.posts.map((p) =>
          p.id === payload.postId ? { ...p, commentsCount: payload.commentsCount ?? p.commentsCount } : p
        ),
      }));
    });
    on("post:comment:deleted", (payload) => {
      if (!payload?.commentId) return;
      commitData((prev) => ({
        ...prev,
        postComments: prev.postComments.filter(
          (c) => c.id !== payload.commentId && c.parent !== payload.commentId
        ),
        posts: prev.posts.map((p) =>
          p.id === payload.postId ? { ...p, commentsCount: payload.commentsCount ?? p.commentsCount } : p
        ),
      }));
    });

    on("blog:comment", (payload) => {
      if (!payload?.comment) return;
      commitData((prev) => ({
        ...prev,
        comments: mergeById(prev.comments, [payload.comment]),
      }));
    });
    on("blog:comment:deleted", (payload) => {
      if (!payload?.commentId) return;
      commitData((prev) => ({
        ...prev,
        comments: prev.comments.filter(
          (c) => c.id !== payload.commentId && c.parent !== payload.commentId
        ),
      }));
    });

    on("story:new", (payload) => upsertStory(payload?.story));
    on("story:deleted", (payload) => removeStory(payload?.storyId));
    on("story:view", (payload) => {
      commitData((prev) => ({
        ...prev,
        stories: prev.stories.map((s) =>
          s.id === payload?.storyId ? { ...s, views: payload.views ?? s.views } : s
        ),
      }));
    });

    on("live:new", (payload) => upsertLive(payload?.live));
    on("live:ended", (payload) => removeLive(payload?.liveId));
    on("live:viewers", (payload) => {
      commitData((prev) => ({
        ...prev,
        live: prev.live.map((l) =>
          l.id === payload?.liveId ? { ...l, viewerCount: payload.viewers, viewers: payload.viewers } : l
        ),
      }));
    });

    on("notification:new", (notification) => {
      addNotification(notification);
      if (!runtime.current.notifEnabled) return;
      const active = activeConvRef.current;
      if (notification?.type === "message" && active && notification.ref === active) return;
      runtime.current.say(notification?.text || "New notification");
      beep();
      try {
        if (document.hidden && window.Notification && Notification.permission === "granted") {
          new Notification("Shree Yuwa Shakti Club", { body: notification?.text || "" });
        }
      } catch (_err) {
        /* ignore */
      }
    });

    on("chat:message", (payload) => {
      const conversationId = payload?.conversationId;
      const message = payload?.message;
      if (!conversationId || !message) return;
      appendMessage(conversationId, message);
      const mine = runtime.current.me?.id;
      const fromOther = message.from !== mine;
      commitData((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) => {
          if (c.id !== conversationId) return c;
          const isActive = activeConvRef.current === conversationId;
          return {
            ...c,
            lastMessage: {
              text: message.text || (message.attachments?.length ? "📎 Attachment" : "Message"),
              sender: message.from,
              at: message.createdAt || new Date(message.t || Date.now()).toISOString(),
            },
            lastAt: message.createdAt || c.lastAt,
            unread: isActive || !fromOther ? 0 : (c.unread || 0) + 1,
          };
        }),
      }));
      if (!fromOther) return;
      const conversation = dataRef.current.conversations.find((c) => c.id === conversationId);
      if (conversation?.type === "group" && activeConvRef.current !== conversationId && runtime.current.notifEnabled) {
        const sender = message.sender?.name || "Someone";
        runtime.current.say(`${sender} in #${conversation.name}: ${(message.text || "sent an attachment").slice(0, 70)}`, true);
        beep();
      }
    });

    on("conversation:update", (payload) => {
      commitData((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === payload?.conversationId
            ? {
                ...c,
                lastMessage: payload.lastMessage || c.lastMessage,
                lastAt: payload.lastMessage?.at || c.lastAt,
              }
            : c
        ),
      }));
    });

    on("conversation:deleted", (payload) => {
      const id = payload?.conversationId;
      commitData((prev) => ({ ...prev, conversations: prev.conversations.filter((c) => c.id !== id) }));
      updateMessages((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    on("chat:typing", (payload) => {
      const id = payload?.conversationId;
      if (!id) return;
      const patch = payload.typing && payload.user ? { name: payload.user.name, at: Date.now() } : null;
      typingRef.current = { ...typingRef.current, [id]: patch };
      setTypingState(typingRef.current);
      clearTimeout(typingTimers.current[id]);
      if (patch) {
        typingTimers.current[id] = setTimeout(() => {
          typingRef.current = { ...typingRef.current, [id]: null };
          setTypingState(typingRef.current);
        }, 3500);
      }
    });

    on("chat:read", (payload) => {
      const id = payload?.conversationId;
      const userId = payload?.userId;
      if (!id || !userId) return;
      updateMessages((prev) => ({
        ...prev,
        [id]: (prev[id] || []).map((m) =>
          m.from !== userId && !(m.readBy || []).includes(userId)
            ? { ...m, readBy: [...(m.readBy || []), userId] }
            : m
        ),
      }));
    });

    on("chat:delivered", (payload) => {
      const id = payload?.conversationId;
      const userId = payload?.userId;
      if (!id || !userId) return;
      updateMessages((prev) => ({
        ...prev,
        [id]: (prev[id] || []).map((m) =>
          !(m.deliveredTo || []).includes(userId)
            ? { ...m, deliveredTo: [...(m.deliveredTo || []), userId] }
            : m
        ),
      }));
    });

    on("chat:reaction", (payload) => {
      const id = payload?.conversationId;
      if (!id) return;
      updateMessages((prev) => ({
        ...prev,
        [id]: (prev[id] || []).map((m) =>
          m.id === payload.messageId ? { ...m, reactions: payload.reactions || [] } : m
        ),
      }));
    });

    on("chat:edited", (payload) => {
      const id = payload?.conversationId;
      if (!id) return;
      updateMessages((prev) => ({
        ...prev,
        [id]: (prev[id] || []).map((m) =>
          m.id === payload.messageId ? { ...m, text: payload.text, editedAt: payload.editedAt } : m
        ),
      }));
    });

    on("chat:deleted", (payload) => {
      const id = payload?.conversationId;
      if (!id) return;
      updateMessages((prev) => ({
        ...prev,
        [id]: (prev[id] || []).map((m) =>
          m.id === payload.messageId
            ? { ...m, deleted: true, text: "This message was deleted", attachments: [] }
            : m
        ),
      }));
    });

    on("chat:hidden", (payload) => {
      const id = payload?.conversationId;
      if (!id) return;
      updateMessages((prev) => ({
        ...prev,
        [id]: (prev[id] || []).filter((m) => m.id !== payload.messageId),
      }));
    });

    on("presence:list", (payload) => {
      setOnlineIds(Array.isArray(payload?.users) ? payload.users : []);
    });

    on("presence:update", (payload) => {
      if (!payload?.userId) return;
      setOnlineIds((prev) => {
        const set = new Set(prev);
        if (payload.online) set.add(payload.userId);
        else set.delete(payload.userId);
        return Array.from(set);
      });
    });

    on("user:updated", (payload) => {
      const user = payload?.user;
      if (!user?.id) return;
      commitData((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === user.id ? { ...u, ...user } : u)),
      }));
      if (runtime.current.me?.id === user.id) updateMe(user);
    });

    on("account:disabled", () => {
      runtime.current.say("Your account has been deactivated");
      logout();
    });

    on("account:deleted", () => {
      logout();
    });

    const refreshable = ["about", "blogs", "gallery", "banners", "team", "comments"];
    refreshable.forEach((name) => on(`${name}:changed`, () => refreshCollection(name)));

    on("groups:changed", (payload) => {
      if (Array.isArray(payload?.items)) commitData((prev) => ({ ...prev, groups: payload.items }));
      else refreshCollection("groups");
    });

    const onConnect = () => {
      const current = getSocket();
      if (current?.connected) current.emit("presence:get", () => {});
    };
    socket.on("connect", onConnect);

    return () => {
      socket.off("post:new");
      socket.off("post:updated");
      socket.off("post:deleted");
      socket.off("post:comment");
      socket.off("post:comment:deleted");
      socket.off("blog:comment");
      socket.off("blog:comment:deleted");
      socket.off("story:new");
      socket.off("story:deleted");
      socket.off("story:view");
      socket.off("live:new");
      socket.off("live:ended");
      socket.off("live:viewers");
      socket.off("notification:new");
      socket.off("chat:message");
      socket.off("conversation:update");
      socket.off("conversation:deleted");
      socket.off("chat:typing");
      socket.off("chat:read");
      socket.off("chat:delivered");
      socket.off("chat:reaction");
      socket.off("chat:edited");
      socket.off("chat:deleted");
      socket.off("chat:hidden");
      socket.off("presence:list");
      socket.off("presence:update");
      socket.off("user:updated");
      socket.off("account:disabled");
      socket.off("account:deleted");
      socket.off("groups:changed");
      socket.off("connect", onConnect);
      refreshable.forEach((name) => socket.off(`${name}:changed`));
    };
  }, [
    token,
    upsertPost,
    removePost,
    upsertStory,
    removeStory,
    upsertLive,
    removeLive,
    appendMessage,
    addNotification,
    updateMessages,
    commitData,
    updateMe,
    logout,
    refreshCollection,
  ]);

  const value = useMemo(() => {
    const { users, about, blogs, gallery, banners, team, groups, comments, postComments, posts, stories, live, notifs, conversations } = data;
    return {
      users,
      about,
      blogs,
      gallery,
      banners,
      team,
      groups,
      comments,
      postComments,
      posts,
      stories,
      live,
      notifs,
      conversations,
      messages,
      msgs: messages,
      config,
      stats,
      loading,
      booted,
      bootError,
      onlineIds,
      typing,
      activeConversation,
      postHasMore,
      loadingMore,
      unreadNotifs: notifs.filter((n) => !n.read).length,
      isOnline: (id) => onlineIds.includes(id),
      d: { users, about, blogs, gallery, banners, team, groups, comments, postComments, posts, stories, live, msgs: messages },
      set: {
        users: (u) => setLocal("users", u),
        about: (u) => setCollection("about", u),
        blogs: (u) => setCollection("blogs", u),
        gallery: (u) => setCollection("gallery", u),
        banners: (u) => setCollection("banners", u),
        team: (u) => setCollection("team", u),
        groups: (u) => setCollection("groups", u),
        comments: (u) => setCollection("comments", u),
        msgs: (u) => updateMessages(u),
      },
      setUsers: (u) => setLocal("users", u),
      setPosts: (u) => setLocal("posts", u),
      setCommentsLocal: (u) => setLocal("comments", u),
      setStories: (u) => setLocal("stories", u),
      setLive: (u) => setLocal("live", u),
      setNotifs: (u) => setLocal("notifs", u),
      setConversations: (u) => setLocal("conversations", u),
      setMsgs: (u) => updateMessages(u),
      upsertPost,
      removePost,
      upsertStory,
      removeStory,
      upsertLive,
      removeLive,
      upsertConversation,
      addNotification,
      createPost,
      reactPost,
      sharePost,
      deletePost,
      loadMorePosts,
      loadPostComments,
      addPostComment,
      deletePostComment,
      createStory,
      deleteStory,
      viewStory,
      startLive,
      endLive,
      loadMessages,
      ensureDirect,
      sendChat,
      markConversationRead,
      setActiveConversation,
      sendTyping,
      reactChatMessage,
      editChatMessage,
      deleteChatMessage,
      deleteConversation,
      markAllNotifsRead,
      markNotifRead,
      clearNotifs,
      removeNotif,
      pushNotif,
      refreshBootstrap: loadBootstrap,
      toast,
      say,
      dismiss,
    };
  }, [
    data,
    messages,
    config,
    stats,
    loading,
    booted,
    bootError,
    onlineIds,
    typing,
    activeConversation,
    postHasMore,
    loadingMore,
    setLocal,
    setCollection,
    updateMessages,
    upsertPost,
    removePost,
    upsertStory,
    removeStory,
    upsertLive,
    removeLive,
    upsertConversation,
    addNotification,
    createPost,
    reactPost,
    sharePost,
    deletePost,
    loadMorePosts,
    loadPostComments,
    addPostComment,
    deletePostComment,
    createStory,
    deleteStory,
    viewStory,
    startLive,
    endLive,
    loadMessages,
    ensureDirect,
    sendChat,
    markConversationRead,
    setActiveConversation,
    sendTyping,
    reactChatMessage,
    editChatMessage,
    deleteChatMessage,
    deleteConversation,
    markAllNotifsRead,
    markNotifRead,
    clearNotifs,
    removeNotif,
    pushNotif,
    loadBootstrap,
    toast,
    say,
    dismiss,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
