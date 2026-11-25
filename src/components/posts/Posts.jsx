import { useEffect, useRef, useState } from "react";
import Avatar from "../common/Avatar";
import Loader from "../common/Loader";
import { I } from "../common/Icon";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import PostComposer from "./PostComposer";
import PostCard from "./PostCard";
import StoryBar from "./StoryBar";
import StoryViewer from "./StoryViewer";
import StoryComposer from "./StoryComposer";
import LiveSection from "../live/LiveSection";
import GoLiveModal from "../live/GoLiveModal";
import LiveRoom from "../live/LiveRoom";

export default function Posts({ openAuth, focus, onFocusHandled }) {
  const { me } = useAuth();
  const { posts, live, stories, postHasMore, loadingMore, loadMorePosts, upsertPost, say } = useApp();
  const [composer, setComposer] = useState(false);
  const [storyComposer, setStoryComposer] = useState(false);
  const [storyGroup, setStoryGroup] = useState(null);
  const [storyAt, setStoryAt] = useState(0);
  const [watching, setWatching] = useState(null);
  const [goLive, setGoLive] = useState(false);
  const [loadingFocus, setLoadingFocus] = useState(false);
  const handled = useRef(null);

  const needAuth = () => {
    if (!me) {
      openAuth && openAuth("login");
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!focus || handled.current === focus) return;
    handled.current = focus;
    if (focus.liveId) {
      const found = live.find((l) => l.id === focus.liveId);
      if (found) setWatching(found);
      else say("That live video has ended");
      onFocusHandled && onFocusHandled();
    }
    if (focus.storyId) {
      const story = stories.find((s) => s.id === focus.storyId);
      if (story) {
        const authorId = story.author?.id || "unknown";
        const groupStories = stories
          .filter((s) => (s.author?.id || "unknown") === authorId)
          .sort((a, b) => (a.t || 0) - (b.t || 0));
        const at = Math.max(0, groupStories.findIndex((s) => s.id === story.id));
        setStoryGroup({
          author: story.author || { name: "Member" },
          stories: groupStories,
          seen: false,
        });
        setStoryAt(at);
      } else {
        say("That story is no longer available");
      }
      onFocusHandled && onFocusHandled();
    }
    if (focus.postId) {
      const scroll = () => {
        const el = document.getElementById("post-" + focus.postId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      const found = posts.find((p) => p.id === focus.postId);
      if (found) {
        setTimeout(scroll, 120);
        onFocusHandled && onFocusHandled();
      } else {
        setLoadingFocus(true);
        api
          .get(`/posts/${focus.postId}`)
          .then((post) => {
            upsertPost(post);
            setTimeout(scroll, 200);
          })
          .catch(() => say("That post is no longer available"))
          .finally(() => {
            setLoadingFocus(false);
            onFocusHandled && onFocusHandled();
          });
      }
    }
  }, [focus, live, stories, posts, upsertPost, say, onFocusHandled]);

  const openStory = (group) => {
    setStoryGroup(group);
    setStoryAt(0);
  };

  return (
    <div className="posts-page">
      <StoryBar
        onAdd={() => (needAuth() ? null : setStoryComposer(true))}
        onOpen={openStory}
      />

      <LiveSection
        onWatch={(l) => setWatching(l)}
        onGoLive={() => (needAuth() ? null : setGoLive(true))}
      />

      <div className="composer-prompt">
        <Avatar u={me || { name: "Guest" }} size={44} />
        <button
          type="button"
          className="composer-fake"
          onClick={() => (needAuth() ? null : setComposer(true))}
        >
          {me ? `What's happening, ${me.name.split(" ")[0]}?` : "Log in to share a post…"}
        </button>
        <button
          type="button"
          className="btn sm composer-media"
          onClick={() => (needAuth() ? null : setComposer(true))}
          aria-label="Add photo or video"
        >
          {I("image", 18)}
        </button>
      </div>

      {loadingFocus && (
        <div className="posts-loading">
          <Loader />
        </div>
      )}

      {!posts.length && !loadingFocus && (
        <div className="card posts-empty">
          <span className="em">📝</span>
          <h3>No posts yet</h3>
          <p>Be the first to share a moment, photo or video with the club.</p>
          <button type="button" className="btn sm" onClick={() => (needAuth() ? null : setComposer(true))}>
            Create the first post
          </button>
        </div>
      )}

      <div className="post-feed">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} openAuth={openAuth} />
        ))}
      </div>

      {postHasMore && (
        <div className="posts-more">
          <button type="button" className="btn line" onClick={loadMorePosts} disabled={loadingMore}>
            {loadingMore ? <Loader /> : "Load older posts"}
          </button>
        </div>
      )}

      {composer && <PostComposer onClose={() => setComposer(false)} />}
      {storyComposer && <StoryComposer onClose={() => setStoryComposer(false)} />}
      {storyGroup && (
        <StoryViewer group={storyGroup} index={storyAt} onClose={() => setStoryGroup(null)} />
      )}
      {watching && <LiveRoom live={watching} onClose={() => setWatching(null)} />}
      {goLive && (
        <GoLiveModal
          onClose={() => setGoLive(false)}
          onStart={(started) => {
            setGoLive(false);
            setWatching(started);
          }}
        />
      )}
    </div>
  );
}
