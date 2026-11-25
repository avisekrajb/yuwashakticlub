export default function Thumbs({ list, sm }) {
  return list.length > 0 && (
    <div className={"thumbs" + (sm ? " sm" : "")}>{list.map((u, i) => <img key={i} src={u} alt="" onError={(e) => (e.target.style.display = "none")} />)}</div>
  );
}
