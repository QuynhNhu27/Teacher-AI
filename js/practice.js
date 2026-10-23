/* Luyện tập: bài tập code, sắp xếp dòng, nghe chép, tập viết tay, sân code, chạy JavaScript bằng Web Worker. */
"use strict";

const MODES = {
  ngoai_ngu: [
    ["nhanh", "Học nhanh"],
    ["bt", "Bài tập"],
    ["nghe", "Nghe & nói theo"],
    ["chep", "Nghe chép"],
    ["viet", "Tập viết"],
  ],
  lap_trinh: [
    ["bt", "Bài tập"],
    ["san", "Sân code"],
  ],
};
function prOf(sub, bid) {
  return (sub.pr && sub.pr[bid]) || { ok: [], n: 0 };
}
const pkey = (i) => S.sid + "/" + S.bid + "/" + i;
const normLoose = (s) =>
  String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");
const isJS = (ng) => /^(js|javascript|node)/i.test(String(ng || ""));
function shuffled(n) {
  const a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (n > 1 && a.every((v, i) => v === i)) [a[0], a[1]] = [a[1], a[0]];
  return a;
}
async function pLuyen(sub) {
  const bs = sortedBai(sub);
  let b = bs.find((x) => x.id === S.bid) || bs[0];
  if (!b) return `<div class="card empty"><p class="note">Chưa có bài nào để luyện.</p></div>`;
  S.bid = b.id;
  await getLines(sub);
  let modes = MODES[sub.type] || [["bt", "Bài tập"]];
  if (sub.type === "ngoai_ngu" && subLang(sub) === "ja-JP")
    modes = modes.concat([["kana", "Bảng chữ cái"]]);
  if (!modes.some((m) => m[0] === S.pmode)) S.pmode = modes[0][0];
  const sel = `<div class="row" style="justify-content:space-between"><div class="row"><label class="label" for="pracSel">Bài</label><select class="inp" id="pracSel" style="width:auto;max-width:100%">${bs.map((x, i) => `<option value="${x.id}" ${x.id === b.id ? "selected" : ""}>${i + 1}. ${esc(x.ten)}</option>`).join("")}</select></div>
    ${modes.length > 1 ? `<div class="seg" role="tablist">${modes.map(([k, n]) => `<button class="${S.pmode === k ? "on" : ""}" data-act="pmode" data-m="${k}">${n}</button>`).join("")}</div>` : ""}</div>`;
  let body;
  if (S.pmode === "nhanh") body = await mNhanh(sub, b);
  else if (S.pmode === "kana") body = mKana();
  else if (S.pmode === "nghe") body = await mNghe(sub, b);
  else if (S.pmode === "chep") body = await mChep(sub, b);
  else if (S.pmode === "viet") body = await mViet(sub, b);
  else if (S.pmode === "san") body = mSan(sub);
  else body = await mBaiTap(sub, b);
  return `<div class="stack">${sel}${body}</div>`;
}
const needLesson = () =>
  `<div class="card empty"><h2>Cần giải nghĩa bài trước</h2><p class="note">Phần này dùng các câu và từ đã được giải nghĩa trong bài.</p><button class="btn" data-act="gen-les" ${S.ai && !S.busy ? "" : "disabled"}>Giải nghĩa bài này</button></div>`;
async function lessonLines(sub, b) {
  const L = await getLesson(sub.sid, b.id);
  if (!L) return null;
  const out = [];
  arr(L.vi_du).forEach((v) =>
    arr(v.dong).forEach((d) => {
      if (d && d.t && speakable(d.t)) out.push(d);
    }),
  );
  return out;
}

