import Crud, { up, rm } from "./Crud";
import { useApp } from "../../context/AppContext";

export default function BannersTab() {
  const { d, set, say } = useApp();
  return (
    <Crud title="Home banners" items={d.banners} say={say} onSave={up(set.banners)} onDel={rm(set.banners)}
      fields={[{ k: "title", label: "Headline" }, { k: "sub", label: "Small text", opt: true }, { k: "url", label: "Photo link (optional)", opt: true }]}
      card={(b) => <><b>{b.title}</b><small>{b.url || "Colour banner (no photo)"}</small></>} />
  );
}
