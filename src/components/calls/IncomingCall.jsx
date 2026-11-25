import Avatar from "../common/Avatar";
import { I } from "../common/Icon";
import { useCall } from "../../context/CallContext";

export default function IncomingCall() {
  const { incoming, acceptCall, rejectCall } = useCall();
  if (!incoming) return null;
  const other = incoming.direction === "incoming" ? incoming.caller : incoming.callee;
  return (
    <div className="call-overlay incoming" role="dialog" aria-modal="true" aria-label="Incoming call">
      <div className="incoming-card">
        <div className="call-pulse">
          <Avatar u={other || { name: "Caller" }} size={96} />
          <span className="ring r1" />
          <span className="ring r2" />
          <span className="ring r3" />
        </div>
        <h2>{other?.name || "Someone"}</h2>
        <p>{incoming.kind === "video" ? "Incoming video call…" : "Incoming voice call…"}</p>
        <div className="incoming-actions">
          <button className="call-btn decline" onClick={rejectCall} aria-label="Decline call">
            {I("phone", 24)}
            <span>Decline</span>
          </button>
          <button className="call-btn accept" onClick={acceptCall} aria-label="Accept call">
            {incoming.kind === "video" ? I("video", 24) : I("phone", 24)}
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
