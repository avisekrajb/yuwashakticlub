export const SEED = {
  users: [
    { id: "admin", name: "Club Admin", email: "a@gmail.com", pw: "123456", role: "admin", active: true, bio: "Club administrator" },
    { id: "u1", name: "Sita Rai", email: "sita@gmail.com", pw: "123456", role: "user", active: true, bio: "Volunteer" },
    { id: "u2", name: "Anil Limbu", email: "anil@gmail.com", pw: "123456", role: "user", active: true, bio: "Sports team" },
  ],
  about: [
    { id: "a1", emoji: "🔥", title: "Who we are", text: "Shree Yuwa Shakti Club is a youth-led community group that turns energy into action — through sports, learning, and service to our neighbourhood." },
    { id: "a2", emoji: "🎯", title: "Our mission", text: "Give every young person a place to learn, lead, and belong, and use that strength to improve life in our community." },
    { id: "a3", emoji: "🌱", title: "What we do", text: "Clean-up drives, blood donation camps, sports tournaments, skill workshops and cultural festivals all year round." },
  ],
  blogs: [
    { id: "b1", title: "Our annual clean-up drive: 120 volunteers, one weekend", tag: "Community", date: "2026-10-12", text: "Over one weekend our members cleared three river banks and planted 200 saplings. Here is how we organised it, and how you can run one in your ward." },
    { id: "b2", title: "Inter-club football cup: highlights", tag: "Sports", date: "2026-09-28", text: "Eight clubs, two days, and a penalty shootout nobody will forget. Read the match-by-match story and see who took the trophy home." },
    { id: "b3", title: "Free digital skills workshop for students", tag: "Learning", date: "2026-09-05", text: "We taught 60 students to build a CV, use email safely and make their first website. The next batch opens soon." },
  ],
  gallery: [
    { id: "g1", title: "Clean-up drive", url: "", slide: true }, { id: "g2", title: "Football cup", url: "", slide: true },
    { id: "g3", title: "Blood donation camp", url: "", slide: true }, { id: "g4", title: "Cultural night", url: "", slide: true },
    { id: "g5", title: "Workshop day", url: "" }, { id: "g6", title: "Tree plantation", url: "" },
  ],
  banners: [
    { id: "n1", title: "Youth power for a stronger community", sub: "Join Shree Yuwa Shakti Club today", url: "" },
    { id: "n2", title: "Annual football cup is coming", sub: "Register your team this month", url: "" },
    { id: "n3", title: "Blood donation camp", sub: "Give blood, save lives", url: "" },
  ],
  team: [
    { id: "t1", name: "Ram Karki", role: "President", url: "" }, { id: "t2", name: "Sita Rai", role: "Secretary", url: "" },
    { id: "t3", name: "Anil Limbu", role: "Treasurer", url: "" }, { id: "t4", name: "Puja Thapa", role: "Coordinator", url: "" },
    { id: "t5", name: "Bikash Magar", role: "Sports lead", url: "" }, { id: "t6", name: "Nisha Gurung", role: "Media lead", url: "" },
    { id: "t7", name: "Rohan Shah", role: "Volunteer", url: "" }, { id: "t8", name: "Mina Tamang", role: "Volunteer", url: "" },
  ],
  groups: [
    { id: "r1", name: "General", desc: "Everyone in the club" },
    { id: "r2", name: "Events team", desc: "Plan upcoming events" },
  ],
  notifs: [
    { id: "n1", type: "welcome", for: "all", by: "system", text: "Welcome to Shree Yuwa Shakti Club! 🎉", t: Date.now() - 3600000 },
    { id: "n2", type: "blog", for: "all", by: "admin", ref: "b2", text: "New blog: Inter-club football cup: highlights", t: Date.now() - 7200000 },
  ],
  comments: [
    { id: "c1", blogId: "b1", userId: "u1", name: "Sita Rai", text: "Great work everyone! Proud to be part of this 🌱", t: Date.now() - 86400000 },
    { id: "c2", blogId: "b2", userId: "u2", name: "Anil Limbu", text: "What a final! Can't wait for next year's cup.", t: Date.now() - 7200000 },
  ],
  msgs: {
    r1: [{ id: "m1", from: "admin", text: "Welcome to Shree Yuwa Shakti Club chat! 👋", t: Date.now() - 3600000 }],
  },
};
