import Avatar from "../common/Avatar";
import { I } from "../common/Icon";
import { useCall } from "../../context/CallContext";
import { useApp } from "../../context/AppContext";

export default function ChatHeader({ conv, other, online, typing, onBack, onSearch, searching }) {
  const { startCall } = useCall();
  const { say } = useApp();
  const isGroup = conv.type === "group";

  const call = (kind) => {
    try {
      startCall({
        conversationId: conv.id,
        toUserId: isGroup ? undefined : other?.id,
        kind,
      });
    } catch (e) {
      say(e.message || "Could not start the call");
    }
  };

  const subtitle = typing
    ? "typing…"
    : isGroup
    ? conv.desc || `${(conv.members || []).length} members`
    : online
    ? "Online"
    : "Direct message";

  return (
    <div className="ch chat-head">
      <button type="button" className="ib bk" onClick={onBack} aria-label="Back">
        {I("back")}
      </button>
      {isGroup ? (
        <div className="av grad chat-group-av">#</div>
      ) : (
        <span className="chat-av-wrap">
          <Avatar u={other || { name: conv.name || "Member" }} />
          <i className={"chat-presence" + (online ? " on" : "")} />
        </span>
      )}
      <b>
        {isGroup ? conv.name : other?.name || conv.name || "Chat"}
        <small className={typing ? "typing" : ""}>{subtitle}</small>
      </b>
      <button
        type="button"
        className={"ib" + (searching ? " on" : "")}
        onClick={onSearch}
        aria-label="Search messages"
      >
        {I("search")}
      </button>
      <button type="button" className="ib" onClick={() => call("audio")} aria-label="Voice call">
        {I("phone")}
      </button>
      <button type="button" className="ib" onClick={() => call("video")} aria-label="Video call">
        {I("video")}
      </button>
    </div>
  );
}
