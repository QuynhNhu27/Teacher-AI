/* Khởi động ứng dụng: đọc cài đặt, kết nối AI và lưu trữ, vẽ trang đầu tiên. */
"use strict";

/* ---------- khởi động ---------- */
try {
  const vv = localStorage.getItem("htd_voice");
  if (vv) S.rdVoice = vv;
  const rr = localStorage.getItem("htd_rate");
  if (rr && ["0.9", "1", "1.15", "1.3"].includes(rr)) S.rdRate = +rr;
  const mx = localStorage.getItem("htd_mix");
  if (mx) S.mixVoice = mx === "1";
} catch (e) {}
try {
  const th = localStorage.getItem("htd_theme");
  if (th) document.documentElement.dataset.theme = th;
  if (localStorage.getItem("htd_wide")) {
    document.body.classList.add("chat-wide");
    $("#wideBtn").textContent = "Thu nhỏ";
  }
} catch (e) {}
S.store = makeLocal();
S.subjects = [MEM.sub_mau];
S.sid = "mau";
S.bid = "b1";
renderMain();
renderChat();
(async () => {
  const use =
    window.claude && window.claude.use
      ? (n) => window.claude.use(n).catch(() => null)
      : async () => null;
  const [db, user, ai] = await Promise.all([use("db"), use("user"), use("sample")]);
  S.ai = ai || null;
  if (S.ai) {
    try {
      const l = await S.ai.limits();
      S.imgLim = l && l.images ? l.images : null;
    } catch (e) {}
  }
  try {
    if ("speechSynthesis" in window) {
      speechSynthesis.getVoices();
      speechSynthesis.onvoiceschanged = () => {
        for (const k in VCACHE) delete VCACHE[k];
        speechSynthesis.getVoices();
      };
    }
  } catch (e) {}
  let uid = null;
  try {
    uid = user ? await user.id() : null;
  } catch (e) {}
  const pill = $("#syncPill");
  if (db && uid) {
    S.store = makeDb(db, uid);
    pill.textContent = "Đồng bộ theo tài khoản";
    pill.className = "pill ok";
  } else {
    pill.textContent = "Chỉ lưu trên máy này";
    pill.className = "pill warn";
  }
  let list = [];
  try {
    list = await S.store.listSubjects();
  } catch (e) {
    toast(errMsg(e), "bad");
  }
  list = list.filter((s) => s && s.sid).sort((a, b) => (a.created || 0) - (b.created || 0));
  S.subjects = list.concat([MEM.sub_mau]);
  loadStats();
  if (list.length) {
    S.sid = list[list.length - 1].sid;
    S.bid = null;
  }
  renderMain();
  renderChat();
  if (!S.ai) toast("AI chỉ hoạt động khi mở trang trong claude.ai.");
})();
