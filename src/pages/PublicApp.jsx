import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import useScrollHide from "../hooks/useScrollHide";
import { api } from "../lib/api";
import Header from "../components/public/Header";
import BottomNav from "../components/public/BottomNav";
import Toast from "../components/common/Toast";
import Home from "../components/public/Home";
import About from "../components/public/About";
import Blogs from "../components/public/Blogs";
import BlogDetail from "../components/public/BlogDetail";
import Gallery from "../components/public/Gallery";
import TeamPage from "../components/public/TeamPage";
import ProfilePage from "../components/public/ProfilePage";
import SettingsPage from "../components/public/SettingsPage";
import Chat from "../components/chat/Chat";
import Posts from "../components/posts/Posts";

const NAV = [
  ["home", "Home", "home"],
  ["posts", "Posts", "plus"],
  ["blogs", "Blogs", "blog"],
  ["gallery", "Gallery", "image"],
  ["chat", "Chat", "chat"],
];

function initialPostId() {
  try {
    return new URLSearchParams(window.location.search).get("post");
  } catch (_err) {
    return null;
  }
}

export default function PublicApp({ setModal }) {
  const {
    d,
    blogs,
    conversations,
    toast,
    say,
    dismiss,
    setCommentsLocal,
  } = useApp();
  const { me } = useAuth();
  const navHidden = useScrollHide();

  const [page, setPage] = useState(() => (initialPostId() ? "posts" : "home"));
  const [blogId, setBlogId] = useState(null);
  const [galTab, setGalTab] = useState("photos");
  const [focus, setFocus] = useState(() => {
    const id = initialPostId();
    return id ? { postId: id } : null;
  });
  const [chatFocus, setChatFocus] = useState(null);
  const [chatNonce, setChatNonce] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);

  const blog = blogs.find((x) => x.id === blogId) || null;

  const go = useCallback((next) => {
    setPage(next);
    setBlogId(null);
    setFocus(null);
    setGalTab("photos");
    if (next !== "chat") setChatOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  const openBlog = useCallback(
    (b) => {
      if (!b?.id) return;
      setBlogId(b.id);
      setPage("blogs");
      setFocus(null);
      window.scrollTo({ top: 0 });
    },
    []
  );

  const openAuth = (mode) => setModal({ t: mode || "login" });
  const askLogout = () => setModal({ t: "logout" });
  const onPlay = (g) => setModal({ t: "video", g });

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      setBlogId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread || 0), 0),
    [conversations]
  );

  const focusPosts = (patch) => {
    setPage("posts");
    setBlogId(null);
    setFocus({ ...patch, _at: Date.now() });
    window.scrollTo({ top: 0 });
  };

  const openConversation = (conversationId) => {
    setPage("chat");
    setBlogId(null);
    setFocus(null);
    if (conversationId) {
      setChatFocus(conversationId);
      setChatNonce((n) => n + 1);
    }
  };

  const openNotification = (n) => {
    if (!n) return;
    const ref = n.ref;
    const kind = n.refType || (n.type === "message" ? "conversation" : n.type);
    if (kind === "post") {
      if (ref) focusPosts({ postId: ref });
      else go("posts");
      return;
    }
    if (kind === "story") {
      if (ref) focusPosts({ storyId: ref });
      else go("posts");
      return;
    }
    if (kind === "live") {
      if (ref) focusPosts({ liveId: ref });
      else go("posts");
      return;
    }
    if (kind === "blog") {
      const found = ref ? blogs.find((b) => b.id === ref) : null;
      if (found) openBlog(found);
      else go("blogs");
      return;
    }
    if (kind === "conversation") {
      openConversation(ref || null);
      return;
    }
    if (kind === "call") {
      openConversation(null);
      return;
    }
    if (n.type === "message" || n.type === "call") {
      openConversation(null);
    }
  };

  const postComment = async (blogPostId, text) => {
    if (!me) return openAuth("login");
    try {
      const comment = await api.post("/comments", {
        targetType: "blog",
        targetId: blogPostId,
        text,
      });
      setCommentsLocal((list) =>
        list.some((c) => c.id === comment.id) ? list : [...list, comment]
      );
    } catch (err) {
      say(err.message || "Could not add the comment");
    }
  };

  const delComment = async (c) => {
    if (!c?.id) return;
    if (!window.confirm("Delete this comment?")) return;
    try {
      await api.delete(`/comments/${c.id}`);
      setCommentsLocal((list) => list.filter((x) => x.id !== c.id && x.parent !== c.id));
      say("Comment deleted");
    } catch (err) {
      say(err.message || "Could not delete the comment");
    }
  };

  const chatPage = page === "chat";

  return (
    <>
      <Header
        nav={NAV}
        page={page}
        go={go}
        unreadTotal={unreadTotal}
        compact={chatPage}
        hideOnMobile={chatPage && chatOpen}
        openAuth={openAuth}
        askLogout={askLogout}
        onOpenNotif={openNotification}
      />

      <main
        className={
          "pg" +
          (chatPage ? " full chat-page" : "") +
          (chatPage && chatOpen ? " chat-open" : "")
        }
      >
        {page === "home" && (
          <Home
            d={d}
            go={go}
            onTeam={() => go("team")}
            openBlog={openBlog}
            onPlay={onPlay}
            onVideos={() => {
              go("gallery");
              setGalTab("videos");
            }}
          />
        )}
        {page === "about" && <About d={d} />}
        {page === "posts" && (
          <Posts
            openAuth={openAuth}
            focus={focus}
            onFocusHandled={() => setFocus(null)}
          />
        )}
        {page === "blogs" &&
          (blog ? (
            <BlogDetail
              key={blog.id}
              b={blog}
              all={blogs}
              comments={d.comments}
              me={me}
              users={d.users}
              onBack={() => setBlogId(null)}
              onOpen={openBlog}
              onPost={postComment}
              onDelComment={delComment}
              openAuth={openAuth}
            />
          ) : (
            <Blogs d={d} onOpen={openBlog} />
          ))}
        {page === "gallery" && <Gallery d={d} onPlay={onPlay} initTab={galTab} />}
        {page === "team" && <TeamPage d={d} />}
        {page === "profile" && me && <ProfilePage />}
        {page === "settings" && me && <SettingsPage askLogout={askLogout} />}
        {chatPage && (
          <Chat
            openAuth={openAuth}
            focusConversationId={chatFocus}
            focusNonce={chatNonce}
            onFocusHandled={() => setChatFocus(null)}
            onActiveChange={setChatOpen}
          />
        )}
      </main>

      {!(chatPage && chatOpen) && (
        <BottomNav
          nav={NAV}
          page={page}
          go={go}
          unreadTotal={unreadTotal}
          hidden={navHidden}
        />
      )}

      <Toast toast={toast} onChat={() => go("chat")} onDismiss={dismiss} />
    </>
  );
}
