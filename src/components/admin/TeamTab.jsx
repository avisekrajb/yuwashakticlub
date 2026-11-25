import Crud, { up, rm } from "./Crud";
import { useApp } from "../../context/AppContext";

export default function TeamTab() {
  const { d, set, say } = useApp();
  return (
    <Crud title="Team members" items={d.team} say={say} onSave={up(set.team)} onDel={rm(set.team)}
      fields={[{ k: "name", label: "Name" }, { k: "role", label: "Role" }, { k: "url", label: "Photo link (optional)", opt: true }]}
      card={(m) => <><b>{m.name}</b><small>{m.role}</small></>} />
  );
}
