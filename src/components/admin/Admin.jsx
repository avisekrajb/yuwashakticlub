import { useState } from "react";
import Sidebar from "./Sidebar";
import AdminHeader from "./AdminHeader";
import Dashboard from "./Dashboard";
import BannersTab from "./BannersTab";
import TeamTab from "./TeamTab";
import AboutTab from "./AboutTab";
import BlogsTab from "./BlogsTab";
import CommentsTab from "./CommentsTab";
import GalleryTab from "./GalleryTab";
import ChatTab from "./ChatTab";
import UsersTab from "./UsersTab";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const TABS = [["home", "Overview", "grid"], ["banners", "Banners", "film"], ["team", "Team", "users"], ["about", "About", "info"], ["blogs", "Blogs", "blog"], ["comments", "Comments", "chat"], ["gallery", "Gallery", "image"], ["chat", "Chat", "chat"], ["users", "Users", "users"]];
const GROUPS = [["Main", ["home"]], ["Content", ["banners", "team", "about", "blogs", "gallery", "comments"]], ["Community", ["chat", "users"]]];

export default function Admin({ askLogout }) {
  const { d } = useApp();
  const { me } = useAuth();
  const { dark, setDark } = useTheme();
  const [tab, setTab] = useState("home");
  const [open, setOpen] = useState(false);
  const go = (k) => { setTab(k); setOpen(false); window.scrollTo({ top: 0 }); };
  const counts = { banners: d.banners.length, team: d.team.length, about: d.about.length, blogs: d.blogs.length, gallery: d.gallery.length, comments: d.comments.length, chat: d.groups.length, users: d.users.length };
  const cur = TABS.find((t) => t[0] === tab);
  return (
    <div className="adm">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <Sidebar tab={tab} go={go} open={open} tabs={TABS} groups={GROUPS} counts={counts} askLogout={askLogout} />
      <div className="am">
        <AdminHeader setOpen={setOpen} cur={cur} tab={tab} dark={dark} setDark={setDark} me={me} />
        <main className="ac">
          {tab === "home" && <Dashboard go={go} />}
          {tab === "banners" && <BannersTab />}
          {tab === "team" && <TeamTab />}
          {tab === "comments" && <CommentsTab />}
          {tab === "about" && <AboutTab />}
          {tab === "blogs" && <BlogsTab />}
          {tab === "gallery" && <GalleryTab />}
          {tab === "chat" && <ChatTab />}
          {tab === "users" && <UsersTab />}
        </main>
      </div>
    </div>
  );
}
