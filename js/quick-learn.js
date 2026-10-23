/* Học nhanh 5 phút kiểu Duolingo và bảng chữ cái tiếng Nhật. */
"use strict";

/* ---------- Học nhanh (kiểu Duolingo) ---------- */
let QS = null;
const SAY_BIG = `<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const stripP = (t) =>
  String(t || "")
    .replace(/[(（][^)）]*[)）]/g, "")
    .trim();
function pick(a, n) {
  return shuffled(a.length)
    .slice(0, n)
    .map((i) => a[i]);
}
function optsFrom(correct, pool, n) {
  const others = [...new Set(pool.filter((x) => x && normLoose(x) !== normLoose(correct)))];
  const o = pick(others, Math.min(n - 1, others.length)).concat([correct]);
  const ord = shuffled(o.length);
  const opts = ord.map((i) => o[i]);
  return { opts, ans: opts.indexOf(correct) };
}
function tokenize(t) {
  t = stripP(t);
  const sp = t.split(/\s+/).filter(Boolean);
  if (sp.length >= 3) return sp;
  if (window.Intl && Intl.Segmenter) {
    const out = [];
    [...new Intl.Segmenter(detectLang(t).slice(0, 2), { granularity: "word" }).segment(t)]
      .map((x) => x.segment)
      .filter((x) => x.trim())
      .forEach((x) => {
        if (/^[\p{P}\p{S}]+$/u.test(x) && out.length) out[out.length - 1] += x;
        else out.push(x);
      });
    while (out.length > 8) {
      const o2 = [];
      for (let i = 0; i < out.length; i += 2) o2.push(out[i] + (out[i + 1] || ""));
      out.splice(0, out.length, ...o2);
    }
    return out;
  }
  return sp;
}
function buildLangSession(sub, L) {
  const V = [];
  arr(L.thuat_ngu).forEach((x) => {
    const w = stripP(x.tu);
    if (w && x.nghia && speakable(w) && !V.some((v) => v.w === w))
      V.push({ w, doc: x.doc || "", m: String(x.nghia) });
  });
  const poolV = V.slice();
  Object.keys(S.lessons).forEach((k) => {
    if (k.startsWith(sub.sid + "/") && S.lessons[k])
      arr(S.lessons[k].thuat_ngu).forEach((x) => {
        const w = stripP(x.tu);
        if (w && x.nghia && !poolV.some((v) => v.w === w))
          poolV.push({ w, doc: x.doc || "", m: String(x.nghia) });
      });
  });
  const Ss = [];
  arr(L.vi_du).forEach((v) =>
    arr(v.dong).forEach((d) => {
      if (d && d.t && speakable(d.t)) Ss.push(d);
    }),
  );
  arr(L.ngu_phap).forEach((g) =>
    arr(g.vi_du).forEach((d) => {
      if (d && d.t && speakable(d.t) && !Ss.some((x) => x.t === d.t)) Ss.push(d);
    }),
  );
  const W = poolV.map((v) => v.w),
    M = poolV.map((v) => v.m),
    out = [];
  const vs = pick(V, 6);
  vs.forEach((v, i) => {
    const kind = i % 3;
    if (kind === 0) {
      const o = optsFrom(v.m, M, 4);
      out.push({
        k: "chon",
        title: "Chọn nghĩa đúng",
        q: v.w,
        sub: v.doc,
        say: v.w,
        sayQ: true,
        autoSay: v.w,
        ...o,
        show: `${v.w} = ${v.m}`,
        explain: v.doc,
      });
    } else if (kind === 1) {
      const o = optsFrom(v.w, W, 4);
      out.push({
        k: "chon",
        title: "Chọn từ có nghĩa",
        q: v.m,
        say: v.w,
        ...o,
        show: `${v.w}${v.doc ? " (" + v.doc + ")" : ""} = ${v.m}`,
        showSay: v.w,
      });
    } else {
      const o = optsFrom(v.w, W, 4);
      out.push({
        k: "chon",
        title: "Nghe và chọn từ bạn nghe được",
        hideQ: true,
        say: v.w,
        autoSay: v.w,
        ...o,
        show: `${v.w} = ${v.m}`,
        showSay: v.w,
        explain: v.doc,
      });
    }
  });
  if (V.length >= 3)
    out.push({
      k: "ghep",
      title: "Ghép từ với nghĩa",
      pairs: pick(V, Math.min(5, V.length)).map((v) => ({ a: v.w, b: v.m })),
    });
  pick(Ss, 4).forEach((d, i) => {
    const tok = tokenize(d.t);
    if (i < 2 && tok.length >= 3 && tok.length <= 10)
      out.push({
        k: "xep",
        title: "Sắp xếp thành câu đúng",
        mean: d.g,
        tok,
        answer: stripP(d.t),
        show: stripP(d.t),
        showSay: d.t,
        explain: [d.doc, d.g].filter(Boolean).join(" · "),
      });
    else
      out.push({
        k: "go",
        title: "Nghe và gõ lại câu",
        say: d.t,
        autoSay: d.t,
        answers: [d.t, ...String(d.doc || "").split(/[\/|;、]/)],
        show: stripP(d.t),
        showSay: d.t,
        explain: [d.doc, d.g].filter(Boolean).join(" · "),
      });
  });
  const fill = Ss.map((d) => {
    const v = V.find((v) => [...v.w].length >= 1 && stripP(d.t).includes(v.w));
    return v ? { d, v } : null;
  }).filter(Boolean);
  pick(fill, 1).forEach(({ d, v }) => {
    const o = optsFrom(v.w, W, 4);
    out.push({
      k: "chon",
      title: "Chọn từ điền vào chỗ trống",
      q: stripP(d.t).replace(v.w, "＿＿"),
      sub: d.g,
      say: d.t,
      ...o,
      show: stripP(d.t),
      showSay: d.t,
      explain: `${v.w} = ${v.m}`,
    });
  });
  const first = out.shift();
  return first ? [first, ...pick(out, out.length)].slice(0, 12) : [];
}
const KANA = {
  hira: [
    "あいうえお",
    "かきくけこ",
    "さしすせそ",
    "たちつてと",
    "なにぬねの",
    "はひふへほ",
    "まみむめも",
    "や_ゆ_よ",
    "らりるれろ",
    "わ___を",
    "ん____",
  ],
  kata: [
    "アイウエオ",
    "カキクケコ",
    "サシスセソ",
    "タチツテト",
    "ナニヌネノ",
    "ハヒフヘホ",
    "マミムメモ",
    "ヤ_ユ_ヨ",
    "ラリルレロ",
    "ワ___ヲ",
    "ン____",
  ],
  daku: ["がぎぐげご", "ざじずぜぞ", "だぢづでど", "ばびぶべぼ", "ぱぴぷぺぽ"],
  dakuk: ["ガギグゲゴ", "ザジズゼゾ", "ダヂヅデド", "バビブベボ", "パピプペポ"],
};
const ROMA = [
  "a i u e o",
  "ka ki ku ke ko",
  "sa shi su se so",
  "ta chi tsu te to",
  "na ni nu ne no",
  "ha hi fu he ho",
  "ma mi mu me mo",
  "ya _ yu _ yo",
  "ra ri ru re ro",
  "wa _ _ _ wo",
  "n _ _ _ _",
].map((r) => r.split(" "));
const ROMA_D = [
  "ga gi gu ge go",
  "za ji zu ze zo",
  "da ji zu de do",
  "ba bi bu be bo",
  "pa pi pu pe po",
].map((r) => r.split(" "));
function kanaList(set) {
  const rows = KANA[set],
    rm = set.startsWith("daku") ? ROMA_D : ROMA;
  const out = [];
  rows.forEach((r, i) =>
    [...r].forEach((c, j) => {
      if (c !== "_") out.push({ c, r: rm[i][j] });
    }),
  );
  return out;
}
function buildKanaSession(set) {
  const L = kanaList(set),
    R = L.map((x) => x.r),
    C = L.map((x) => x.c);
  return pick(L, 10).map((x, i) => {
    if (i % 2 === 0) {
      const o = optsFrom(x.r, R, 4);
      return {
        k: "chon",
        title: "Chữ này đọc là gì?",
        q: x.c,
        say: x.c,
        sayQ: true,
        ...o,
        show: `${x.c} = ${x.r}`,
        showSay: x.c,
      };
    }
    const o = optsFrom(x.c, C, 4);
    return {
      k: "chon",
      title: `Chọn chữ đọc là “${x.r}”`,
      q: x.r,
      say: x.c,
      ...o,
      show: `${x.r} = ${x.c}`,
      showSay: x.c,
    };
  });
}
function qsStart(items, key, label) {
  if (!items.length) {
    toast(
      "Bài này chưa đủ từ vựng hoặc câu để tạo bài học nhanh. Hãy bấm “Giải nghĩa lại” cho bài.",
    );
    return;
  }
  QS = {
    key,
    label,
    items: items.map((x) => ({ ...x, tries: 0 })),
    done: 0,
    total: items.length,
    firstOk: 0,
    combo: 0,
    best: 0,
    t0: Date.now(),
    state: null,
    finished: false,
    xp: 0,
  };
  qsRender();
}
function qsHtml() {
  const Q = QS;
  if (Q.finished) {
    const acc = Math.round((Q.firstOk / Q.total) * 100);
    return `<div class="qdone"><div class="qtitle">Hoàn thành bài học!</div><p class="note" style="margin:0">${esc(Q.label)}</p>
      <div class="qstats"><div class="qstat t-butter"><div class="label" style="color:inherit">XP nhận</div><div class="big">+${Q.xp}</div></div><div class="qstat t-mint"><div class="label" style="color:inherit">Đúng ngay lần đầu</div><div class="big">${acc}%</div></div><div class="qstat t-sky"><div class="label" style="color:inherit">Đúng liền nhiều nhất</div><div class="big">${Q.best}</div></div></div>
      <div class="row" style="justify-content:center"><button class="btn" data-act="qs-again">Học lại</button><button class="btn ghost" data-act="qs-exit">Xong</button></div></div>`;
  }
  const it = Q.items[0],
    st = Q.state,
    pc = Math.round((Q.done / Q.total) * 100);
  let body = `<div class="qtitle">${esc(it.title)}</div>`;
  if (it.k === "chon") {
    body += it.hideQ
      ? `<div class="row" style="gap:12px"><button class="bigsay" data-act="say" data-t="${esc(it.say)}" aria-label="Nghe lại">${SAY_BIG}</button><button class="btn ghost" data-act="say" data-t="${esc(it.say)}" data-r="0.55">Nghe chậm</button></div>`
      : `<div class="qword">${esc(it.q)} ${it.sayQ ? sayBtn(it.say) : ""}</div>${it.sub ? `<div class="qsub">${esc(it.sub)}</div>` : ""}`;
    body += `<div class="qopts">${it.opts
      .map((o, j) => {
        let c = "";
        if (st) {
          if (j === it.ans) c = "right";
          else if (j === st.pick) c = "wrong";
        }
        return `<button class="qopt ${c}" data-act="qs-pick" data-j="${j}" ${st ? "disabled" : ""}><kbd>${j + 1}</kbd><span>${esc(o)}</span></button>`;
      })
      .join("")}</div>`;
  } else if (it.k === "ghep") {
    const n = it.pairs.length;
    it.ps = it.ps || {
      L: shuffled(n),
      R: shuffled(n),
      sl: null,
      sr: null,
      gone: [],
      miss: 0,
      bad: null,
    };
    const P = it.ps;
    const cls = (side, i) =>
      P.gone.includes(i)
        ? "gone"
        : P.bad && P.bad[side] === i
          ? "bad"
          : (side === 0 ? P.sl : P.sr) === i
            ? "sel"
            : "";
    body += `<div class="pairs"><div class="pcol">${P.L.map((i) => `<button class="pbtn ${cls(0, i)}" data-act="qs-pl" data-x="${i}" ${P.gone.includes(i) ? "disabled" : ""}>${esc(it.pairs[i].a)}</button>`).join("")}</div>
      <div class="pcol">${P.R.map((i) => `<button class="pbtn ${cls(1, i)}" data-act="qs-pr" data-x="${i}" ${P.gone.includes(i) ? "disabled" : ""}>${esc(it.pairs[i].b)}</button>`).join("")}</div></div>`;
  } else if (it.k === "xep") {
    it.bs = it.bs || { pool: shuffled(it.tok.length), ans: [] };
    const B = it.bs;
    body += `<div class="qsub" style="margin-top:0">${esc(it.mean)}</div><div class="bz" style="min-height:60px">${B.ans.length ? B.ans.map((m, p) => `<button class="tok" data-act="qs-untok" data-p="${p}" ${st ? "disabled" : ""}>${esc(it.tok[m])}</button>`).join("") : `<span class="note">Chạm các mảnh bên dưới theo đúng thứ tự</span>`}</div>
      <div class="pool">${B.pool
        .filter((m) => !B.ans.includes(m))
        .map(
          (m) =>
            `<button class="tok" data-act="qs-tok" data-m="${m}" ${st ? "disabled" : ""}>${esc(it.tok[m])}</button>`,
        )
        .join("")}</div>`;
  } else if (it.k === "go") {
    body += `<div class="row" style="gap:12px"><button class="bigsay" data-act="say" data-t="${esc(it.say)}" aria-label="Nghe lại">${SAY_BIG}</button><button class="btn ghost" data-act="say" data-t="${esc(it.say)}" data-r="0.55">Nghe chậm</button></div>
      <input class="inp" id="qsIn" placeholder="Gõ lại câu vừa nghe (chữ gốc hoặc phiên âm)" autocomplete="off" lang="${subLang(curSub())}" ${st ? "disabled" : ""} style="font-size:1.05rem;padding:12px 14px">`;
  }
  const foot = st
    ? `<div class="qfoot ${st.ok ? "ok" : "bad"}"><div style="min-width:0;flex:1"><b>${st.ok ? "Tuyệt vời!" : "Đáp án đúng:"}</b> ${esc(it.show || "")} ${it.showSay ? sayBtn(it.showSay) : ""}${it.explain ? `<div style="font-size:.88rem;margin-top:2px">${esc(it.explain)}</div>` : ""}</div><button class="btn" data-act="qs-next" id="qsNext">Tiếp tục</button></div>`
    : ["xep", "go"].includes(it.k)
      ? `<div class="row" style="justify-content:space-between"><button class="btn ghost" data-act="qs-skip">Không biết</button><button class="btn" data-act="qs-check" id="qsCheck">Kiểm tra</button></div>`
      : "";
  return `<div class="qtop"><button class="ibtn" data-act="qs-exit" aria-label="Thoát bài học">✕</button><div class="qbar" role="progressbar" aria-valuenow="${pc}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pc}%"></i></div>${Q.combo >= 2 ? `<span class="combo">${Q.combo} câu đúng liền</span>` : ""}</div>
    <div class="stack" style="gap:14px">${body}</div>${foot}`;
}
function qsRender() {
  const box = $("#qsBox");
  if (!box) {
    renderMain();
    return;
  }
  box.innerHTML = qsHtml();
  const Q = QS;
  if (!Q || Q.finished) return;
  const it = Q.items[0];
  if (!Q.state && it.autoSay) setTimeout(() => speak(it.autoSay), 220);
  if (it.k === "go" && !Q.state) {
    const i = $("#qsIn");
    if (i) i.focus();
  }
  if (Q.state) {
    const n = $("#qsNext");
    if (n) n.focus();
  }
}
function qsAnswer(ok, pickJ) {
  const Q = QS,
    it = Q.items[0];
  Q.state = { ok, pick: pickJ };
  beep(ok);
  if (ok) {
    if (!it.tries) Q.firstOk++;
    Q.combo++;
    Q.best = Math.max(Q.best, Q.combo);
  } else {
    Q.combo = 0;
    it.tries++;
  }
  if (it.showSay || it.say) setTimeout(() => speak(it.showSay || it.say), ok ? 150 : 350);
  qsRender();
}
function qsNextItem() {
  const Q = QS;
  const it = Q.items.shift();
  if (Q.state && Q.state.ok) Q.done++;
  else Q.items.push({ ...it, bs: null, ps: null });
  Q.state = null;
  if (!Q.items.length) {
    Q.finished = true;
    Q.xp = Q.firstOk * 10 + (Q.firstOk === Q.total ? 20 : 0);
    addXP(Q.xp);
    beep(true);
  }
  qsRender();
}
async function mNhanh(sub, b) {
  const key = `les:${sub.sid}:${b.id}`;
  if (QS && QS.key === key)
    return `<div class="card"><div class="qs" id="qsBox">${qsHtml()}</div></div>`;
  const L = await getLesson(sub.sid, b.id);
  if (!L) return needLesson();
  const nV = arr(L.thuat_ngu).length,
    nS = arr(L.vi_du).reduce((a, v) => a + arr(v.dong).length, 0);
  return `<div class="card stack" style="text-align:center;align-items:center;padding:28px 18px">
    <div class="qtitle">Học nhanh: ${esc(b.ten)}</div>
    <p class="note" style="margin:0;max-width:52ch">12 câu ngắn trộn nhiều dạng: chọn nghĩa, nghe chọn từ, ghép cặp, xếp câu, nghe và gõ lại. Câu sai sẽ quay lại cuối bài để làm lại. Dùng phím 1–4 để chọn, Enter để tiếp tục.</p>
    <div class="row" style="justify-content:center"><span class="chip t-butter">${nV} từ vựng</span><span class="chip t-mint">${nS} câu ví dụ</span><span class="chip t-peach">+10 XP mỗi câu đúng</span></div>
    <button class="btn" data-act="qs-start" style="padding:12px 28px;font-size:1rem">Bắt đầu</button></div>`;
}
function mKana() {
  const set = S.kanaSet;
  const key = "kana:" + set;
  if (QS && QS.key === key)
    return `<div class="card"><div class="qs" id="qsBox">${qsHtml()}</div></div>`;
  const rows = KANA[set],
    rm = set.startsWith("daku") ? ROMA_D : ROMA;
  return `<div class="card stack"><div class="row" style="justify-content:space-between"><div class="seg">${[
    ["hira", "Hiragana"],
    ["kata", "Katakana"],
    ["daku", "Âm đục (hira)"],
    ["dakuk", "Âm đục (kata)"],
  ]
    .map(
      ([k, n]) =>
        `<button class="${set === k ? "on" : ""}" data-act="kana-set" data-k="${k}">${n}</button>`,
    )
    .join("")}</div>
    <button class="btn" data-act="kana-quiz">Luyện nhanh 10 chữ</button></div>
    <p class="note" style="margin:0">Chạm vào chữ để nghe cách đọc.</p>
    <div class="kana">${rows.map((r, i) => [...r].map((c, j) => (c === "_" ? `<span class="kc empty"></span>` : `<button class="kc" data-act="say" data-t="${c}"><b>${c}</b><small>${rm[i][j]}</small></button>`)).join("")).join("")}</div></div>`;
}
