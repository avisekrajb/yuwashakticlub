import Modal from "../common/Modal";
import { ytId } from "../../utils";

export default function VideoModal({ g, onClose }) {
  const id = ytId(g.url);
  return (
    <Modal wide cls="vw" onClose={onClose} title={g.title}>
      <div className="vp">{id
        ? <iframe title={g.title} src={"https://www.youtube.com/embed/" + id + "?autoplay=1&rel=0"} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        : <video src={g.url} controls autoPlay playsInline />}</div>
      <button className="btn" onClick={onClose}>Close</button>
    </Modal>
  );
}
