/* Tiện ích dùng chung (chọn phần tử, thoát HTML, thông báo) và trạng thái chung S của ứng dụng. */
"use strict";

/* ---------- tiện ích ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const hash = (s) => {
  let h = 5381;
  for (const ch of String(s)) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const DAY = 864e5,
  BOX = [1, 3, 7, 14, 30];
const arr = (x) => (Array.isArray(x) ? x : []);
const TYPES = {
  lap_trinh: { n: "Lập trình", c: "mint" },
  ngoai_ngu: { n: "Ngoại ngữ", c: "peach" },
  khoa_hoc: { n: "Khoa học", c: "sky" },
  ly_thuyet: { n: "Lý thuyết · Triết · Sử", c: "lilac" },
  khac: { n: "Khác", c: "butter" },
};
const T = (t) => TYPES[t] || TYPES.khac;
const EXT = (t) => t === "ly_thuyet" || t === "khac";
function toast(msg, kind) {
  const el = document.createElement("div");
  el.className = "toast " + (kind || "");
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), kind === "bad" ? 6000 : 3200);
}
function errMsg(e) {
  const c = e && e.code;
  return (
    {
      not_granted: "Bạn chưa cho phép trang dùng AI. Bấm lại và chọn Cho phép.",
      rate_limited: "AI đang bận, chờ một lát rồi thử lại.",
      prompt_too_large: "Đoạn giáo trình quá dài cho một lần gửi.",
      invalid_json: "AI trả về sai định dạng. Bấm thử lại.",
      refused: "AI từ chối xử lý nội dung này.",
      empty_completion: "AI không trả lời. Thử lại nhé.",
      quota_exceeded: "Hết dung lượng lưu trữ. Hãy xóa bớt môn cũ.",
      session_expired: "Phiên đã hết hạn. Tải lại trang.",
      resource_exhausted: "Thao tác quá nhanh, chờ vài giây rồi thử lại.",
    }[c] || "Có lỗi: " + ((e && e.message) || e)
  );
}
const normAns = (s) =>
  String(s ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.。!?,;:"'“”‘’]+$/g, "")
    .trim();

/* ---------- trạng thái ---------- */
const S = {
  store: null,
  ai: null,
  subjects: [],
  sid: null,
  bid: null,
  tab: "bai",
  sources: {},
  lessons: {},
  cards: {},
  prac: {},
  chats: {},
  sel: null,
  busy: null,
  stopAll: false,
  review: null,
  confirmDel: false,
  aiReady: false,
  imgLim: null,
  pmode: "",
  parsons: {},
  build: {},
  hintN: {},
  said: {},
  rate: 0.85,
  hideTx: false,
  chepI: 0,
  vietI: 0,
  showTpl: true,
  sanCode: null,
  sanLang: "JavaScript",
  mcq: {},
  readerData: {},
  exam: null,
  rdRate: 1,
  mixVoice: true,
  rdVoice: "",
  stats: { xp: 0, days: {} },
  kanaSet: "hira",
};
