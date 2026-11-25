export default function About({ d }) {
  return (<><h1 className="ttl">About the club</h1><p className="sub">Who we are, why we exist, and what we do.</p>
    <div className="grid c3">{d.about.map((a) => <div className="card" key={a.id}><div className="em">{a.emoji}</div><h3>{a.title}</h3><p>{a.text}</p></div>)}</div></>);
}
