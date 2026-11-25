import BlogCard from "./BlogCard";

export default function Blogs({ d, onOpen }) {
  return (<><h1 className="ttl">Blogs</h1><p className="sub">News, stories and updates from our members.</p>
    <div className="grid c3">{d.blogs.map((b) => <BlogCard key={b.id} b={b} cc={d.comments.filter((c) => c.blogId === b.id).length} onOpen={() => onOpen(b)} />)}</div></>);
}
