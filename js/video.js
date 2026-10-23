/* Video bài giảng: thầy cô AI giảng trên bảng, sơ đồ tư duy, phụ đề, câu hỏi nhanh. */
"use strict";

/* ---------- Video bài giảng ---------- */
const VP = {
  key: null,
  sc: [],
  si: 0,
  li: -1,
  playing: false,
  paused: false,
  tm: null,
  ans: {},
  ended: false,
  said: "",
};
const LOAI = {
  mo_dau: "Mở đầu",
  ban_do: "Sơ đồ tư duy",
  giang: "Bài giảng",
  vi_du: "Ví dụ mẫu",
  hoi: "Câu hỏi nhanh",
  tong_ket: "Tổng kết",
};
function cleanVideo(r) {
  return arr(r && r.canh)
    .filter(
      (c) =>
        c && (arr(c.loi).length || (c.loai === "hoi" && c.cau_hoi && arr(c.lua_chon).length > 1)),
    )
    .map((c) => ({
      loai: String(c.loai || "giang"),
      tieu_de: String(c.tieu_de || ""),
      bang: arr(c.bang).map(String),
      minh_hoa:
        c.minh_hoa && c.minh_hoa.noi_dung
          ? { kieu: String(c.minh_hoa.kieu || "vi_du"), noi_dung: String(c.minh_hoa.noi_dung) }
          : null,
      loi: arr(c.loi).map(String),
      cau_hoi: c.cau_hoi ? String(c.cau_hoi) : "",
      lua_chon: arr(c.lua_chon).map(String),
      dap_an: c.dap_an,
      giai_thich: c.giai_thich ? String(c.giai_thich) : "",
      vd: c.vd ? String(c.vd) : "",
      tu_duy: cleanMM(c.tu_duy),
    }));
}
function cleanMM(m) {
  if (!m || !m.goc) return null;
  const nh = arr(m.nhanh)
    .filter((x) => x && x.ten)
    .slice(0, 6)
    .map((x) => ({ ten: String(x.ten), y: arr(x.y).map(String).slice(0, 3) }));
  return nh.length ? { goc: String(m.goc), nhanh: nh } : null;
}
const fx = (t) => esc(t).replace(/\{\{(.+?)\}\}/g, '<span class="fx">$1</span>');
const unfx = (t) => String(t || "").replace(/\{\{(.+?)\}\}/g, "$1");
function mmHtml(m, shown, live, prev) {
  const n = m.nhanh.length,
    k = Math.min(n, shown);
  const rows = Math.ceil(n / 2);
  return `<div class="mm"><div class="mm-c" style="grid-row:1 / span ${rows}">${fx(m.goc)}</div>${m.nhanh
    .map((b, i) => {
      const side = i % 2 ? "l" : "r";
      const row = Math.floor(i / 2) + 1;
      return `<div class="mm-b ${side} c${i % 4} ${i < k ? (live && i >= prev ? "in" : "") : "off"}" style="grid-column:${side === "l" ? 1 : 3};grid-row:${row}"><b>${fx(b.ten)}</b>${b.y.length ? `<ul>${b.y.map((y) => `<li>${fx(y)}</li>`).join("")}</ul>` : ""}</div>`;
    })
    .join("")}</div>`;
}
async function genVideo(sub, bid) {
  const b = arr(sub.outline.bai).find((x) => x.id === bid);
  const L = await getLesson(sub.sid, bid);
  if (!b || !L) return;
  const lines = await getLines(sub);
  const r = await aiJSON(pVideo(sub, b, numbered(lines, b.tu, b.den)), "default");
  const sc = cleanVideo(r);
  if (!sc.length) throw { code: "empty_completion" };
  const L2 = { ...L, video: sc };
  S.lessons[sub.sid + "/" + bid] = L2;
  await put(`les_${sub.sid}_${bid}`, { kind: "lesson", data: L2 });
}
function vpLines(c, si) {
  if (c.loai === "hoi") {
    const out = ["Câu hỏi nhanh nè. " + c.cau_hoi];
    c.lua_chon.forEach((o, k) => out.push(`${"ABCD"[k] || k + 1}. ${o}`));
    out.push("Các bạn chọn đáp án nhé.");
    return out;
  }
  return c.loi;
}
function mhHtml(m) {
  if (!m) return "";
  const t = m.noi_dung;
  if (m.kieu === "code") return `<pre>${esc(t)}</pre>`;
  if (m.kieu === "so_do")
    return `<div class="vp-flow">${t
      .split(/\s*(?:→|->|=>)\s*/)
      .filter(Boolean)
      .map((x, i) => `${i ? '<span class="a">→</span>' : ""}<span class="b">${esc(x)}</span>`)
      .join("")}</div>`;
  if (m.kieu === "bang")
    return `<table class="vp-tbl">${t
      .split(/\n/)
      .filter((x) => x.trim())
      .map(
        (r) =>
          `<tr>${r
            .split("|")
            .map((c) => `<td>${esc(c.trim())}</td>`)
            .join("")}</tr>`,
      )
      .join("")}</table>`;
  return `<div class="vp-quote">${esc(t)}</div>`;
}
const TEACH_SVG = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor"/></svg>`;
function vpInner(key) {
  const sc = S.readerData[key] || [];
  const act = VP.key === key;
  const si = act ? VP.si : 0,
    c = sc[si] || {};
  const lines = vpLines(c, si);
  const li = act ? VP.li : -1;
  const live = act && VP.playing;
  const shownN =
    !live || c.loai === "hoi"
      ? c.bang.length
      : Math.min(
          c.bang.length,
          Math.max(1, Math.ceil(((li + 1) / Math.max(1, lines.length)) * c.bang.length)),
        );
  const prevN = act ? VP.prevShown || 0 : 0;
  const mhOn = !live || li >= Math.floor(lines.length / 2);
  let body;
  if (c.loai === "hoi") {
    const a = VP.ans[key + "#" + si],
      ok = mcqIdx(c);
    body = `<div class="vp-q">${fx(c.cau_hoi)}</div><div class="vp-opts">${c.lua_chon
      .map((o, k) => {
        let cl = "";
        if (a != null) {
          if (k === ok) cl = "right";
          else if (k === a) cl = "wrong";
        }
        return `<button class="vp-opt ${cl}" data-act="vp-ans" data-k="${k}" ${a != null ? "disabled" : ""}><b>${"ABCD"[k] || k + 1}</b><span>${fx(o)}</span></button>`;
      })
      .join(
        "",
      )}</div>${a != null && c.giai_thich ? `<div class="vp-quote" style="font-size:1rem;color:var(--board-ink)">${a === ok ? "Chính xác!" : "Chưa đúng."} ${esc(c.giai_thich)}</div>` : ""}`;
  } else if (c.tu_duy && (c.loai === "ban_do" || c.loai === "tong_ket" || !c.bang.length)) {
    const nB = c.tu_duy.nhanh.length;
    const sB = !live
      ? nB
      : Math.min(nB, Math.max(1, Math.ceil(((li + 1) / Math.max(1, lines.length)) * nB)));
    body = `${mmHtml(c.tu_duy, sB, live, act ? VP.prevMM || 0 : 0)}${c.vd && mhOn ? `<div class="vp-vd ${live && !VP.mhShown ? "in" : ""}"><b>Ví dụ:</b> ${fx(c.vd)}</div>` : ""}`;
    if (act) VP.prevMM = sB;
  } else {
    const right = c.tu_duy
      ? mmHtml(c.tu_duy, c.tu_duy.nhanh.length, false, 0)
      : c.minh_hoa
        ? mhHtml(c.minh_hoa)
        : "";
    body = `<div class="vp-body ${right && c.bang.length ? "" : "one"}"><div class="stack" style="gap:12px">${
      c.bang.length
        ? `<ul class="vp-board">${c.bang
            .slice(0, shownN)
            .map((x, k) => `<li class="${live && k >= prevN ? "in" : ""}">${fx(x)}</li>`)
            .join("")}</ul>`
        : ""
    }${c.vd && mhOn ? `<div class="vp-vd ${live && !VP.mhShown ? "in" : ""}"><b>Ví dụ:</b> ${fx(c.vd)}</div>` : ""}${c.tu_duy && c.minh_hoa && mhOn ? `<div class="vp-mh">${mhHtml(c.minh_hoa)}</div>` : ""}</div>${right && mhOn ? `<div class="vp-mh ${c.tu_duy ? "mmbox" : ""} ${live && !VP.mhShown ? "in" : ""}">${right}</div>` : ""}</div>`;
  }
  if (act) {
    VP.prevShown = shownN;
    if (mhOn) VP.mhShown = true;
  }
  const sub = live && li >= 0 ? lines[li] || "" : act && VP.said ? VP.said : lines[0] || "";
  const start =
    !act || (!VP.playing && !VP.ended && li < 0)
      ? `<button class="vp-start" data-act="vp-play" data-vk="${esc(key)}"><span class="play"><svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span><b style="font-size:1.1rem">${act && VP.si > 0 ? "Xem tiếp" : "Bắt đầu học"} · ${sc.length} cảnh</b><span style="font-size:.85rem;opacity:.85">${esc((sc[si] || {}).tieu_de || "")}</span></button>`
      : "";
  const end =
    act && VP.ended
      ? `<div class="vp-end"><div class="vp-title">Hết bài giảng!</div><p style="margin:0;opacity:.85">Câu hỏi nhanh đúng: ${
          Object.keys(VP.ans)
            .filter((k) => k.startsWith(key + "#"))
            .filter((k) => VP.ans[k] === mcqIdx(sc[+k.split("#")[1]])).length
        }/${sc.filter((x) => x.loai === "hoi").length}</p><div class="row" style="justify-content:center"><button class="btn" data-act="vp-replay">Xem lại</button><button class="btn soft" data-act="tab" data-tab="luyen">Luyện tập ngay</button></div></div>`
      : "";
  return `<div class="vp-stage ${live && !VP.paused ? "talking" : ""}" id="vpStage"><div class="vp-in"><div class="vp-top"><span class="vp-tag">${esc(LOAI[c.loai] || "Bài giảng")}</span><span class="vp-num">Cảnh ${si + 1}/${sc.length}</span></div><h3 class="vp-title">${fx(c.tieu_de)}</h3>${body}</div>
      <div class="vp-sub" aria-live="polite">${fx(sub)}</div><span class="vp-teacher" aria-hidden="true">${TEACH_SVG}</span>${start}${end}</div>
    <div class="vp-ctl"><button class="ibtn" data-act="vp-go" data-d="-1" aria-label="Cảnh trước" ${si > 0 ? "" : "disabled"}>⏮</button>
      <button class="btn" data-act="vp-play" data-vk="${esc(key)}" style="min-width:110px">${live && !VP.paused ? "Tạm dừng" : "▶ Phát"}</button>
      <button class="ibtn" data-act="vp-go" data-d="1" aria-label="Cảnh sau" ${si < sc.length - 1 ? "" : "disabled"}>⏭</button>
      <div class="vp-tl" role="list">${sc.map((x, k) => `<button class="${x.loai === "hoi" ? "q " : ""}${k === si ? "cur" : k < si ? "done" : ""}" data-act="vp-seek" data-k="${k}" title="${esc(k + 1 + ". " + x.tieu_de)}" aria-label="${esc("Cảnh " + (k + 1) + ": " + x.tieu_de)}"></button>`).join("")}</div>
      <select class="inp" id="rdRate" style="width:auto" aria-label="Tốc độ giảng">${[
        ["0.9", "Chậm"],
        ["1", "Vừa"],
        ["1.15", "Nhanh"],
        ["1.3", "Rất nhanh"],
      ]
        .map(
          ([v, n]) =>
            `<option value="${v}" ${String(S.rdRate) === v ? "selected" : ""}>${n}</option>`,
        )
        .join("")}</select>
      <select class="inp" id="mixVoice" style="width:auto" aria-label="Cách đọc từ tiếng Anh"><option value="1" ${S.mixVoice ? "selected" : ""}>Từ tiếng Anh: giọng Anh chuẩn</option><option value="0" ${S.mixVoice ? "" : "selected"}>Một giọng liền mạch</option></select>
      <button class="ibtn" data-act="vp-full" aria-label="Toàn màn hình">⛶</button>
      <div class="vp-chap">Đang học: ${esc(c.tieu_de)} · ${voiceNote()}</div></div>`;
}
function voiceNote() {
  const v = bestVoice("vi-VN");
  if (!v) return "Đang tải giọng đọc…";
  const nm = v.name
    .replace(/Microsoft |Online |\(Natural\)|- Vietnamese \(Vietnam\)|Vietnamese/g, "")
    .trim();
  if (/Microsoft An\b/i.test(v.name)) return "Giọng An";
  return /natural|neural|online/i.test(v.name)
    ? `Giọng ${esc(nm)}`
    : `<span style="color:var(--bad)">Đang dùng giọng máy thường (${esc(nm)}). Mở trang bằng Microsoft Edge để có giọng HoaiMy tự nhiên.</span>`;
}
function videoHtml(key, scenes) {
  S.readerData[key] = scenes;
  return `<div class="vp" id="vpBox" data-vk="${esc(key)}">${vpInner(key)}</div>`;
}
function vpRender() {
  const box = $("#vpBox");
  if (box && box.dataset.vk === VP.key) box.innerHTML = vpInner(VP.key);
}
function vpSpeak(text, done) {
  const tok = {};
  VP.su2 = tok;
  sayRuns(text, { isCurrent: () => VP.playing && VP.su2 === tok, onDone: done });
}
function vpStep() {
  if (!VP.playing || VP.paused) return;
  const sc = VP.sc,
    c = sc[VP.si];
  if (!c) {
    vpEnd();
    return;
  }
  const lines = vpLines(c, VP.si);
  if (VP.li + 1 >= lines.length) {
    if (c.loai === "hoi" && VP.ans[VP.key + "#" + VP.si] == null) {
      vpRender();
      return;
    }
    if (VP.si + 1 >= sc.length) {
      vpEnd();
      return;
    }
    VP.si++;
    VP.li = -1;
    VP.prevShown = 0;
    VP.prevMM = 0;
    VP.mhShown = false;
    vpRender();
    VP.tm = setTimeout(vpStep, 900);
    return;
  }
  const vv = bestVoice("vi-VN");
  if (c.loai !== "hoi" && vv && !/google/i.test(vv.name)) {
    const start = VP.li + 1,
      segs = lines.slice(start),
      offs = [];
    let text = "";
    segs.forEach((l) => {
      offs.push(text.length);
      let t = String(l)
        .trim()
        .replace(/[“”"«»*#`]/g, "");
      if (!/[.!?…:;}]$/.test(t)) t += ".";
      text += t + " ";
    });
    VP.li = start;
    VP.said = lines[start];
    vpRender();
    const tok = {};
    VP.su = tok;
    const setLi = (ci) => {
      let k = 0;
      for (let q = 0; q < offs.length; q++) if (offs[q] <= ci) k = q;
      const li = start + k;
      if (li !== VP.li && VP.su === tok) {
        VP.li = li;
        VP.said = lines[li];
        vpRender();
      }
    };
    sayRuns(text, {
      isCurrent: () => VP.playing && VP.su === tok,
      onPos: setLi,
      onDone: () => {
        if (!VP.playing || VP.su !== tok) return;
        VP.su = null;
        VP.li = lines.length - 1;
        clearTimeout(VP.tm);
        VP.tm = setTimeout(vpStep, 550);
      },
    });
    return;
  }
  VP.li++;
  VP.said = lines[VP.li];
  vpRender();
  vpSpeak(lines[VP.li], () => {
    clearTimeout(VP.tm);
    VP.tm = setTimeout(vpStep, /[.!?]\s*$/.test(lines[VP.li] || "") ? 260 : 160);
  });
}
function vpEnd() {
  VP.playing = false;
  VP.ended = true;
  VP.paused = false;
  vpRender();
}
function vpHalt() {
  VP.su = null;
  VP.playing = false;
  VP.paused = false;
  clearTimeout(VP.tm);
  try {
    speechSynthesis.cancel();
  } catch (e) {}
}
function vpStart(key, si) {
  if (!("speechSynthesis" in window)) {
    toast("Trình duyệt này không đọc được thành tiếng.", "bad");
    return;
  }
  VP.su = null;
  rdStop();
  clearTimeout(VP.tm);
  speechSynthesis.cancel();
  if (VP.key !== key) {
    VP.ans = Object.fromEntries(Object.entries(VP.ans).filter(([k]) => !k.startsWith(key + "#")));
  }
  VP.key = key;
  VP.sc = S.readerData[key] || [];
  VP.si = si || 0;
  VP.li = -1;
  VP.prevShown = 0;
  VP.mhShown = false;
  VP.playing = true;
  VP.paused = false;
  VP.ended = false;
  if (!viVoices().length && speechSynthesis.getVoices().length)
    toast(
      "Máy chưa có giọng đọc tiếng Việt. Mở trang bằng Microsoft Edge để có giọng HoaiMy hoặc NamMinh rất tự nhiên.",
    );
  vpRender();
  VP.tm = setTimeout(vpStep, 350);
}
function rdStart(key, from, fromCi) {
  if (VP.playing) vpHalt();
  if (!("speechSynthesis" in window)) {
    toast("Trình duyệt này không đọc được thành tiếng.", "bad");
    return;
  }
  const items = S.readerData[key] || [];
  clearTimeout(RD.tm);
  speechSynthesis.cancel();
  RD.key = key;
  RD.playing = true;
  RD.paused = false;
  RD.list = [];
  items.forEach((x, pi) => {
    if (pi >= from && !x.h)
      splitSpeech(x.t).forEach((t, ci) => {
        if (pi > from || ci >= (fromCi || 0)) RD.list.push({ pi, ci, text: t });
      });
    else if (pi >= from && x.h) RD.list.push({ pi, ci: 0, text: x.t });
  });
  RD.i = 0;
  if (!viVoices().length && speechSynthesis.getVoices().length)
    toast(
      "Máy chưa có giọng đọc tiếng Việt. Mở trang bằng Microsoft Edge (có sẵn giọng HoaiMy rất tự nhiên) hoặc thêm giọng Tiếng Việt trong Cài đặt > Thời gian & ngôn ngữ > Giọng nói.",
    );
  rdNext();
}
function rdStop() {
  clearTimeout(RD.tm);
  RD.playing = false;
  RD.paused = false;
  try {
    speechSynthesis.cancel();
  } catch (e) {}
  rdMark();
  document.querySelectorAll(".reader").forEach((r) => {
    r.classList.remove("speaking");
    const b = r.querySelector('[data-act="rd-play"]');
    if (b) b.textContent = "▶ Nghe giảng";
    const st = r.querySelector("[data-rdstate]");
    if (st) st.textContent = "Đã dừng · chạm vào câu nào để nghe từ đó";
  });
  document.querySelectorAll('[data-act="rd-stop"]').forEach((b) => (b.hidden = true));
}
const mcqIdx = (it) => {
  const d = it.dap_an;
  if (typeof d === "number") return d;
  if (/^[A-Da-d]$/.test(String(d).trim())) return "ABCD".indexOf(String(d).trim().toUpperCase());
  const j = arr(it.lua_chon).findIndex((o) => normLoose(o) === normLoose(d));
  return j < 0 ? parseInt(d, 10) || 0 : j;
};
async function runGen(bid, extra) {
  const sub = curSub();
  if (!sub || S.busy) return;
  const b = arr(sub.outline.bai).find((x) => x.id === bid);
  setBusy({ text: `AI đang giải nghĩa “${b ? b.ten : ""}”…`, bid });
  try {
    await genLesson(sub, bid, extra);
    toast("Đã giải nghĩa xong bài.");
  } catch (e) {
    toast(errMsg(e), "bad");
  }
  S.busy = null;
  renderMain();
}
async function genAll() {
  const sub = curSub();
  if (!sub || S.busy) return;
  S.stopAll = false;
  const todo = sortedBai(sub).filter((b) => !(sub.ready && sub.ready[b.id]));
  for (let i = 0; i < todo.length; i++) {
    if (S.stopAll) break;
    S.busy = {
      text: `Đang giải nghĩa bài ${i + 1}/${todo.length}: “${todo[i].ten}”…`,
      bid: todo[i].id,
      stoppable: true,
    };
    renderMain();
    try {
      await genLesson(sub, todo[i].id);
    } catch (e) {
      toast(errMsg(e), "bad");
      if (e && ["not_granted", "rate_limited", "sampling_disabled"].includes(e.code)) break;
    }
  }
  S.busy = null;
  renderMain();
}
