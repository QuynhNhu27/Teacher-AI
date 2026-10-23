/* Vẽ giao diện: thanh danh sách môn bên trái và vùng nội dung chính. */
"use strict";

/* ---------- vẽ: thanh bên ---------- */
function renderSide() {
  const real = S.subjects.filter((s) => !s.sample),
    mau = S.subjects.filter((s) => s.sample);
  const subBtn = (s) => {
    const t = T(s.type);
    const nb = arr(s.outline && s.outline.bai).length;
    return (
      `<button class="sub ${s.sid === S.sid ? "on" : ""}" data-act="pick-sub" data-sid="${esc(s.sid)}"><span class="dot t-${t.c}"></span><span class="nm">${esc(s.name)}</span><span class="ct">${nb} bài</span></button>` +
      (s.sid === S.sid && nb
        ? `<div class="lessons">${sortedBai(s)
            .map((b, i) => {
              const st = s.done && s.done[b.id] ? "done" : s.ready && s.ready[b.id] ? "gen" : "";
              return `<button class="les ${b.id === S.bid && S.tab !== "on" ? "on" : ""}" data-act="pick-les" data-bid="${esc(b.id)}"><span class="st ${st}">${st === "done" ? "✓" : ""}</span><span class="tl">${i + 1}. ${esc(b.ten)}</span>${s.pr && s.pr[b.id] && s.pr[b.id].n ? `<span class="lp">${s.pr[b.id].ok.length}/${s.pr[b.id].n}</span>` : ""}</button>`;
            })
            .join("")}</div>`
        : "")
    );
  };
  $("#side").innerHTML = `<button class="btn" data-act="add-open">+ Thêm môn học</button>
    <div class="label">Môn của bạn</div>
    <div class="sublist">${real.length ? real.map(subBtn).join("") : `<p class="note" style="margin:0 4px">Chưa có môn nào. Bấm “Thêm môn học” và dán giáo trình vào.</p>`}</div>
    ${mau.length ? `<div class="label">Ví dụ mẫu</div><div class="sublist">${mau.map(subBtn).join("")}</div>` : ""}
    <div style="flex:1"></div>
    <button class="btn soft" data-act="tab" data-tab="on">Ôn tập thẻ ghi nhớ</button>`;
}

/* ---------- vẽ: vùng chính ---------- */
function statusHtml() {
  return S.busy
    ? `<div class="status" role="status"><span class="spin"></span><span style="flex:1">${esc(S.busy.text)}</span>${S.busy.stoppable ? `<button class="btn ghost" data-act="stop-all">Dừng</button>` : ""}</div>`
    : "";
}
async function renderMain() {
  const m = $("#main");
  if (S.tab === "on") {
    m.innerHTML =
      statusHtml() +
      `<div class="shead"><div><div class="label">Tất cả các môn</div><h1>Ôn tập</h1></div></div>` +
      (await pOn());
    renderSide();
    return;
  }
  const sub = curSub();
  if (!sub) {
    m.innerHTML =
      statusHtml() +
      `<div class="card empty"><h2>Chào bạn!</h2><p class="note">Thêm một môn học, dán hoặc tải giáo trình lên. AI sẽ chia bài và giải nghĩa từng dòng.</p><button class="btn" data-act="add-open">+ Thêm môn học</button></div>`;
    return;
  }
  const t = T(sub.type),
    nb = arr(sub.outline && sub.outline.bai).length,
    nr = Object.keys(sub.ready || {}).length,
    nd = Object.keys(sub.done || {}).length;
  const tabs = [
    ["bai", "Bài học"],
    ["luyen", "Luyện"],
    ["thi", "Thi thử"],
    ["phu", "Độ phủ"],
  ];
  let head = `<div class="shead"><div><div class="row" style="margin-bottom:6px"><span class="chip t-${t.c}">${t.n}</span>${sub.sample ? `<span class="chip t-butter">Mẫu, không lưu</span>` : ""}</div>
    <h1>${esc(sub.name)}</h1><div class="meta">${nb} bài · ${nr} đã giải nghĩa · ${nd} đã học</div></div>
    <div class="row">${nb && nr < nb ? `<button class="btn soft" data-act="gen-all">Giải nghĩa tất cả bài</button>` : ""}
    ${sub.sample ? "" : S.confirmDel ? `<span class="note">Xóa môn này và toàn bộ tiến độ?</span><button class="btn danger" data-act="del-yes">Xóa</button><button class="btn ghost" data-act="del-no">Giữ lại</button>` : `<button class="btn ghost" data-act="replace-src">Thay giáo trình</button><button class="btn ghost" data-act="del-ask">Xóa môn</button>`}</div></div>
    <div class="tabs" role="tablist">${tabs.map(([k, n]) => `<button class="tab ${S.tab === k ? "on" : ""}" role="tab" data-act="tab" data-tab="${k}">${n}${k === "phu" && sub.outline ? covBadge(sub) : ""}</button>`).join("")}</div>`;
  if (!sub.outline) {
    m.innerHTML =
      statusHtml() +
      head +
      `<div class="card empty"><h2>Chưa chia bài</h2><p class="note">Giáo trình đã lưu nhưng chưa được chia thành bài.</p><button class="btn" data-act="re-outline">Chia bài ngay</button></div>`;
    renderSide();
    return;
  }
  let body = "";
  if (S.tab === "phu") body = await pPhu(sub);
  else if (S.tab === "thi") body = await pThi(sub);
  else if (S.tab === "luyen") body = await pLuyen(sub);
  else body = await pBai(sub);
  m.innerHTML = statusHtml() + head + body;
  renderSide();
  reapplyHl();
  if ($("#wwrap")) initWrite();
  if (RD.playing) rdMark();
}
function covBadge(sub) {
  const miss = Object.values(sub.miss || {}).reduce((a, x) => a + arr(x).length, 0);
  return miss ? `<span class="n">${miss}</span>` : "";
}
