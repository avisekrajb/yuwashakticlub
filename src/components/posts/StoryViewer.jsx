import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "../common/Avatar";
import { I } from "../common/Icon";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { ago } from "../../utils";

const PHOTO_SECONDS = 5;

export default function StoryViewer({ group, index = 0, onClose }) {
  const { me } = useAuth();
  const { viewStory, deleteStory, say } = useApp();
  const stories = group?.stories || [];
  const [at, setAt] = useState(Math.min(index, Math.max(0, stories.length - 1)));
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const startRef = useRef(Date.now());
  const elapsedRef = useRef(0);
  const story = stories[at];

  const goNext = useCallback(() => {
    setAt((i) => {
      if (i + 1 < stories.length) return i + 1;
      onClose();
      return i;
    });
  }, [stories.length, onClose]);

  const goPrev = () => {
    setAt((i) => Math.max(0, i - 1));
  };

  useEffect(() => {
    if (!story) return;
    setProgress(0);
    setPaused(false);
    elapsedRef.current = 0;
    startRef.current = Date.now();
    if (me && !story.mine) viewStory(story.id).catch(() => {});
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const seconds = story
    ? story.kind === "photo"
      ? PHOTO_SECONDS
      : Math.min(Math.max(Number(story.duration) || PHOTO_SECONDS, 2), 15)
    : PHOTO_SECONDS;

  useEffect(() => {
    if (!story) return undefined;
    if (paused) {
      elapsedRef.current += Date.now() - startRef.current;
      return undefined;
    }
    startRef.current = Date.now();
    const timer = setInterval(() => {
      const elapsed = (elapsedRef.current + (Date.now() - startRef.current)) / 1000;
      const pct = Math.min(100, (elapsed / seconds) * 100);
      setProgress(pct);
      if (pct >= 100) goNext();
    }, 80);
    return () => clearInterval(timer);
  }, [story?.id, paused, seconds, goNext]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, onClose]);

  if (!story) return null;
  const mine = story.mine || (me && story.author?.id === me.id);

  const remove = async () => {
    if (!window.confirm("Delete this story?")) return;
    setBusy(true);
    try {
      await deleteStory(story.id);
      say("Story deleted");
      if (stories.length <= 1) onClose();
      else {
        setAt((i) => Math.min(i, stories.length - 2));
      }
    } catch (e) {
      say(e.message || "Could not delete the story");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="story-overlay" role="dialog" aria-modal="true" aria-label="Story">
      <div className="story-frame">
        <div className="story-progress">
          {stories.map((s, i) => (
            <span key={s.id} className="story-seg">
              <i
                style={{
                  width: i < at ? "100%" : i === at ? `${progress}%` : "0%",
                }}
              />
            </span>
          ))}
        </div>

        <header className="story-top">
          <Avatar u={story.author || { name: "Member" }} size={38} />
          <div className="story-who">
            <b>{story.author?.name || "Member"}</b>
            <small>{ago(story.t)}</small>
          </div>
          <button type="button" className="ib story-mute" onClick={() => setMuted((v) => !v)} aria-label={muted ? "Unmute" : "Mute"}>
            {muted ? "🔇" : "🔊"}
          </button>
          {mine && (
            <button type="button" className="ib red" onClick={remove} disabled={busy} aria-label="Delete story">
              {I("trash", 18)}
            </button>
          )}
          <button type="button" className="ib story-close" onClick={onClose} aria-label="Close story">
            ×
          </button>
        </header>

        <div
          className="story-stage"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {story.kind === "video" ? (
            <video
              key={story.id}
              src={story.url}
              poster={story.poster || undefined}
              autoPlay
              playsInline
              muted={muted}
              onEnded={goNext}
            />
          ) : story.kind === "audio" ? (
            <div className="story-audio">
              <div className="story-audio-wave">
                {Array.from({ length: 24 }).map((_, i) => (
                  <span key={i} style={{ animationDelay: `${i * 60}ms` }} />
                ))}
              </div>
              <Avatar u={story.author || { name: "Member" }} size={88} />
              <p>{story.caption || "Sound story"}</p>
              <audio key={story.id} src={story.url} autoPlay muted={muted} onEnded={goNext} controls />
            </div>
          ) : (
            <img src={story.url} alt={story.caption || "Story"} />
          )}

          {story.sound?.url && story.kind !== "audio" && (
            <audio key={story.sound.url} src={story.sound.url} autoPlay muted={muted} />
          )}

          <button type="button" className="story-nav prev" onClick={goPrev} aria-label="Previous story" />
          <button type="button" className="story-nav next" onClick={goNext} aria-label="Next story" />

          {story.caption && <div className="story-caption">{story.caption}</div>}
          {story.sound?.name && (
            <div className="story-sound-chip">
              {muted ? "🔇" : "🎵"} {story.sound.name}
            </div>
          )}
          <div className="story-views">
            {I("user", 14)} {story.views || 0} view{(story.views || 0) === 1 ? "" : "s"}
          </div>
        </div>
      </div>
    </div>
  );
}
