/* Người đọc bài: đọc to phần tóm tắt, tô sáng câu đang đọc. */
"use strict";

/* người đọc bài */
const RD = { list: [], i: 0, playing: false, paused: false, key: null, tm: null };
function splitSpeech(t) {
  const parts = String(t).match(/[^.!?。！？;:]+[.!?。！？;:]*\s*/g) || [String(t)];
  const out = [];
  let cur = "";
  for (const p of parts) {
    if ((cur + p).length > 160 && cur) {
      out.push(cur);
      cur = "";
    }
    cur += p;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
function viVoices() {
  const v = bestVoice("vi-VN");
  return v ? [v] : [];
}
function rdVoice(lang) {
  return bestVoice(lang);
}
function readerHtml(key, items, title) {
  S.readerData[key] = items;
  const on = RD.key === key && RD.playing;
  const vs = viVoices();
  return `<div class="reader ${on && !RD.paused ? "speaking" : ""}" data-rk="${esc(key)}"><div class="rbar"><span class="rava" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 8l9-4 9 4-9 4z" fill="currentColor"/><path d="M7 10.5V15c0 1.4 2.2 3 5 3s5-1.6 5-3v-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
    <div style="flex:1;min-width:140px"><b>${esc(title || "Nghe giảng")}</b><div class="note" data-rdstate>${on ? (RD.paused ? "Đang tạm dừng" : "Đang đọc…") : `${items.filter((x) => !x.h).length} đoạn · chạm vào câu nào để nghe từ đó`}</div></div>
    <button class="btn" data-act="rd-play" data-rk="${esc(key)}">${on && !RD.paused ? "Tạm dừng" : on ? "Đọc tiếp" : "▶ Nghe giảng"}</button><button class="btn ghost" data-act="rd-stop" ${on ? "" : "hidden"}>Dừng</button></div>
    <div class="rbar"><select class="inp" id="rdRate" style="width:auto" aria-label="Tốc độ đọc">${[
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
    ${key.startsWith("les:") ? `<button class="btn ghost" data-act="regen-sum">Giảng lại dễ hiểu hơn</button>` : ""}</div>
    <div class="rtext">${items
      .map((x, i) =>
        x.h
          ? `<p class="rp h" data-pi="${i}">${esc(x.t)}</p>`
          : `<p class="rp" data-pi="${i}">${splitSpeech(x.t)
              .map(
                (c, ci) =>
                  `<span class="rs" data-act="rd-from" data-rk="${esc(key)}" data-pi="${i}" data-ci="${ci}">${esc(c)}</span>`,
              )
              .join("")}</p>`,
      )
      .join("")}</div></div>`;
}
function rdMark() {
  document
    .querySelectorAll(".rp.reading,.rs.on")
    .forEach((e) => e.classList.remove("reading", "on"));
  document.querySelectorAll(".reader").forEach((r) => {
    const mine = r.dataset.rk === RD.key && RD.playing;
    r.classList.toggle("speaking", mine && !RD.paused);
    const st = r.querySelector("[data-rdstate]");
    const btn = r.querySelector('[data-act="rd-play"]');
    const sb = r.querySelector('[data-act="rd-stop"]');
    if (sb) sb.hidden = !mine;
    if (mine) {
      if (st) st.textContent = RD.paused ? "Đang tạm dừng" : "Đang đọc…";
      if (btn) btn.textContent = RD.paused ? "Đọc tiếp" : "Tạm dừng";
    }
  });
  const it = RD.list[RD.i];
  if (!it || !RD.playing) return;
  const root = document.querySelector(`.reader[data-rk="${CSS.escape(RD.key)}"]`);
  if (!root) return;
  const el = root.querySelector(`.rp[data-pi="${it.pi}"]`),
    sp = root.querySelector(`.rs[data-pi="${it.pi}"][data-ci="${it.ci}"]`);
  if (sp) sp.classList.add("on");
  if (el) {
    el.classList.add("reading");
    const box = el.closest(".rtext");
    if (box) {
      const top = el.offsetTop - box.offsetTop;
      if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 60)
        box.scrollTo({ top: top - 20, behavior: "smooth" });
    }
  }
}
function rdNext() {
  if (!RD.playing) return;
  if (RD.i >= RD.list.length) {
    rdStop();
    return;
  }
  const it = RD.list[RD.i];
  rdMark();
  const u = new SpeechSynthesisUtterance(it.text.replace(/[“”"«»]/g, ""));
  const lang =
    /[぀-ヿ一-鿿가-힯]/.test(it.text) && !VIET.test(it.text) ? detectLang(it.text) : "vi-VN";
  u.lang = lang;
  const v = rdVoice(lang);
  if (v) u.voice = v;
  u.rate = S.rdRate || 0.95;
  u.pitch = 1;
  u.onend = () => {
    if (!(RD.playing && RD.list[RD.i] === it)) return;
    RD.i++;
    const nx = RD.list[RD.i];
    const gap = !nx ? 0 : nx.pi !== it.pi ? 650 : /[.!?。！？]\s*$/.test(it.text) ? 220 : 120;
    clearTimeout(RD.tm);
    RD.tm = setTimeout(() => {
      if (!RD.paused) rdNext();
    }, gap);
  };
  u.onerror = (e) => {
    if (e.error === "interrupted" || e.error === "canceled") return;
    RD.i++;
    rdNext();
  };
  speechSynthesis.speak(u);
}
