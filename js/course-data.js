/* Dữ liệu môn học: danh sách bài, bài giải nghĩa, tiến độ. */
"use strict";

/* ---------- dữ liệu môn ---------- */
const curSub = () => S.subjects.find((s) => s.sid === S.sid) || null;
const sortedBai = (sub) =>
  [...arr(sub.outline && sub.outline.bai)].sort((a, b) => a.tu - b.tu || a.den - b.den);
async function getLines(sub) {
  if (S.sources[sub.sid]) return S.sources[sub.sid];
  const parts = [];
  for (let k = 0; k < (sub.parts || 1); k++) {
    const d = await get(`src_${sub.sid}_${k}`);
    parts.push(d ? d.text : "");
  }
  return (S.sources[sub.sid] = parts.join("").split("\n"));
}
function numbered(lines, tu, den) {
  const o = [];
  for (let i = tu; i <= den; i++) {
    const t = lines[i - 1];
    if (t != null && t.trim()) o.push(`[${i}] ${t}`);
  }
  return o.join("\n");
}
async function getLesson(sid, bid) {
  const k = sid + "/" + bid;
  if (k in S.lessons) return S.lessons[k];
  const d = await get(`les_${sid}_${bid}`);
  return (S.lessons[k] = d ? d.data : null);
}
async function loadCards(sid) {
  if (S.cards[sid]) return S.cards[sid];
  const d = await get("cards_" + sid);
  return (S.cards[sid] = d ? arr(d.list) : []);
}
function itemsOf(sub, b) {
  return arr(sub.outline.muc).filter((m) => m.tu >= b.tu && m.tu <= b.den);
}

function normOutline(parts, nlines) {
  let muc = [],
    bai = [],
    bo = [];
  parts.forEach((p) => {
    if (!p) return;
    muc.push(...arr(p.muc || p.muc_luc || p.items));
    bai.push(...arr(p.bai || p.bai_hoc || p.lessons));
    bo.push(...arr(p.bo_qua || p.skip));
  });
  const cl = (x) => Math.max(1, Math.min(nlines, parseInt(x, 10) || 1));
  const fix = (o) => {
    o.tu = cl(o.tu);
    o.den = cl(o.den);
    if (o.den < o.tu) {
      const t = o.tu;
      o.tu = o.den;
      o.den = t;
    }
    return o;
  };
  muc = muc
    .filter(Boolean)
    .map(fix)
    .sort((a, b) => a.tu - b.tu)
    .map((m, i) => ({
      id: "m" + (i + 1),
      ten: String(m.ten || "Mục " + (i + 1)),
      tu: m.tu,
      den: m.den,
    }));
  bai = bai
    .filter(Boolean)
    .map(fix)
    .sort((a, b) => a.tu - b.tu);
  const out = [];
  let k = 0;
  for (const b of bai) {
    const prev = out[out.length - 1];
    let tu = b.tu;
    if (prev && tu <= prev.den) tu = prev.den + 1;
    if (tu > b.den) continue;
    const ten = String(b.ten || "Bài");
    if (b.den - tu > 150) {
      for (let s = tu, p = 1; s <= b.den; s += 100, p++)
        out.push({ id: "b" + ++k, ten: `${ten} (phần ${p})`, tu: s, den: Math.min(b.den, s + 99) });
    } else out.push({ id: "b" + ++k, ten, tu, den: b.den });
  }
  return {
    muc,
    bai: out,
    bo_qua: bo
      .filter(Boolean)
      .map(fix)
      .map((x) => ({ ly_do: String(x.ly_do || ""), tu: x.tu, den: x.den })),
  };
}

function autoBai(lines, bo) {
  const skip = new Set();
  arr(bo).forEach((b) => {
    for (let i = b.tu; i <= b.den; i++) skip.add(i);
  });
  const head =
    /^\s*(bài|chương|phần|mục|lesson|unit|chapter|part|第\s*\S+\s*[課章])|^\s*\d+(\.\d+)*[.)]?\s+\S/i;
  const out = [];
  let cur = null,
    cnt = 0;
  for (let i = 1; i <= lines.length; i++) {
    const t = lines[i - 1];
    if (!t || !t.trim() || skip.has(i)) continue;
    if (!cur || cnt >= 40 || (head.test(t) && cnt >= 8)) {
      cur = { id: "b" + (out.length + 1), ten: t.trim().slice(0, 60), tu: i, den: i };
      out.push(cur);
      cnt = 0;
    }
    cur.den = i;
    cnt++;
  }
  return out;
}
function coverage(sub, lines) {
  const n = lines.length,
    inL = new Uint8Array(n + 2),
    inB = new Uint8Array(n + 2);
  for (const b of arr(sub.outline.bai)) for (let i = b.tu; i <= b.den; i++) inL[i] = 1;
  for (const b of arr(sub.outline.bo_qua)) for (let i = b.tu; i <= b.den; i++) inB[i] = 1;
  let content = 0,
    cov = 0,
    skip = 0,
    gen = 0;
  const gaps = [];
  let g = null;
  const readySet = arr(sub.outline.bai).filter((b) => sub.ready && sub.ready[b.id]);
  for (let i = 1; i <= n; i++) {
    const has = lines[i - 1] && lines[i - 1].trim();
    if (!has) {
      continue;
    }
    content++;
    if (inL[i]) {
      cov++;
      if (readySet.some((b) => i >= b.tu && i <= b.den)) gen++;
      if (g) {
        gaps.push(g);
        g = null;
      }
    } else if (inB[i]) {
      skip++;
      if (g) {
        gaps.push(g);
        g = null;
      }
    } else {
      if (g) g.den = i;
      else g = { tu: i, den: i };
    }
  }
  if (g) gaps.push(g);
  return { content, cov, skip, gen, gaps };
}
