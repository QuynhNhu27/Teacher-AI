/* Ôn tập bằng thẻ ghi nhớ theo phương pháp Leitner. */
"use strict";

/* ---------- Ôn tập ---------- */
async function allCards() {
  const out = [];
  const real = S.subjects.filter((s) => !s.sample);
  const use = real.length ? real : S.subjects;
  for (const s of use) {
    const cs = await loadCards(s.sid);
    cs.forEach((c) => out.push({ sid: s.sid, c }));
  }
  return out;
}
async function pOn() {
  const R = S.review;
  if (R && R.queue.length) {
    const cur = R.queue[0],
      sub = S.subjects.find((s) => s.sid === cur.sid);
    return `<div class="stack"><div class="row" style="justify-content:space-between"><span class="prog">Còn ${R.queue.length} thẻ · đúng ${R.right}/${R.total}</span><button class="btn ghost" data-act="rev-end">Dừng phiên</button></div>
      <div class="flash"><span class="chip t-${T(sub ? sub.type : "khac").c}">${esc(sub ? sub.name : "")}</span><div class="fr">${esc(cur.c.front)}</div>${sub && sub.type === "ngoai_ngu" && speakable(cur.c.front.split("\n")[0]) ? sayBtn(cur.c.front.split("\n")[0]) : ""}
      ${R.flip ? `<div class="bk">${esc(cur.c.back)}</div><div class="src-n">Hộp ${cur.c.box || 1}${cur.tries ? " · làm lại" : ""}</div>` : ""}</div>
      <div class="row" style="justify-content:center">${R.flip ? `<button class="btn danger" data-act="rev-no">Chưa nhớ</button><button class="btn" data-act="rev-ok">Đã nhớ</button>` : `<button class="btn" data-act="rev-flip">Lật thẻ</button>`}</div></div>`;
  }
  const list = await allCards(),
    now = Date.now();
  const due = list.filter((x) => (x.c.due || 0) <= now);
  const box = [0, 0, 0, 0, 0];
  list.forEach((x) => box[Math.max(0, Math.min(4, (x.c.box || 1) - 1))]++);
  const mx = Math.max(1, ...box);
  const doneMsg =
    R && !R.queue.length
      ? `<div class="fb ok">Xong phiên! Nhớ ngay ${R.right}/${R.total} thẻ. Thẻ sai đã về hộp 1 để ôn lại ngày mai.</div>`
      : "";
  const next = list.filter((x) => (x.c.due || 0) > now).sort((a, b) => a.c.due - b.c.due)[0];
  return `<div class="stack">${doneMsg}
    <div class="card"><div class="row" style="justify-content:space-between;align-items:flex-end"><div><div class="label">Đến hạn hôm nay</div><div class="big">${due.length}</div><div class="note">${list.length} thẻ tất cả${next && !due.length ? ` · thẻ tiếp theo: ${new Date(next.c.due).toLocaleDateString("vi-VN")}` : ""}</div></div>
      <button class="btn" data-act="rev-start" ${due.length ? "" : "disabled"}>Ôn ${Math.min(10, due.length)} thẻ</button></div></div>
    <section class="sec"><div class="sh"><span class="chip t-lilac">Hộp Leitner</span><span class="note">Đúng thì lên hộp, sai về hộp 1</span></div>
      <div class="boxes">${box.map((n, i) => `<div class="bx"><small>${n}</small><i style="height:${Math.round((n / mx) * 70)}%;background:var(--${["pink", "peach", "butter", "sky", "mint"][i]}-ink);opacity:.75"></i><small>Hộp ${i + 1}<br>${BOX[i]} ngày</small></div>`).join("")}</div></section>
    ${list.length ? "" : `<p class="note">Thẻ ghi nhớ được tạo tự động từ thuật ngữ và câu tự kiểm tra mỗi khi một bài được giải nghĩa.</p>`}</div>`;
}
function cardsFromLesson(bid, L) {
  const out = [];
  arr(L.thuat_ngu).forEach((x) => {
    if (x && x.tu && x.nghia)
      out.push({
        id: bid + ":t:" + hash(x.tu),
        front: x.tu + (x.doc ? `\n${x.doc}` : ""),
        back: x.nghia,
      });
  });
  arr(L.hoi).forEach((x) => {
    if (x && x.q && x.a) out.push({ id: bid + ":q:" + hash(x.q), front: x.q, back: x.a });
  });
  return out;
}
async function mergeCards(sid, bid, L) {
  const cur = await loadCards(sid);
  const keep = cur.filter((c) => !c.id.startsWith(bid + ":"));
  const old = Object.fromEntries(cur.map((c) => [c.id, c]));
  const fresh = cardsFromLesson(bid, L).map((c) =>
    old[c.id]
      ? { ...c, box: old[c.id].box, due: old[c.id].due }
      : { ...c, box: 1, due: Date.now() },
  );
  S.cards[sid] = keep.concat(fresh);
  return put("cards_" + sid, { kind: "cards", list: S.cards[sid] });
}
