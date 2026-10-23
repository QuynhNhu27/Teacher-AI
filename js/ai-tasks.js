/* Tác vụ AI: chia bài, giải nghĩa bài, tóm tắt, tạo bài luyện. */
"use strict";

/* ---------- tác vụ AI ---------- */
function setBusy(b) {
  S.busy = b;
  renderMain();
}
async function buildOutline(sub) {
  const lines = await getLines(sub);
  const nn = [];
  lines.forEach((t, i) => {
    if (t.trim()) nn.push(`[${i + 1}] ${t}`);
  });
  const parts = [];
  let cur = [],
    bytes = 0;
  const enc = new TextEncoder();
  for (const l of nn) {
    const b = enc.encode(l).length + 1;
    if (bytes + b > 90000 && cur.length) {
      parts.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(l);
    bytes += b;
  }
  if (cur.length) parts.push(cur);
  const res = [];
  for (let i = 0; i < parts.length; i++) {
    setBusy({
      text: `Đang đọc và chia bài${parts.length > 1 ? ` (phần ${i + 1}/${parts.length})` : ""}…`,
    });
    res.push(await aiJSON(pOutline(sub, parts[i].join("\n"), i, parts.length), "default"));
  }
  sub.outline = normOutline(res, lines.length);
  if (!sub.outline.bai.length) {
    sub.outline.bai = autoBai(lines, sub.outline.bo_qua);
    if (!sub.outline.bai.length) sub.outline.bai = autoBai(lines, []);
    if (sub.outline.bai.length)
      toast("AI chưa chia được bài, trang đã tự chia theo đề mục và độ dài.");
  }
  sub.ready = {};
  sub.done = {};
  sub.miss = {};
  await saveSub(sub);
}
async function genLesson(sub, bid, extra) {
  const b = arr(sub.outline.bai).find((x) => x.id === bid);
  if (!b) return;
  const lines = await getLines(sub);
  const items = itemsOf(sub, b);
  const L = await aiJSON(pLesson(sub, b, numbered(lines, b.tu, b.den), items, extra), "default");
  const clean = {
    muc_tieu: arr(L.muc_tieu).map(String),
    cot_loi: arr(L.cot_loi).map(String),
    thuat_ngu: arr(L.thuat_ngu).filter((x) => x && x.tu),
    vi_du: arr(L.vi_du).filter((v) => v && arr(v.dong).length),
    loi: arr(L.loi).map(String),
    hoi: arr(L.hoi).filter((x) => x && x.q),
    ngu_phap: arr(L.ngu_phap).filter((x) => x && x.mau),
    tom_tat: arr(L.tom_tat).map(String).filter(Boolean),
    mo_rong: arr(L.mo_rong).filter((x) => x && x.y),
    phu: arr(L.phu).map(String),
    khong_co: arr(L.khong_co).map(String),
  };
  const ids = items.map((m) => m.id);
  const missing = ids.filter((id) => !clean.phu.includes(id) || clean.khong_co.includes(id));
  S.lessons[sub.sid + "/" + bid] = clean;
  await put(`les_${sub.sid}_${bid}`, { kind: "lesson", data: clean });
  sub.ready = sub.ready || {};
  sub.ready[bid] = true;
  sub.miss = sub.miss || {};
  if (missing.length) sub.miss[bid] = missing;
  else delete sub.miss[bid];
  await saveSub(sub);
  await mergeCards(sub.sid, bid, clean);
}
async function genSummary(sub, bid) {
  const b = arr(sub.outline.bai).find((x) => x.id === bid);
  const L = await getLesson(sub.sid, bid);
  if (!b || !L) return;
  const lines = await getLines(sub);
  const r = await aiJSON(pSummary(sub, b, numbered(lines, b.tu, b.den)), "default");
  const L2 = {
    ...L,
    tom_tat: arr(r.tom_tat).map(String).filter(Boolean),
    mo_rong: EXT(sub.type) ? arr(r.mo_rong).filter((x) => x && x.y) : arr(L.mo_rong),
  };
  S.lessons[sub.sid + "/" + bid] = L2;
  await put(`les_${sub.sid}_${bid}`, { kind: "lesson", data: L2 });
}
async function genPrac(sub, bid) {
  const b = arr(sub.outline.bai).find((x) => x.id === bid);
  if (!b) return;
  const lines = await getLines(sub);
  const r = await aiJSON(pPractice(sub, b, numbered(lines, b.tu, b.den)), "default");
  const items = arr(r.items).filter((x) => x && x.loai);
  S.prac[sub.sid + "/" + b.id] = items;
  const pre = sub.sid + "/" + b.id + "/";
  [S.parsons, S.build, S.hintN, S.mcq].forEach((o) =>
    Object.keys(o).forEach((k) => {
      if (k.startsWith(pre)) delete o[k];
    }),
  );
  sub.pr = sub.pr || {};
  sub.pr[b.id] = { ok: [], n: items.length };
  saveSub(sub);
  await put(`prac_${sub.sid}_${b.id}`, { kind: "practice", items });
}