async function mBaiTap(sub, b) {
  const k = sub.sid + "/" + b.id;
  if (!(k in S.prac)) {
    const d = await get(`prac_${sub.sid}_${b.id}`);
    S.prac[k] = d ? arr(d.items) : null;
  }
  const items = S.prac[k];
  const desc =
    {
      lap_trinh:
        "Đoán kết quả → sắp xếp dòng code → tìm và sửa lỗi → tự viết code, từ dễ đến khó. Có gợi ý từng bước, JavaScript chạy thật, AI chấm code.",
      ngoai_ngu: "Điền từ, ghép câu, dịch hai chiều và tự đặt câu. AI chấm phần dịch và đặt câu.",
    }[sub.type] ||
    `Trắc nghiệm phủ mọi ý của bài${EXT(sub.type) ? " và phần mở rộng hay thi" : ""}, điền từ, câu hỏi tự luận. AI chấm phần tự luận.`;
  if (!items)
    return `<div class="card empty"><h2>Chưa có bài tập</h2><p class="note">${desc}</p><button class="btn" data-act="gen-prac" ${S.ai && !S.busy ? "" : "disabled"}>Tạo bài tập cho bài này</button></div>`;
  const p = prOf(sub, b.id),
    pc = Math.round((p.ok.length / Math.max(1, items.length)) * 100);
  return `<div class="card"><div class="row" style="justify-content:space-between"><div><div class="label">Tiến độ luyện</div><div class="prog" id="pprog">Đã làm đúng ${p.ok.length}/${items.length} bài</div></div><span class="note">${desc}</span></div><div class="meter" style="margin-top:10px"><i id="pbar" style="width:${pc}%;background:var(--ok)"></i></div></div>
    ${items.map((it, i) => itemHtml(sub, it, i, p.ok.includes(i))).join("")}
    <div class="row"><button class="btn ghost" data-act="gen-prac" ${S.ai && !S.busy ? "" : "disabled"}>Tạo bộ bài tập mới</button></div>`;
}
const KIND = {
  trac_nghiem: ["sky", "Trắc nghiệm"],
  doan_ket_qua: ["mint", "Đoán kết quả"],
  sap_xep: ["sky", "Sắp xếp dòng code"],
  sua_loi: ["pink", "Tìm và sửa lỗi"],
  viet_code: ["lilac", "Tự viết code"],
  dien_tu: ["butter", "Điền từ"],
  sap_xep_cau: ["sky", "Ghép câu"],
  dich: ["peach", "Dịch"],
  tu_luan: ["lilac", "Tự luận"],
};
const hintsOf = (it) =>
  Array.isArray(it.goi_y) ? it.goi_y.filter(Boolean) : [it.goi_y].filter(Boolean);
