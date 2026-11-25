import { useState } from "react";
import Modal from "../common/Modal";
import EditForm from "./EditForm";
import DeleteModal from "./DeleteModal";
import { I } from "../common/Icon";
import { uid } from "../../utils";

export const up = (setter) => (it, isEdit) => setter((l) => (isEdit ? l.map((x) => (x.id === it.id ? it : x)) : [it, ...l]));
export const rm = (setter) => (it) => setter((l) => l.filter((x) => x.id !== it.id));

export default function Crud({ title, items, fields, card, onSave, onDel, extra, locked, say, blank, Form }) {
  const [ed, setEd] = useState(null);
  const [del, setDel] = useState(null);
  const done = (f) => { onSave({ ...f, id: f.id || uid() }, !!f.id); setEd(null); say(f.id ? "Changes saved" : "Added"); };
  return (
    <div>
      <div className="bar"><h2>{title}</h2><button className="btn sm" onClick={() => setEd(blank || {})}>+ Add new</button></div>
      {!items.length && <p className="muted">Nothing here yet. Add the first item.</p>}
      {items.map((it) => (
        <div className="row" key={it.id}>
          <div className="grow">{card(it)}</div>
          {extra && extra(it)}
          <button className="ib" aria-label="Edit" onClick={() => setEd(it)}>{I("edit")}</button>
          {!(locked && locked(it)) && <button className="ib red" aria-label="Delete" onClick={() => setDel(it)}>{I("trash")}</button>}
        </div>))}
      {ed && <Modal wide title={ed.id ? "Edit" : "Add new"} onClose={() => setEd(null)}>
        {Form ? <Form init={ed} onCancel={() => setEd(null)} onSave={done} /> : <EditForm fields={fields} init={ed} onCancel={() => setEd(null)} onSave={done} />}
      </Modal>}
      {del && <DeleteModal onCancel={() => setDel(null)} onConfirm={() => { onDel(del); setDel(null); say("Deleted"); }} />}
    </div>
  );
}
