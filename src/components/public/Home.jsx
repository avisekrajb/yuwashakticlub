import Banner from "./Banner";
import Team from "./Team";
import Marquee from "./Marquee";
import BlogCard from "./BlogCard";
import VideoCard from "./VideoCard";

export default function Home({ d, go, onTeam, openBlog, onPlay, onVideos }) {
  const vids = d.gallery.filter((g) => g.type === "video");
  const sl = d.gallery.filter((g) => g.slide && g.type !== "video");
  return (
    <>
      <Banner items={d.banners} />
      <div className="sec"><h2>Our team <a onClick={onTeam}>View all</a></h2>
        <div className="tm"><Team list={d.team.slice(0, 8)} /></div></div>
      <div className="sec"><h2>About us</h2>
        <div className="card abt">
          <div><h3 style={{ margin: "0 0 6px" }}>{d.about[0]?.emoji} {d.about[0]?.title}</h3><p>{d.about[0]?.text}</p>
            <div className="chips" style={{ marginTop: 12 }}>{d.about.slice(1).map((a) => <span className="tag" key={a.id}>{a.emoji} {a.title}</span>)}</div></div>
          <button className="btn sm" onClick={() => go("about")}>Read more</button>
        </div></div>
      {d.blogs.length > 0 && <div className="sec"><h2>Latest blogs <a onClick={() => go("blogs")}>View more</a></h2>
        <div className="grid c3">{d.blogs.slice(0, 3).map((b) => <BlogCard key={b.id} b={b} cc={d.comments.filter((c) => c.blogId === b.id).length} onOpen={() => openBlog(b)} />)}</div></div>}
      {vids.length > 0 && <div className="sec"><h2>Latest vlogs <a onClick={onVideos}>View more</a></h2>
        <div className="rail">{vids.slice(0, 3).map((g, i) => <div key={g.id}><VideoCard g={g} i={i} onPlay={onPlay} /></div>)}</div></div>}
      {sl.length > 0 && <div className="sec"><h2>Moments <a onClick={() => go("gallery")}>See gallery</a></h2>
        <Marquee list={sl.length > 3 ? sl.filter((_, i) => i % 2 === 0) : sl} dir="ltr" />
        <Marquee list={sl.length > 3 ? sl.filter((_, i) => i % 2 === 1) : [...sl].reverse()} dir="rtl" /></div>}
    </>
  );
}