function codeBtns(it, i) {
  return `<div class="row">${isJS(it.ngon_ngu) ? `<button class="btn soft" data-act="run-code" data-i="${i}">Chạy thử</button>` : ""}<button class="btn" data-act="ai-check" data-i="${i}" ${S.ai ? "" : "disabled"}>Nộp cho AI chấm</button>${hintsOf(it).length ? `<button class="btn ghost" data-act="next-hint" data-i="${i}">Gợi ý</button>` : ""}<button class="btn ghost" data-act="show-sol" data-i="${i}">Xem lời giải</button></div>`;
}
function parsonsHtml(it, i) {
  const o = S.parsons[pkey(i)],
    L = arr(it.dong);
  return o
    .map(
      (li, pos) =>
        `<div class="pl"><span class="tx">${esc(String(L[li]).trim())}</span><span class="mv"><button data-act="p-mv" data-i="${i}" data-pos="${pos}" data-d="-1" aria-label="Chuyển lên" ${pos ? "" : "disabled"}>↑</button><button data-act="p-mv" data-i="${i}" data-pos="${pos}" data-d="1" aria-label="Chuyển xuống" ${pos < o.length - 1 ? "" : "disabled"}>↓</button></span></div>`,
    )
    .join("");
}
function buildHtml(it, i) {
  const st = S.build[pkey(i)],
    M = arr(it.manh);
  return `<div class="bz" aria-label="Câu của bạn">${st.ans.length ? st.ans.map((m, pos) => `<button class="tok" data-act="b-un" data-i="${i}" data-pos="${pos}">${esc(M[m])}</button>`).join("") : `<span class="note">Chạm các mảnh bên dưới theo đúng thứ tự</span>`}</div>
    <div class="pool">${st.pool
      .filter((m) => !st.ans.includes(m))
      .map(
        (m) =>
          `<button class="tok" data-act="b-pick" data-i="${i}" data-m="${m}">${esc(M[m])}</button>`,
      )
      .join("")}</div>`;
}
function itemHtml(sub, it, i, done) {
  const kd = KIND[it.loai] || ["sky", "Bài tập"];
  const key = pkey(i);
  let inner = "";
  const lang = sub.type === "ngoai_ngu";
  switch (it.loai) {
    case "trac_nghiem": {
      const opts = arr(it.lua_chon);
      if (!S.mcq[key]) S.mcq[key] = { ord: shuffled(opts.length), done: false };
      const st = S.mcq[key];
      inner = `<p class="q">${esc(it.hoi)}</p>${it.mo_rong ? `<span class="chip t-sky" style="align-self:flex-start">Mở rộng ngoài giáo trình</span>` : ""}<div class="mcq" id="pm-${i}">${st.ord.map((oi, k) => `<button class="opt" data-act="mcq" data-i="${i}" data-o="${oi}"><b>${"ABCDEF"[k]}</b><span>${esc(opts[oi])}</span></button>`).join("")}</div><div id="pf-${i}"></div>`;
      break;
    }
    case "doan_ket_qua":
      inner = `<div class="code">${String(it.code || "")
        .split("\n")
        .map((l, j) => lnHtml(l, j + 1, true))
        .join("")}</div>
      <input class="inp" id="pg-${i}" placeholder="Bạn đoán màn hình in ra gì?" autocomplete="off"><div class="row"><button class="btn" data-act="check-guess" data-i="${i}">Kiểm tra</button></div><div id="pf-${i}"></div>
      <details class="qa"><summary>Đổi biến để thử</summary><div class="stack" style="margin-top:8px"><textarea class="inp code-ed" id="pe-${i}" spellcheck="false">${esc(it.code)}</textarea><div class="row"><button class="btn soft" data-act="try-code" data-i="${i}" ${S.ai || isJS(it.ngon_ngu) ? "" : "disabled"}>${isJS(it.ngon_ngu) ? "Chạy thử" : "AI cho biết kết quả"}</button></div><div id="pt-${i}"></div></div></details>`;
      break;
    case "sap_xep":
      if (!S.parsons[key]) S.parsons[key] = shuffled(arr(it.dong).length);
      inner = `<p class="q">${esc(it.de)}</p><div class="parsons" id="pl-${i}">${parsonsHtml(it, i)}</div><div class="row"><button class="btn" data-act="p-check" data-i="${i}">Kiểm tra thứ tự</button></div><div id="pf-${i}"></div>`;
      break;
    case "sua_loi":
      inner = `<p class="q">${esc(it.de)}</p><textarea class="inp code-ed" id="pe-${i}" spellcheck="false">${esc(it.code_loi)}</textarea>${codeBtns(it, i)}<div id="ph-${i}"></div><div id="po-${i}"></div><div id="pf-${i}"></div>`;
      break;
    case "viet_code":
      inner = `<p class="q">${esc(it.de)}</p>${
        arr(it.kiem_tra).length
          ? `<div class="tests">${arr(it.kiem_tra)
              .map(
                (t) =>
                  `<div><span class="label">Vào</span><code>${esc(t.vao || "(không có)")}</code><span class="label">Ra</span><code>${esc(t.ra)}</code></div>`,
              )
              .join("")}</div>`
          : ""
      }
      <textarea class="inp code-ed" id="pe-${i}" spellcheck="false" placeholder="Viết code của bạn ở đây. Nghĩ các bước trước, rồi mới viết."></textarea>${codeBtns(it, i)}<div id="ph-${i}"></div><div id="po-${i}"></div><div id="pf-${i}"></div>`;
      break;
    case "dien_tu":
      inner = `<p style="margin:0;font-size:1.08rem">${esc(it.cau).replace("___", '<span style="background:var(--hl);color:var(--hl-ink);padding:0 12px;border-radius:5px">___</span>')}</p>${it.nghia ? `<div class="note">${esc(it.nghia)}</div>` : ""}
      <input class="inp" id="pg-${i}" placeholder="Từ còn thiếu" autocomplete="off" ${lang ? `lang="${subLang(sub)}"` : ""}><div class="row"><button class="btn" data-act="check-fill" data-i="${i}">Kiểm tra</button>${it.goi_y ? `<button class="btn ghost" data-act="hint" data-i="${i}">Gợi ý</button>` : ""}</div><div id="pf-${i}"></div>`;
      break;
    case "sap_xep_cau":
      if (!S.build[key]) S.build[key] = { pool: shuffled(arr(it.manh).length), ans: [] };
      inner = `<p class="q">${esc(it.nghia)}</p><div id="pb-${i}">${buildHtml(it, i)}</div><div class="row"><button class="btn" data-act="b-check" data-i="${i}">Kiểm tra</button><button class="btn ghost" data-act="b-reset" data-i="${i}">Làm lại</button></div><div id="pf-${i}"></div>`;
      break;
    default: {
      const q = it.loai === "dich" ? it.cau : it.hoi;
      inner = `${lnHtml(q, "", false, "", lang)}${it.huong ? `<div class="note">${esc(it.huong)}</div>` : ""}
      <textarea class="inp" id="pg-${i}" placeholder="${it.loai === "dich" ? "Bản dịch của bạn" : "Câu trả lời của bạn"}" ${lang ? `lang="${subLang(sub)}"` : ""}></textarea><div class="row"><button class="btn" data-act="grade" data-i="${i}" ${S.ai ? "" : "disabled"}>Chấm</button><button class="btn ghost" data-act="show-mau" data-i="${i}">Xem mẫu</button></div><div id="pf-${i}"></div>`;
    }
  }
  return `<section class="sec pi"><div class="row" style="justify-content:space-between"><span class="chip t-${kd[0]}">${i + 1}. ${kd[1]}</span>${it.ngon_ngu ? `<span class="note">${esc(it.ngon_ngu)}</span>` : ""}<span class="okmark" id="pk-${i}" ${done ? "" : "hidden"}>✓ Đã làm đúng</span></div>${inner}</section>`;
}

