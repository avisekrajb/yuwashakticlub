import { useMemo } from "react";
import Avatar from "../common/Avatar";
import { I } from "../common/Icon";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";

export default function LiveSection({ onWatch, onGoLive }) {
  const { live } = useApp();
  const { me } = useAuth();
  const mine = useMemo(
    () => (me ? live.find((l) => l.host?.id === me.id) : null),
    [live, me]
  );
  const others = useMemo(
    () => live.filter((l) => !me || l.host?.id !== me.id),
    [live, me]
  );

  return (
    <section className="live-section">
      <div className="live-head">
        <h2>
          <span className="live-dot" /> Live now
        </h2>
        {me ? (
          mine ? (
            <button type="button" className="btn sm live-go" onClick={() => onWatch(mine)}>
              {I("video", 16)} Back to your live
            </button>
          ) : (
            <button type="button" className="btn sm live-go" onClick={onGoLive}>
              {I("video", 16)} Go live
            </button>
          )
        ) : (
          <span className="muted live-note">Log in to start your own live video</span>
        )}
      </div>

      {live.length === 0 ? (
        <div className="live-empty">
          <span className="live-empty-ic">{I("video", 26)}</span>
          <div>
            <b>No live videos right now</b>
            <small>Start a live video for up to 10 minutes — everyone can watch.</small>
          </div>
          {me && (
            <button type="button" className="btn sm" onClick={onGoLive}>
              Go live
            </button>
          )}
        </div>
      ) : (
        <div className="live-rail">
          {[...(mine ? [mine] : []), ...others].map((l) => (
            <button
              key={l.id}
              type="button"
              className="live-card"
              onClick={() => onWatch(l)}
            >
              <span className="live-card-avatar">
                <Avatar u={l.host || { name: "Host" }} size={54} />
                <i className="live-card-dot" />
              </span>
              <span className="live-card-info">
                <b>{l.title}</b>
                <small>
                  {l.host?.name || "Member"} · {l.viewerCount || l.viewers || 0} watching
                </small>
              </span>
              <span className="live-card-play">{l.mine ? "Your live" : "Watch"}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
