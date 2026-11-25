import Crud, { up, rm } from "./Crud";
import { useApp } from "../../context/AppContext";

export default function AboutTab() {
  const { d, set, say } = useApp();
  return (
    <Crud title="About sections" items={d.about} say={say} onSave={up(set.about)} onDel={rm(set.about)}
      fields={[{ k: "emoji", label: "Emoji" }, { k: "title", label: "Title" }, { k: "text", label: "Text", type: "area" }]}
      card={(a) => <><b>{a.emoji} {a.title}</b><small>{a.text.slice(0, 70)}…</small></>} />
  );
}
