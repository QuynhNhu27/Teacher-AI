/* Tóm tắt toàn môn và thi thử trắc nghiệm. */
"use strict";

/* ---------- Tóm tắt toàn môn & thi thử ---------- */
async function pThi(sub) {
  const bs = sortedBai(sub);
  if (!bs.length) return `<div class="card empty"><p class="note">Chưa có bài nào.</p></div>`;
  const Ls = [];
  for (const b of bs) Ls.push(await getLesson(sub.sid, b.id));
  for (const b of bs) {
    const k = sub.sid + "/" + b.id;
    if (!(k in S.prac)) {
      const d = await get(`prac_${sub.sid}_${b.id}`);
      S.prac[k] = d ? arr(d.items) : null;
    }
  }
  const mcqs = [];
  bs.forEach((b) =>
    arr(S.prac[sub.sid + "/" + b.id]).forEach((it) => {
      if (it.loai === "trac_nghiem" && arr(it.lua_chon).length > 1) mcqs.push({ b, it });
    }),
  );
  const sumN = Ls.filter((L) => L && arr(L.video).length).length,
    noPrac = bs.filter((b) => !S.prac[sub.sid + "/" + b.id]).length;
  const items = [];
  bs.forEach((b, i) => {
    const L = Ls[i];
    if (L && arr(L.tom_tat).length) {
      items.push({ t: `Bài ${i + 1}. ${b.ten}`, h: true });
      arr(L.tom_tat).forEach((t) => items.push({ t }));
      if (arr(L.mo_rong).length) {
        items.push({ t: "Mở rộng", h: true });
        L.mo_rong.forEach((x) => items.push({ t: x.y }));
      }
    }
  });
  const E = S.exam && S.exam.sid === sub.sid ? S.exam : null;
  let exam;
  if (E) {
    const right = E.done ? E.qs.filter((q, j) => E.ans[j] === mcqIdx(q.it)).length : 0;
    exam = `<section class="sec"><div class="row" style="justify-content:space-between;margin-bottom:10px"><div><span class="chip t-peach">Thi thử</span> <span class="note">${E.qs.length} câu · đã chọn ${Object.keys(E.ans).length}</span></div>
      ${E.done ? `<div class="row"><span class="score">${right}/${E.qs.length}</span><span class="note">${Math.round((right / E.qs.length) * 10 * 10) / 10} điểm</span></div>` : ""}</div>
      ${E.qs
        .map((q, j) => {
          const opts = arr(q.it.lua_chon),
            ok = mcqIdx(q.it),
            a = E.ans[j];
          return `<div class="exq"><div class="q"><b>Câu ${j + 1}.</b> ${esc(q.it.hoi)} <span class="note">· ${esc(q.b.ten)}</span>${q.it.mo_rong ? ` <span class="chip t-sky">Mở rộng</span>` : ""}</div>
        <div class="mcq">${q.ord
          .map((oi, k) => {
            let c = "";
            if (E.done) {
              if (oi === ok) c = "right";
              else if (oi === a) c = "wrong";
            } else if (oi === a) c = "pick";
            return `<button class="opt ${c}" data-act="ex-pick" data-q="${j}" data-o="${oi}" ${E.done ? "disabled" : ""}><b>${"ABCDEF"[k]}</b><span>${esc(opts[oi])}</span></button>`;
          })
          .join("")}</div>
        ${E.done && q.it.giai_thich ? `<div class="fb ${a === ok ? "ok" : "bad"}">${a === ok ? "Đúng." : a == null ? "Bỏ trống." : "Sai."} ${esc(q.it.giai_thich)}</div>` : ""}</div>`;
        })
        .join("")}
      <div class="row" style="margin-top:12px">${E.done ? `<button class="btn" data-act="ex-start">Làm đề khác</button>` : `<button class="btn" data-act="ex-submit">Nộp bài</button>`}<button class="btn ghost" data-act="ex-close">Đóng đề</button></div></section>`;
  } else
    exam = `<section class="sec"><div class="row" style="justify-content:space-between"><div><span class="chip t-peach">Thi thử trắc nghiệm</span><p class="note" style="margin:6px 0 0">${mcqs.length ? `Ngân hàng có ${mcqs.length} câu từ các bài. Mỗi đề lấy ngẫu nhiên tối đa 30 câu, chấm điểm và giải thích từng câu.` : "Chưa có câu trắc nghiệm nào. Hãy tạo câu hỏi cho các bài."}</p></div>
    <button class="btn" data-act="ex-start" ${mcqs.length ? "" : "disabled"}>Thi thử ${Math.min(30, mcqs.length) || ""} câu</button></div></section>`;
  return `<div class="stack">
    <div class="card"><div class="row" style="justify-content:space-between;align-items:flex-end;gap:16px">
      <div><div class="label">Bài đã có video giảng</div><div class="big">${sumN}/${bs.length}</div></div>
      <div><div class="label">Bài đã có câu hỏi</div><div class="big">${bs.length - noPrac}/${bs.length}</div></div>
      <div class="row">${sumN < bs.length ? `<button class="btn soft" data-act="thi-gen-sum" ${S.ai && !S.busy ? "" : "disabled"}>Tạo video cho bài còn thiếu</button>` : ""}${noPrac ? `<button class="btn soft" data-act="thi-gen-q" ${S.ai && !S.busy ? "" : "disabled"}>Tạo câu hỏi cho bài còn thiếu</button>` : ""}</div></div></div>
    ${exam}
    <section class="sec"><div class="sh"><span class="chip t-peach">Video bài giảng theo bài</span></div><div class="stack" style="gap:6px">${bs.map((b, i) => `<div class="row" style="justify-content:space-between;padding:6px 0;border-top:${i ? "1px solid var(--line)" : "0"}"><span>${i + 1}. ${esc(b.ten)}</span>${Ls[i] && arr(Ls[i].video).length ? `<button class="btn soft" data-act="watch" data-bid="${b.id}" style="padding:5px 10px;font-size:.8rem">▶ Xem video · ${Ls[i].video.length} cảnh</button>` : `<span class="note">Chưa có video</span>`}</div>`).join("")}</div></section></div>`;
}
