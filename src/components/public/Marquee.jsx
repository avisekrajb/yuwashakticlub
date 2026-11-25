import Photo from "../common/Photo";

export default function Marquee({ list, dir }) {
  const reps = Math.max(1, Math.ceil(8 / list.length));
  const half = Array.from({ length: reps }, () => list).flat();
  return <div className="mq"><div className={"mt " + dir}>{[...half, ...half].map((g, k) => <div className="mi" key={k}><Photo g={g} i={k % list.length} /></div>)}</div></div>;
}
