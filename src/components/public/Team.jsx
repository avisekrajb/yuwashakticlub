import Face from "./Face";

export default function Team({ list }) {
  return list.map((m, i) => <div key={m.id}><Face m={m} i={i} /><b>{m.name}</b><small>{m.role}</small></div>);
}