async function mNghe(sub, b) {
  const ls = await lessonLines(sub, b);
  if (!ls) return needLesson();
  if (!ls.length)
    return `<div class="card empty"><p class="note">Bài này không có câu ngoại ngữ nào để nghe.</p></div>`;
  return `<div class="card stack" style="gap:10px"><div class="row" style="justify-content:space-between"><div class="row"><label class="label" for="rate">Tốc độ</label><select class="inp" id="rate" style="width:auto">${[
    ["0.6", "Chậm"],
    ["0.85", "Vừa"],
    ["1", "Thường"],
  ]
    .map(([v, n]) => `<option value="${v}" ${String(S.rate) === v ? "selected" : ""}>${n}</option>`)
    .join("")}</select></div>
    <label class="row" style="gap:6px;font-weight:600"><input type="checkbox" id="hideTx" ${S.hideTx ? "checked" : ""}> Ẩn chữ để luyện nghe</label></div>
    <p class="note" style="margin:0">Cách luyện: nghe → nói to theo 3 lần → bật “Ẩn chữ”, nghe và nói lại không nhìn chữ. Trang không dùng được micro nên chưa tự chấm phát âm; hãy tự đánh dấu câu đã nói trôi chảy.</p></div>
    <div class="ex">${ls
      .map((d, j) => {
        const k = pkey("n" + j);
        const said = S.said[k];
        return `<div class="sh-row">${sayBtn(d.t)}<button class="say slow" data-act="say" data-t="${esc(d.t)}" data-r="0.55" aria-label="Nghe chậm" title="Nghe chậm">0.5×</button>
      <div class="sh-tx">${S.hideTx ? `<button class="reveal" data-act="reveal">Bấm để hiện chữ</button><div hidden>` : "<div>"}<div class="sh-t">${esc(d.t)}</div>${d.doc ? `<div class="doc">${esc(d.doc)}</div>` : ""}<div class="note">${esc(d.g)}</div></div></div>
      <button class="said ${said ? "on" : ""}" data-act="said" data-k="${esc(k)}">${said ? "✓ Nói được" : "Nói được"}</button></div>`;
      })
      .join("")}</div>`;
}
async function mChep(sub, b) {
  const ls = await lessonLines(sub, b);
  if (!ls) return needLesson();
  if (!ls.length)
    return `<div class="card empty"><p class="note">Bài này không có câu ngoại ngữ nào để nghe chép.</p></div>`;
  const j = Math.max(0, Math.min(S.chepI || 0, ls.length - 1));
  S.chepI = j;
  const d = ls[j];
  return `<div class="card stack"><div class="row" style="justify-content:space-between"><span class="prog">Câu ${j + 1}/${ls.length}</span><span class="note">Nghe rồi gõ lại đúng câu. Gõ chữ gốc hoặc phiên âm đều được.</span></div>
    <div class="row" style="justify-content:center;gap:12px"><button class="btn" data-act="say" data-t="${esc(d.t)}">${SAY_SVG} Nghe</button><button class="btn soft" data-act="say" data-t="${esc(d.t)}" data-r="0.55">Nghe chậm</button></div>
    <input class="inp" id="chepIn" placeholder="Gõ lại câu vừa nghe" lang="${subLang(sub)}" autocomplete="off">
    <div class="row"><button class="btn" data-act="chep-check">Kiểm tra</button><button class="btn ghost" data-act="chep-show">Xem đáp án</button><span style="flex:1"></span>${j > 0 ? `<button class="btn ghost" data-act="chep-go" data-d="-1">← Câu trước</button>` : ""}${j < ls.length - 1 ? `<button class="btn ghost" data-act="chep-go" data-d="1">Câu sau →</button>` : ""}</div>
    <div id="chepFb"></div></div>`;
}
function writeTargets(L) {
  const out = [];
  arr(L.thuat_ngu).forEach((x) => {
    const t = String(x.tu || "")
      .replace(/[(（][^)）]*[)）]/g, "")
      .trim();
    if (t && [...t].length <= 6 && speakable(t) && !out.some((o) => o.t === t))
      out.push({ t, doc: x.doc || "", nghia: x.nghia || "" });
  });
  return out;
}
async function mViet(sub, b) {
  const L = await getLesson(sub.sid, b.id);
  if (!L) return needLesson();
  const ts = writeTargets(L);
  if (!ts.length)
    return `<div class="card empty"><p class="note">Bài này chưa có từ ngắn nào để tập viết.</p></div>`;
  const j = Math.max(0, Math.min(S.vietI || 0, ts.length - 1));
  S.vietI = j;
  const t = ts[j];
  return `<div class="card stack"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><div class="label">Từ ${j + 1}/${ts.length}</div><div class="vt">${esc(t.t)} ${sayBtn(t.t)}</div>${t.doc ? `<div class="doc">${esc(t.doc)}</div>` : ""}<div class="note">${esc(t.nghia)}</div></div>
    <div class="row">${j > 0 ? `<button class="btn ghost" data-act="viet-go" data-d="-1">← Từ trước</button>` : ""}${j < ts.length - 1 ? `<button class="btn ghost" data-act="viet-go" data-d="1">Từ sau →</button>` : ""}</div></div>
    <div class="wwrap" id="wwrap" data-target="${esc(t.t)}" data-doc="${esc(t.doc)}" style="--ww:${Math.min(4, [...t.t].length) * 200}px"><canvas id="wbg"></canvas><canvas id="wcv" aria-label="Khung tập viết, vẽ bằng chuột hoặc ngón tay"></canvas></div>
    <div class="row"><label class="row" style="gap:6px;font-weight:600"><input type="checkbox" id="tplTg" ${S.showTpl ? "checked" : ""}> Hiện chữ mẫu mờ để tô theo</label><span style="flex:1"></span><button class="btn ghost" data-act="viet-clear">Xóa</button><button class="btn" data-act="viet-check" ${S.ai && S.imgLim ? "" : "disabled"}>AI chấm chữ viết</button></div>
    <p class="note" style="margin:0">Mẹo: tô theo chữ mẫu 3 lần, rồi tắt chữ mẫu và tự viết lại.${S.imgLim ? "" : " AI chấm chữ viết chỉ chạy khi mở trang trong claude.ai."}</p><div id="vfb"></div></div>`;
}
function inkColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#28263A";
}
function drawWriteBg() {
  const w = $("#wwrap"),
    bg = $("#wbg");
  if (!w || !bg) return;
  const chars = [...w.dataset.target].slice(0, 6),
    n = Math.max(1, chars.length),
    cell = 240,
    x = bg.getContext("2d");
  x.clearRect(0, 0, bg.width, bg.height);
  const cs = getComputedStyle(document.documentElement);
  x.strokeStyle = cs.getPropertyValue("--line").trim();
  x.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    x.setLineDash([]);
    x.strokeRect(i * cell + 1, 1, cell - 2, cell - 2);
    x.setLineDash([8, 8]);
    x.beginPath();
    x.moveTo(i * cell + cell / 2, 8);
    x.lineTo(i * cell + cell / 2, cell - 8);
    x.moveTo(i * cell + 8, cell / 2);
    x.lineTo(i * cell + cell - 8, cell / 2);
    x.stroke();
  }
  if (S.showTpl) {
    x.setLineDash([]);
    x.fillStyle = cs.getPropertyValue("--muted").trim();
    x.globalAlpha = 0.22;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.font = `${cell * 0.72}px "Yu Gothic","Meiryo","Hiragino Sans","Noto Sans JP","Be Vietnam Pro",sans-serif`;
    chars.forEach((c, i) => x.fillText(c, i * cell + cell / 2, cell / 2 + 6));
    x.globalAlpha = 1;
  }
}
function initWrite() {
  const w = $("#wwrap");
  if (!w) return;
  const n = Math.max(1, Math.min(6, [...w.dataset.target].length)),
    cell = 240,
    bg = $("#wbg"),
    ink = $("#wcv");
  [bg, ink].forEach((c) => {
    c.width = n * cell;
    c.height = cell;
  });
  drawWriteBg();
  const x = ink.getContext("2d");
  x.lineCap = "round";
  x.lineJoin = "round";
  x.lineWidth = 10;
  let on = false,
    last = null;
  const pos = (e) => {
    const r = ink.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * ink.width) / r.width,
      y: ((e.clientY - r.top) * ink.height) / r.height,
    };
  };
  ink.onpointerdown = (e) => {
    e.preventDefault();
    on = true;
    try {
      ink.setPointerCapture(e.pointerId);
    } catch (_) {}
    last = pos(e);
    x.strokeStyle = x.fillStyle = inkColor();
    x.beginPath();
    x.arc(last.x, last.y, 5, 0, 7);
    x.fill();
  };
  ink.onpointermove = (e) => {
    if (!on) return;
    const p = pos(e);
    x.beginPath();
    x.moveTo(last.x, last.y);
    x.lineTo(p.x, p.y);
    x.stroke();
    last = p;
  };
  ink.onpointerup = ink.onpointercancel = () => {
    on = false;
  };
}
function mSan(sub) {
  if (S.sanCode == null) S.sanCode = "";
  return `<div class="card stack"><div class="row" style="justify-content:space-between"><div><div class="label">Sân code</div><div class="note">Tự viết, sửa, thử nghiệm thoải mái. JavaScript chạy thật trong trình duyệt; ngôn ngữ khác AI đọc code và cho biết kết quả.</div></div>
    <select class="inp" id="sanLang" style="width:auto" aria-label="Ngôn ngữ">${["JavaScript", "Python", "C", "C++", "Java", "C#", "SQL", "Khác"].map((l) => `<option ${S.sanLang === l ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    <textarea class="inp code-ed" id="sanEd" spellcheck="false" style="min-height:220px" placeholder="Viết code ở đây. Mẹo: chép một đoạn code trong bài vào, đổi biến rồi chạy thử.">${esc(S.sanCode)}</textarea>
    <div class="row"><button class="btn" data-act="san-run" ${S.sanLang === "JavaScript" || S.ai ? "" : "disabled"}>Chạy</button><button class="btn soft" data-act="san-explain" ${S.ai ? "" : "disabled"}>AI giải thích từng dòng</button><button class="btn ghost" data-act="san-review" ${S.ai ? "" : "disabled"}>AI nhận xét code</button></div><div id="sanOut"></div></div>`;
}
function runJS(code) {
  return new Promise((res) => {
    let w = null,
      url = null,
      tm = null;
    const done = (r) => {
      clearTimeout(tm);
      try {
        w && w.terminate();
      } catch (e) {}
      if (url) URL.revokeObjectURL(url);
      res(r);
    };
    const src = `const __o=[];const __f=a=>a.map(x=>typeof x==="string"?x:(()=>{try{return JSON.stringify(x)}catch(e){return String(x)}})()).join(" ");
console.log=console.info=console.warn=console.error=(...a)=>__o.push(__f(a));
self.onerror=(m)=>{postMessage({out:__o,err:String(m)});return true};
try{
${code}
}catch(__e){postMessage({out:__o,err:String(__e)})}
setTimeout(()=>postMessage({out:__o}),80);`;
    tm = setTimeout(
      () => done({ out: [], err: "Chạy quá 3 giây, có thể bị vòng lặp vô hạn." }),
      3000,
    );
    try {
      url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
      w = new Worker(url);
    } catch (e) {
      return done({ out: [], err: "Trình duyệt không cho chạy code ở đây: " + e.message });
    }
    w.onmessage = (e) => done(e.data);
    w.onerror = (e) => {
      if (e.preventDefault) e.preventDefault();
      done({ out: [], err: e.message || "Lỗi cú pháp" });
    };
  });
}
const consoleHtml = (r) =>
  `<div class="console"><span class="lb">KẾT QUẢ CHẠY THẬT</span>${r.out && r.out.length ? esc(r.out.join("\n")) : '<span class="lb">(không in gì ra)</span>'}${r.err ? `\n<span class="err">${esc(r.err)}</span>` : ""}</div>`;
async function aiStream(prompt, el, tier) {
  el.innerHTML = `<div class="fb info">AI đang trả lời…</div>`;
  try {
    await S.ai(prompt, {
      cache: false,
      modelTier: tier || "quick",
      onText: (u) => {
        el.innerHTML = `<div class="fb info">${esc(u.text)}</div>`;
      },
    });
  } catch (e) {
    el.innerHTML = `<div class="fb bad">${esc(errMsg(e))}</div>`;
  }
}
function markOk(i) {
  const sub = curSub();
  const items = S.prac[sub.sid + "/" + S.bid] || [];
  sub.pr = sub.pr || {};
  const p = (sub.pr[S.bid] = sub.pr[S.bid] || { ok: [], n: 0 });
  p.n = items.length;
  if (!p.ok.includes(i)) {
    p.ok.push(i);
    saveSub(sub);
    addXP(5);
  }
  const k = $("#pk-" + i);
  if (k) k.hidden = false;
  const pp = $("#pprog");
  if (pp) pp.textContent = `Đã làm đúng ${p.ok.length}/${items.length} bài`;
  const pb = $("#pbar");
  if (pb) pb.style.width = Math.round((p.ok.length / Math.max(1, items.length)) * 100) + "%";
  renderSide();
}
