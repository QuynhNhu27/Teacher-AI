/* Xử lý sự kiện: mọi nút bấm (data-act), phím tắt, chọn chữ, kéo thả. */
"use strict";

/* ---------- luyện ---------- */
function pracItem(i) {
  const sub = curSub();
  return (S.prac[sub.sid + "/" + S.bid] || [])[i];
}
const fb = (i, cls, html) => {
  $("#pf-" + i).innerHTML = `<div class="fb ${cls}">${html}</div>`;
};

/* ---------- sự kiện ---------- */
const ACT = {
  "add-open": () => openAdd(),
  "add-close": () => {
    $("#layer").innerHTML = "";
  },
  "pick-sub": (a) => {
    rdStop();
    vpHalt();
    VP.key = null;
    QS = null;
    S.exam = null;
    S.sid = a.dataset.sid;
    S.bid = null;
    S.confirmDel = false;
    if (S.tab === "on") S.tab = "bai";
    document.body.classList.remove("side-open");
    renderMain();
    renderChat();
  },
  "pick-les": (a) => {
    rdStop();
    vpHalt();
    VP.key = null;
    QS = null;
    S.bid = a.dataset.bid;
    S.chepI = 0;
    S.vietI = 0;
    if (S.tab !== "luyen") S.tab = "bai";
    document.body.classList.remove("side-open");
    renderMain().then(() => $("#main").scrollTo && $("#main").scrollTo({ top: 0 }));
    window.scrollTo && window.scrollTo({ top: 0 });
    renderChat();
  },
  tab: (a) => {
    if (a.dataset.tab !== "bai") {
      vpHalt();
      VP.key = null;
    }
    S.tab = a.dataset.tab;
    document.body.classList.remove("side-open");
    renderMain();
  },
  "gen-les": () => runGen(S.bid),
  regen: () => {
    const sub = curSub();
    const miss = arr(sub.miss && sub.miss[S.bid]);
    const items = sub.outline.muc.filter((m) => miss.includes(m.id));
    runGen(
      S.bid,
      miss.length
        ? `Lần trước còn thiếu các mục: ${items.map((m) => m.id + ": " + m.ten).join("; ")}. Lần này phải phủ đủ.`
        : "",
    );
  },
  "gen-all": () => genAll(),
  "stop-all": () => {
    S.stopAll = true;
    toast("Sẽ dừng sau bài đang chạy.");
  },
  "mark-done": () => {
    const sub = curSub();
    sub.done = sub.done || {};
    if (sub.done[S.bid]) delete sub.done[S.bid];
    else sub.done[S.bid] = Date.now();
    saveSub(sub);
    renderMain();
  },
  "del-ask": () => {
    S.confirmDel = true;
    renderMain();
  },
  "del-no": () => {
    S.confirmDel = false;
    renderMain();
  },
  "del-yes": async () => {
    const sub = curSub();
    if (!sub) return;
    S.confirmDel = false;
    const ids = ["sub_" + sub.sid, "cards_" + sub.sid];
    for (let k = 0; k < (sub.parts || 1); k++) ids.push(`src_${sub.sid}_${k}`);
    arr(sub.outline && sub.outline.bai).forEach((b) => {
      ids.push(`les_${sub.sid}_${b.id}`, `prac_${sub.sid}_${b.id}`);
    });
    S.subjects = S.subjects.filter((s) => s !== sub);
    S.sid = (S.subjects[0] || {}).sid || null;
    S.bid = null;
    renderMain();
    for (const id of ids) await del(id);
    toast("Đã xóa môn.");
  },
  "re-outline": async () => {
    const sub = curSub();
    if (S.busy) return;
    try {
      await buildOutline(sub);
      const f = sortedBai(sub)[0];
      S.busy = null;
      if (f) {
        S.bid = f.id;
        await runGen(f.id);
        return;
      }
    } catch (e) {
      toast(errMsg(e), "bad");
    }
    S.busy = null;
    renderMain();
  },
  "auto-split": async () => {
    const sub = curSub();
    const lines = await getLines(sub);
    sub.outline = sub.outline || { muc: [], bai: [], bo_qua: [] };
    sub.outline.bai = autoBai(lines, sub.outline.bo_qua);
    if (!sub.outline.bai.length) sub.outline.bai = autoBai(lines, []);
    sub.ready = {};
    sub.done = {};
    sub.miss = {};
    await saveSub(sub);
    const f = sortedBai(sub)[0];
    if (f) {
      S.bid = f.id;
      toast(`Đã chia thành ${sub.outline.bai.length} bài.`);
    }
    renderMain();
  },
  "extra-les": async (a) => {
    const sub = curSub();
    const tu = +a.dataset.tu,
      den = +a.dataset.den;
    const n = arr(sub.outline.bai).length + 1;
    let id = "b" + n;
    while (sub.outline.bai.some((b) => b.id === id)) id += "x";
    sub.outline.bai.push({ id, ten: `Bổ sung: dòng ${tu}–${den}`, tu, den });
    await saveSub(sub);
    S.bid = id;
    S.tab = "bai";
    runGen(id);
  },
  "gen-prac": async () => {
    const sub = curSub();
    const b = sortedBai(sub).find((x) => x.id === S.bid);
    if (!b || S.busy) return;
    setBusy({ text: "AI đang soạn bài tập…" });
    try {
      await genPrac(sub, b.id);
    } catch (e) {
      toast(errMsg(e), "bad");
    }
    S.busy = null;
    renderMain();
  },
  pmode: (a) => {
    S.pmode = a.dataset.m;
    renderMain();
  },
  "go-nhanh": () => {
    S.tab = "luyen";
    S.pmode = "nhanh";
    QS = null;
    renderMain();
  },
  "qs-start": async () => {
    const sub = curSub();
    const L = await getLesson(sub.sid, S.bid);
    const b = sortedBai(sub).find((x) => x.id === S.bid);
    QS = null;
    for (const x of sortedBai(sub)) await getLesson(sub.sid, x.id);
    qsStart(buildLangSession(sub, L || {}), `les:${sub.sid}:${S.bid}`, b ? b.ten : "");
    if (QS) renderMain();
  },
  "qs-again": () => {
    const k = QS && QS.key;
    QS = null;
    if (k && k.startsWith("kana:")) {
      qsStart(buildKanaSession(S.kanaSet), k, "Bảng chữ cái");
      renderMain();
    } else ACT["qs-start"]();
  },
  "qs-exit": () => {
    QS = null;
    renderMain();
  },
  "qs-pick": (a) => {
    const it = QS.items[0];
    if (QS.state) return;
    const j = +a.dataset.j;
    qsAnswer(j === it.ans, j);
  },
  "qs-next": () => qsNextItem(),
  "qs-skip": () => qsAnswer(false, -1),
  "qs-check": () => {
    const it = QS.items[0];
    if (QS.state) return;
    if (it.k === "xep") {
      if (!it.bs.ans.length) return;
      qsAnswer(normLoose(it.bs.ans.map((m) => it.tok[m]).join("")) === normLoose(it.answer), -1);
    } else if (it.k === "go") {
      const g = ($("#qsIn") || {}).value || "";
      if (!g.trim()) return;
      const st = (x) => normLoose(stripP(x));
      qsAnswer(
        it.answers.filter(Boolean).some((x) => st(x) === st(g)),
        -1,
      );
    }
  },
  "qs-tok": (a) => {
    if (QS.state) return;
    QS.items[0].bs.ans.push(+a.dataset.m);
    qsRender();
  },
  "qs-untok": (a) => {
    if (QS.state) return;
    QS.items[0].bs.ans.splice(+a.dataset.p, 1);
    qsRender();
  },
  "qs-pl": (a) => qsPair(0, +a.dataset.x),
  "qs-pr": (a) => qsPair(1, +a.dataset.x),
  "kana-set": (a) => {
    S.kanaSet = a.dataset.k;
    QS = null;
    renderMain();
  },
  "kana-quiz": () => {
    qsStart(buildKanaSession(S.kanaSet), "kana:" + S.kanaSet, "Bảng chữ cái");
    renderMain();
  },
  "gen-sum": async () => {
    const sub = curSub();
    if (S.busy) return;
    setBusy({ text: "AI đang tóm tắt bài thành lời giảng…" });
    try {
      await genSummary(sub, S.bid);
    } catch (e) {
      toast(errMsg(e), "bad");
    }
    S.busy = null;
    renderMain();
  },
  "thi-gen-sum": async () => {
    const sub = curSub();
    if (S.busy) return;
    S.stopAll = false;
    const bs = sortedBai(sub);
    for (let i = 0; i < bs.length; i++) {
      if (S.stopAll) break;
      const b = bs[i];
      let L = await getLesson(sub.sid, b.id);
      if (L && arr(L.video).length) continue;
      S.busy = {
        text: `Đang soạn video bài giảng ${i + 1}/${bs.length}: “${b.ten}”…`,
        stoppable: true,
      };
      renderMain();
      try {
        if (!L) await genLesson(sub, b.id);
        await genVideo(sub, b.id);
      } catch (e) {
        toast(errMsg(e), "bad");
        if (e && ["not_granted", "rate_limited", "sampling_disabled"].includes(e.code)) break;
      }
    }
    S.busy = null;
    renderMain();
  },
  watch: (a) => {
    vpHalt();
    VP.key = null;
    S.bid = a.dataset.bid;
    S.tab = "bai";
    renderMain().then(() => {
      const v = $("#vpBox");
      if (v) v.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  },
  "thi-gen-q": async () => {
    const sub = curSub();
    if (S.busy) return;
    S.stopAll = false;
    const bs = sortedBai(sub).filter((b) => !S.prac[sub.sid + "/" + b.id]);
    for (let i = 0; i < bs.length; i++) {
      if (S.stopAll) break;
      S.busy = {
        text: `Đang soạn câu hỏi ${i + 1}/${bs.length}: “${bs[i].ten}”…`,
        stoppable: true,
      };
      renderMain();
      try {
        await genPrac(sub, bs[i].id);
      } catch (e) {
        toast(errMsg(e), "bad");
        if (e && ["not_granted", "rate_limited", "sampling_disabled"].includes(e.code)) break;
      }
    }
    S.busy = null;
    renderMain();
  },
  "ex-start": () => {
    const sub = curSub();
    const all = [];
    sortedBai(sub).forEach((b) =>
      arr(S.prac[sub.sid + "/" + b.id]).forEach((it) => {
        if (it.loai === "trac_nghiem" && arr(it.lua_chon).length > 1) all.push({ b, it });
      }),
    );
    const pick = shuffled(all.length)
      .slice(0, 30)
      .map((j) => ({ ...all[j], ord: shuffled(arr(all[j].it.lua_chon).length) }));
    S.exam = { sid: sub.sid, qs: pick, ans: {}, done: false };
    renderMain();
  },
  "ex-pick": (a) => {
    const E = S.exam;
    if (!E || E.done) return;
    const j = +a.dataset.q;
    E.ans[j] = +a.dataset.o;
    a.parentElement.querySelectorAll(".opt").forEach((o) => o.classList.toggle("pick", o === a));
  },
  "ex-submit": () => {
    const E = S.exam;
    if (!E) return;
    E.done = true;
    renderMain().then(() => {
      const m = $("#main");
      if (m) m.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  },
  "ex-close": () => {
    S.exam = null;
    renderMain();
  },
  mcq: (a) => {
    const i = +a.dataset.i,
      it = pracItem(i),
      st = S.mcq[pkey(i)];
    if (!st || st.done) return;
    st.done = true;
    const ok = mcqIdx(it),
      pick = +a.dataset.o;
    $("#pm-" + i)
      .querySelectorAll(".opt")
      .forEach((o) => {
        const v = +o.dataset.o;
        o.disabled = true;
        if (v === ok) o.classList.add("right");
        else if (v === pick) o.classList.add("wrong");
      });
    fb(
      i,
      pick === ok ? "ok" : "bad",
      `<b>${pick === ok ? "Chính xác!" : "Chưa đúng."}</b> ${esc(it.giai_thich || "")}`,
    );
    if (pick === ok) markOk(i);
  },
  "rd-play": (a) => {
    const k = a.dataset.rk;
    if (RD.key === k && RD.playing) {
      if (RD.paused) {
        RD.paused = false;
        if (speechSynthesis.paused) speechSynthesis.resume();
        else if (!speechSynthesis.speaking) rdNext();
      } else {
        speechSynthesis.pause();
        RD.paused = true;
      }
      rdMark();
    } else rdStart(k, 0);
  },
  "rd-from": (a) => {
    const s = getSelection && getSelection().toString().trim();
    if (s) return;
    rdStart(a.dataset.rk, +a.dataset.pi, +a.dataset.ci || 0);
  },
  "gen-video": async () => {
    const sub = curSub();
    if (S.busy) return;
    vpHalt();
    setBusy({ text: "Thầy cô AI đang soạn video bài giảng…" });
    try {
      await genVideo(sub, S.bid);
      VP.key = null;
    } catch (e) {
      toast(errMsg(e), "bad");
    }
    S.busy = null;
    renderMain();
  },
  "vp-play": (a) => {
    const k = a.dataset.vk;
    if (VP.key === k && VP.playing) {
      if (VP.paused) {
        VP.paused = false;
        if (speechSynthesis.paused) speechSynthesis.resume();
        else if (!speechSynthesis.speaking) vpStep();
      } else {
        VP.paused = true;
        speechSynthesis.pause();
      }
      vpRender();
    } else if (VP.key === k && !VP.ended && (VP.si > 0 || VP.li >= 0)) {
      VP.su = null;
      VP.playing = true;
      VP.paused = false;
      VP.li = -1;
      speechSynthesis.cancel();
      vpRender();
      VP.tm = setTimeout(vpStep, 300);
    } else vpStart(k, 0);
  },
  "vp-go": (a) => {
    if (!VP.key) {
      const box = $("#vpBox");
      if (!box) return;
      VP.key = box.dataset.vk;
      VP.sc = S.readerData[VP.key] || [];
      VP.si = 0;
    }
    const n = VP.sc.length;
    const si = Math.max(0, Math.min(n - 1, VP.si + +a.dataset.d));
    ACT["vp-seek"]({ dataset: { k: si } });
  },
  "vp-seek": (a) => {
    VP.su = null;
    const box = $("#vpBox");
    if (!box) return;
    const key = box.dataset.vk;
    const was = VP.key === key && VP.playing;
    clearTimeout(VP.tm);
    speechSynthesis.cancel();
    VP.key = key;
    VP.sc = S.readerData[key] || [];
    VP.si = +a.dataset.k;
    VP.li = -1;
    VP.prevShown = 0;
    VP.mhShown = false;
    VP.ended = false;
    VP.said = "";
    if (was) {
      VP.playing = true;
      VP.paused = false;
      vpRender();
      VP.tm = setTimeout(vpStep, 300);
    } else {
      VP.playing = false;
      vpRender();
    }
  },
  "vp-ans": (a) => {
    const c =
      VP.sc[VP.si] || (S.readerData[($("#vpBox") || { dataset: {} }).dataset.vk] || [])[VP.si];
    if (!c) return;
    const key = VP.key || $("#vpBox").dataset.vk;
    VP.key = key;
    if (!VP.sc.length) VP.sc = S.readerData[key];
    const k = +a.dataset.k,
      ok = mcqIdx(c);
    VP.ans[key + "#" + VP.si] = k;
    beep(k === ok);
    if (k === ok) addXP(3);
    speechSynthesis.cancel();
    clearTimeout(VP.tm);
    VP.said =
      (k === ok ? "Chính xác! " : "Chưa đúng rồi. Đáp án là " + ("ABCD"[ok] || "") + ". ") +
      c.giai_thich;
    vpRender();
    if (VP.playing && !VP.paused) {
      vpSpeak(VP.said, () => {
        VP.li = 999;
        VP.tm = setTimeout(vpStep, 500);
      });
    }
  },
  "vp-replay": () => {
    const box = $("#vpBox");
    if (box) vpStart(box.dataset.vk, 0);
  },
  "vp-full": () => {
    const st = $("#vpStage");
    if (!st) return;
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else {
        const p = st.requestFullscreen && st.requestFullscreen();
        if (p && p.catch) p.catch(() => toast("Trình xem này không hỗ trợ toàn màn hình."));
      }
    } catch (e) {
      toast("Trình xem này không hỗ trợ toàn màn hình.");
    }
  },
  "regen-sum": async () => {
    const sub = curSub();
    if (S.busy) return;
    rdStop();
    setBusy({ text: "AI đang soạn lại lời giảng dễ hiểu hơn…" });
    try {
      await genSummary(sub, S.bid);
    } catch (e) {
      toast(errMsg(e), "bad");
    }
    S.busy = null;
    renderMain();
  },
  "rd-stop": () => rdStop(),
  "check-guess": (a) => {
    const i = +a.dataset.i,
      it = pracItem(i),
      g = $("#pg-" + i).value;
    const ok = normAns(g) === normAns(it.dap_an);
    fb(
      i,
      ok ? "ok" : "bad",
      `${ok ? "Chính xác!" : "Chưa đúng."} Kết quả: <b>${esc(it.dap_an)}</b>${
        arr(it.giai_thich).length
          ? `<div style="margin-top:8px">${arr(it.giai_thich)
              .map(
                (x) => `<div style="margin-top:4px"><code>${esc(x.t)}</code> → ${esc(x.g)}</div>`,
              )
              .join("")}</div>`
          : ""
      }`,
    );
    if (ok) markOk(i);
  },
  "check-fill": (a) => {
    const i = +a.dataset.i,
      it = pracItem(i),
      g = $("#pg-" + i).value;
    const ok =
      normLoose(g) === normLoose(it.dap_an) ||
      normLoose(g) === normLoose(String(it.dap_an).replace(/\(\)$/, ""));
    const full = String(it.cau || "").replace("___", it.dap_an);
    fb(
      i,
      ok ? "ok" : "bad",
      `${ok ? "Chính xác!" : "Chưa đúng. Đáp án: <b>" + esc(it.dap_an) + "</b>"}${curSub().type === "ngoai_ngu" ? `<div style="margin-top:6px">${esc(full)} ${sayBtn(full)}</div>` : ""}`,
    );
    if (ok) markOk(i);
  },
  hint: (a) => {
    const i = +a.dataset.i;
    fb(i, "info", esc(hintsOf(pracItem(i)).join(" · ")));
  },
  "show-mau": (a) => {
    const i = +a.dataset.i;
    fb(i, "info", "Mẫu: " + esc(pracItem(i).mau));
  },
  grade: async (a) => {
    const i = +a.dataset.i,
      it = pracItem(i),
      g = $("#pg-" + i).value.trim();
    if (!g) {
      fb(i, "bad", "Hãy viết câu trả lời trước.");
      return;
    }
    const sub = curSub();
    fb(i, "info", "AI đang chấm…");
    try {
      const r = await aiJSON(
        `Chấm bài ${it.loai === "dich" ? "dịch" : "trả lời"} của sinh viên môn "${sub.name}". Đề: "${it.loai === "dich" ? it.cau : it.hoi}"${it.huong ? ` (${it.huong})` : ""}. Đáp án mẫu theo giáo trình: "${it.mau}". Bài làm: "${g}".
Chấm khoan dung với cách diễn đạt khác nhưng đúng ý. Nếu là ngoại ngữ, kiểm tra cả ngữ pháp, trợ từ, chính tả. Nhận xét tiếng Việt, 1-3 câu, từ dễ hiểu, chỉ ra chỗ sai cụ thể và cách sửa.
Chỉ trả về JSON: {"dung":true,"nhan_xet":"...","sua_lai":"câu đã sửa (nếu sai)"}`,
        "quick",
      );
      fb(
        i,
        r.dung ? "ok" : "bad",
        `<b>${r.dung ? "Đạt!" : "Chưa đạt."}</b> ${esc(r.nhan_xet || "")}${!r.dung && r.sua_lai ? `<div style="margin-top:6px">Sửa lại: ${esc(r.sua_lai)}</div>` : ""}<div style="margin-top:6px">Mẫu: ${esc(it.mau)} ${sub.type === "ngoai_ngu" && speakable(it.mau) ? sayBtn(it.mau) : ""}</div>`,
      );
      if (r.dung) markOk(i);
    } catch (e) {
      fb(i, "bad", esc(errMsg(e)));
    }
  },
  "try-code": async (a) => {
    const i = +a.dataset.i,
      code = $("#pe-" + i).value,
      it = pracItem(i),
      sub = curSub();
    const out = $("#pt-" + i);
    if (isJS(it.ngon_ngu)) {
      out.innerHTML = consoleHtml(await runJS(code));
      return;
    }
    aiStream(
      `Đoạn code gốc trong giáo trình môn "${sub.name}" (${it.ngon_ngu || ""}):\n${it.code}\n\nSinh viên đã sửa thành:\n${code}\n\nHãy cho biết chính xác màn hình in ra gì (dòng đầu: "Kết quả: ..."). Sau đó giải nghĩa ngắn từng dòng đã thay đổi. Nếu code bị lỗi, nói lỗi gì và vì sao, bằng từ dễ hiểu. Tiếng Việt, ngắn gọn, không markdown.`,
      out,
    );
  },
  "run-code": async (a) => {
    const i = +a.dataset.i;
    $("#po-" + i).innerHTML = consoleHtml(await runJS($("#pe-" + i).value));
  },
  "ai-check": async (a) => {
    const i = +a.dataset.i,
      it = pracItem(i),
      code = $("#pe-" + i).value;
    if (
      !code.trim() ||
      (it.loai === "sua_loi" && code.trim() === String(it.code_loi || "").trim())
    ) {
      fb(
        i,
        "bad",
        it.loai === "sua_loi" ? "Hãy sửa code trước khi nộp." : "Hãy viết code trước khi nộp.",
      );
      return;
    }
    fb(i, "info", "AI đang chấm code…");
    let run = "";
    if (isJS(it.ngon_ngu)) {
      const r = await runJS(code);
      run = (r.out || []).join("\n") + (r.err ? "\nLỗi: " + r.err : "");
      $("#po-" + i).innerHTML = consoleHtml(r);
    }
    const ref =
      it.loai === "sua_loi"
        ? `Code đúng tham khảo:\n${it.dap_an_code}`
        : `Ví dụ kiểm tra: ${JSON.stringify(arr(it.kiem_tra))}\nLời giải tham khảo (KHÔNG đưa cho sinh viên):\n${it.mau}`;
    try {
      const r = await aiJSON(
        `Bạn là giảng viên chấm bài lập trình ${it.ngon_ngu || ""} cho sinh viên mới học.
Đề: ${it.de}
${ref}
${run ? `Kết quả chạy thật code của sinh viên:\n${run}\n` : ""}Code sinh viên:
${code}

Chấm cẩn thận: tự chạy thử trong đầu với từng ví dụ kiểm tra. Chấp nhận cách giải khác nếu đúng đề.
KHÔNG viết lại lời giải đầy đủ. Nếu sai: chỉ ra dòng sai, vì sao sai, gợi ý hướng sửa. Nếu đúng: khen ngắn và gợi ý một điểm để code rõ hơn (nếu có).
Tiếng Việt, ngắn, từ dễ hiểu.
Chỉ trả về JSON: {"dat":true,"nhan_xet":"...","loi":[{"dong":1,"van_de":"..."}],"goi_y_tiep":"..."}`,
        "default",
      );
      fb(
        i,
        r.dat ? "ok" : "bad",
        `<b>${r.dat ? "Đạt!" : "Chưa đạt."}</b> ${esc(r.nhan_xet || "")}${
          arr(r.loi).length
            ? `<ul style="margin:6px 0 0;padding-left:1.2em">${arr(r.loi)
                .map(
                  (l) =>
                    `<li>${l && l.dong ? `Dòng ${esc(l.dong)}: ` : ""}${esc(l && l.van_de)}</li>`,
                )
                .join("")}</ul>`
            : ""
        }${r.goi_y_tiep ? `<div style="margin-top:6px">Gợi ý: ${esc(r.goi_y_tiep)}</div>` : ""}`,
      );
      if (r.dat) markOk(i);
    } catch (e) {
      fb(i, "bad", esc(errMsg(e)));
    }
  },
  "next-hint": (a) => {
    const i = +a.dataset.i,
      hs = hintsOf(pracItem(i)),
      k = pkey(i);
    S.hintN[k] = Math.min(hs.length, (S.hintN[k] || 0) + 1);
    $("#ph-" + i).innerHTML = `<div class="fb info">${hs
      .slice(0, S.hintN[k])
      .map((h, j) => `<div>Gợi ý ${j + 1}: ${esc(h)}</div>`)
      .join(
        "",
      )}${S.hintN[k] < hs.length ? `<div style="margin-top:4px;opacity:.8">Bấm “Gợi ý” lần nữa để xem gợi ý tiếp.</div>` : ""}</div>`;
  },
  "show-sol": (a) => {
    const i = +a.dataset.i,
      it = pracItem(i);
    fb(
      i,
      "info",
      `Lời giải tham khảo. Đọc hiểu rồi tự gõ lại không nhìn nhé:<div class="console" style="margin-top:6px">${esc(it.mau || it.dap_an_code || "")}</div>`,
    );
  },
  "p-mv": (a) => {
    const i = +a.dataset.i,
      pos = +a.dataset.pos,
      d = +a.dataset.d,
      o = S.parsons[pkey(i)];
    if (!o[pos + d] && o[pos + d] !== 0) return;
    [o[pos], o[pos + d]] = [o[pos + d], o[pos]];
    $("#pl-" + i).innerHTML = parsonsHtml(pracItem(i), i);
  },
  "p-check": (a) => {
    const i = +a.dataset.i,
      it = pracItem(i),
      o = S.parsons[pkey(i)],
      L = arr(it.dong).map((l) => String(l).trim());
    const bad = o.findIndex((li, j) => L[li] !== L[j]);
    [...$("#pl-" + i).children].forEach((r, j) => r.classList.toggle("bad", j === bad));
    if (bad < 0) {
      fb(
        i,
        "ok",
        "Đúng thứ tự! Đọc lại một lượt và tự hỏi: vì sao dòng này phải đứng trước dòng kia?",
      );
      markOk(i);
    } else
      fb(
        i,
        "bad",
        `Dòng thứ ${bad + 1} chưa đúng chỗ. Gợi ý: biến phải được tạo trước khi dùng, điều kiện đứng trước khối lệnh của nó.`,
      );
  },
  "b-pick": (a) => {
    const i = +a.dataset.i;
    S.build[pkey(i)].ans.push(+a.dataset.m);
    $("#pb-" + i).innerHTML = buildHtml(pracItem(i), i);
  },
  "b-un": (a) => {
    const i = +a.dataset.i;
    S.build[pkey(i)].ans.splice(+a.dataset.pos, 1);
    $("#pb-" + i).innerHTML = buildHtml(pracItem(i), i);
  },
  "b-reset": (a) => {
    const i = +a.dataset.i;
    S.build[pkey(i)].ans = [];
    $("#pb-" + i).innerHTML = buildHtml(pracItem(i), i);
    $("#pf-" + i).innerHTML = "";
  },
  "b-check": (a) => {
    const i = +a.dataset.i,
      it = pracItem(i),
      st = S.build[pkey(i)],
      M = arr(it.manh);
    const j = /[\u3040-\u30ff\u4e00-\u9fff]/.test(M.join("")) ? "" : " ";
    const ok =
      normLoose(st.ans.map((m) => M[m]).join(j)) === normLoose(M.join(j)) &&
      st.ans.length === M.length;
    const full = M.join(j);
    fb(
      i,
      ok ? "ok" : "bad",
      `${ok ? "Chính xác!" : "Chưa đúng."} Câu đúng: <b>${esc(full)}</b> ${speakable(full) ? sayBtn(full) : ""}`,
    );
    if (ok) markOk(i);
  },
  say: (a) => speak(a.dataset.t, a.dataset.r ? +a.dataset.r : null),
  reveal: (a) => {
    const h = a.nextElementSibling;
    if (h) h.hidden = false;
    a.remove();
  },
  said: (a) => {
    const k = a.dataset.k;
    S.said[k] = !S.said[k];
    a.classList.toggle("on", S.said[k]);
    a.textContent = S.said[k] ? "✓ Nói được" : "Nói được";
  },
  "chep-check": async () => {
    const sub = curSub(),
      b = sortedBai(sub).find((x) => x.id === S.bid);
    const ls = await lessonLines(sub, b);
    const d = ls[S.chepI];
    const g = $("#chepIn").value;
    const strip = (t) => normLoose(String(t).replace(/[(（][^)）]*[)）]/g, ""));
    const alts = String(d.doc || "")
      .split(/[\/|;,、]/)
      .map(strip)
      .filter(Boolean);
    const ok = !!g.trim() && (strip(g) === strip(d.t) || alts.includes(strip(g)));
    $("#chepFb").innerHTML =
      `<div class="fb ${ok ? "ok" : "bad"}"><b>${ok ? "Chính xác!" : "Chưa đúng."}</b> Câu đúng: ${esc(d.t)}${d.doc ? `<div>${esc(d.doc)}</div>` : ""}<div>${esc(d.g)}</div></div>`;
  },
  "chep-show": async () => {
    const sub = curSub(),
      b = sortedBai(sub).find((x) => x.id === S.bid);
    const d = (await lessonLines(sub, b))[S.chepI];
    $("#chepFb").innerHTML =
      `<div class="fb info">${esc(d.t)}${d.doc ? `<div>${esc(d.doc)}</div>` : ""}<div>${esc(d.g)}</div></div>`;
  },
  "chep-go": (a) => {
    S.chepI = (S.chepI || 0) + +a.dataset.d;
    renderMain();
  },
  "viet-go": (a) => {
    S.vietI = (S.vietI || 0) + +a.dataset.d;
    renderMain();
  },
  "viet-clear": () => {
    const c = $("#wcv");
    if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
    $("#vfb").innerHTML = "";
  },
  "viet-check": async () => {
    const w = $("#wwrap"),
      ink = $("#wcv");
    if (!w || !ink) return;
    const c = document.createElement("canvas");
    c.width = ink.width;
    c.height = ink.height;
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.fillRect(0, 0, c.width, c.height);
    const m = inkColor().match(/^#?([0-9a-f]{6})$/i);
    if (m) {
      const v = parseInt(m[1], 16);
      if (((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11 > 128)
        x.filter = "invert(1)";
    }
    x.drawImage(ink, 0, 0);
    const out = $("#vfb");
    out.innerHTML = `<div class="fb info">AI đang xem chữ của bạn…</div>`;
    try {
      const blob = await canvasBlob(c, S.imgLim && S.imgLim.maxInputBytes);
      const t = w.dataset.target,
        doc = w.dataset.doc;
      const r = await aiJSON(
        `Ảnh là chữ viết tay của sinh viên Việt Nam đang tập viết "${t}"${doc ? ` (đọc: ${doc})` : ""}. Mỗi ô vuông là một chữ, theo thứ tự từ trái sang phải.
Nhận xét bằng tiếng Việt, ngắn, dễ hiểu: viết đúng chữ chưa; nét nào sai, thiếu, thừa hoặc lệch; tỉ lệ và cân đối trong ô. Nếu là kana/kanji và thấy dấu hiệu sai hướng nét hoặc thứ tự nét thì nhắc. Ô nào trống thì nói là chưa viết.
Chỉ trả về JSON: {"dung":true,"diem":8,"nhan_xet":"...","sua":["cách sửa 1"]}`,
        "default",
        [blob],
      );
      out.innerHTML = `<div class="fb ${r.dung ? "ok" : "bad"}"><b>${r.dung ? "Viết đúng" : "Cần sửa"}${r.diem != null ? ` · ${esc(r.diem)}/10` : ""}</b> ${esc(r.nhan_xet || "")}${
        arr(r.sua).length
          ? `<ul style="margin:6px 0 0;padding-left:1.2em">${arr(r.sua)
              .map((s) => `<li>${esc(s)}</li>`)
              .join("")}</ul>`
          : ""
      }</div>`;
    } catch (e) {
      out.innerHTML = `<div class="fb bad">${esc(errMsg(e))}</div>`;
    }
  },
  "san-run": async () => {
    const code = $("#sanEd").value,
      out = $("#sanOut");
    if (!code.trim()) return;
    if (S.sanLang === "JavaScript") {
      out.innerHTML = consoleHtml(await runJS(code));
      return;
    }
    aiStream(
      `Đây là code ${S.sanLang} của sinh viên mới học:\n${code}\n\nHãy cho biết chính xác màn hình in ra gì (dòng đầu: "Kết quả: ..."). Nếu có lỗi biên dịch/chạy, nói lỗi ở dòng nào, vì sao, bằng từ dễ hiểu. Tiếng Việt, ngắn, không markdown.`,
      out,
    );
  },
  "san-explain": () => {
    const code = $("#sanEd").value;
    if (!code.trim()) return;
    aiStream(
      `Giải nghĩa TỪNG dòng code ${S.sanLang} sau cho sinh viên mới học. Mỗi dòng: chép dòng code, rồi " → " và giải nghĩa thật ngắn bằng từ dễ hiểu. Không bỏ dòng nào. Tiếng Việt, không markdown.\n\n${code}`,
      $("#sanOut"),
    );
  },
  "san-review": () => {
    const code = $("#sanEd").value;
    if (!code.trim()) return;
    aiStream(
      `Nhận xét code ${S.sanLang} sau của sinh viên mới học: chạy đúng chưa, có lỗi tiềm ẩn nào (trường hợp đặc biệt, đầu vào lạ), đặt tên biến và cách trình bày đã rõ chưa, có cách viết gọn hơn không. Không viết lại toàn bộ code; chỉ đưa đoạn nhỏ minh họa nếu cần. Tiếng Việt, ngắn, từ dễ hiểu, không markdown.\n\n${code}`,
      $("#sanOut"),
      "default",
    );
  },
  "replace-src": () => openAdd(curSub()),
  "rev-start": async () => {
    const now = Date.now();
    const due = (await allCards())
      .filter((x) => (x.c.due || 0) <= now)
      .sort((a, b) => (a.c.box || 1) - (b.c.box || 1) || (a.c.due || 0) - (b.c.due || 0))
      .slice(0, 10);
    S.review = {
      queue: due.map((x) => ({ ...x, tries: 0 })),
      flip: false,
      right: 0,
      total: due.length,
    };
    renderMain();
  },
  "rev-flip": () => {
    S.review.flip = true;
    renderMain();
  },
  "rev-ok": () => reviewAnswer(true),
  "rev-no": () => reviewAnswer(false),
  "rev-end": () => {
    S.review = null;
    renderMain();
  },
  theme: () => {
    const r = document.documentElement;
    const dark = r.dataset.theme
      ? r.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    r.dataset.theme = dark ? "light" : "dark";
    try {
      localStorage.setItem("htd_theme", r.dataset.theme);
    } catch (e) {}
  },
  "side-toggle": () => {
    document.body.classList.toggle("side-open");
    scrim();
  },
  "chat-toggle": () => {
    document.body.classList.toggle("chat-open");
    scrim();
    if (document.body.classList.contains("chat-open")) setTimeout(() => $("#chatIn").focus(), 50);
  },
  scrim: () => {
    document.body.classList.remove("side-open", "chat-open");
    scrim();
  },
  "sel-clear": () => setSel(null),
  "chat-wide": () => {
    const on = document.body.classList.toggle("chat-wide");
    $("#wideBtn").textContent = on ? "Thu nhỏ" : "Mở rộng";
    try {
      localStorage.setItem("htd_wide", on ? "1" : "");
    } catch (e) {}
  },
  sug: (a) => sendChat(a.dataset.q),
};
function scrim() {
  const on =
    document.body.classList.contains("side-open") ||
    (document.body.classList.contains("chat-open") && innerWidth <= 820);
  let s = $("#scrimEl");
  if (on && !s) {
    s = document.createElement("div");
    s.id = "scrimEl";
    s.className = "scrim";
    s.dataset.act = "scrim";
    document.body.appendChild(s);
  } else if (!on && s) s.remove();
}
function qsPair(side, i) {
  const it = QS.items[0],
    P = it.ps;
  if (!P || P.gone.includes(i)) return;
  if (side === 0) P.sl = i;
  else P.sr = i;
  if (P.sl != null && P.sr != null) {
    if (P.sl === P.sr) {
      P.gone.push(P.sl);
      speak(it.pairs[P.sl].a);
      P.sl = P.sr = null;
      if (P.gone.length === it.pairs.length) {
        it.tries = P.miss ? 1 : 0;
        it.show = "Đã ghép đúng tất cả";
        it.explain = P.miss ? `Sai ${P.miss} lần` : "";
        qsAnswer(true, -1);
        if (P.miss && QS.firstOk && it.tries) void 0;
        return;
      }
    } else {
      P.miss++;
      P.bad = [P.sl, P.sr];
      beep(false);
      P.sl = P.sr = null;
      qsRender();
      setTimeout(() => {
        P.bad = null;
        qsRender();
      }, 450);
      return;
    }
  }
  qsRender();
}
async function reviewAnswer(ok) {
  const R = S.review;
  const cur = R.queue.shift();
  const c = cur.c;
  if (ok) {
    if (!cur.tries) {
      R.right++;
      addXP(2);
      c.box = Math.min(5, (c.box || 1) + 1);
      c.due = Date.now() + BOX[c.box - 1] * DAY;
    }
  } else {
    c.box = 1;
    c.due = Date.now() + DAY;
    cur.tries++;
    R.queue.push(cur);
  }
  R.flip = false;
  put("cards_" + cur.sid, { kind: "cards", list: S.cards[cur.sid] });
  renderMain();
}

document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-act]");
  if (a) {
    e.preventDefault();
    const f = ACT[a.dataset.act];
    if (f) f(a, e);
    return;
  }
  const ln = e.target.closest(".ln");
  if (ln && !e.target.closest("summary")) {
    const s = getSelection && getSelection().toString().trim();
    if (s && s.length > 1) return;
    if (ln.classList.contains("hl")) {
      setSel(null);
      return;
    }
    setSel(ln.dataset.t, ln);
  }
});
document.addEventListener("keydown", (e) => {
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.classList &&
    e.target.classList.contains("ln")
  ) {
    e.preventDefault();
    setSel(e.target.dataset.t, e.target);
  }
  if (e.key === "Escape") {
    if ($("#addOv")) $("#layer").innerHTML = "";
    document.body.classList.remove("side-open", "chat-open");
    scrim();
  }
});
document.addEventListener("mouseup", selFromText);
document.addEventListener("touchend", () => setTimeout(selFromText, 250));
function selFromText() {
  const s = getSelection && getSelection();
  if (!s || s.isCollapsed) return;
  const t = s.toString().trim();
  if (t.length < 2 || t.length > 1500) return;
  const n =
    s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement);
  if (!n || !n.closest("#main")) return;
  setSel(t, null);
  const ln = n.closest(".ln");
  if (ln) ln.classList.add("hl");
}
document.addEventListener("change", (e) => {
  const id = e.target.id;
  if (id === "pracSel") {
    QS = null;
    S.bid = e.target.value;
    S.chepI = 0;
    S.vietI = 0;
    renderMain();
  } else if (id === "rate") S.rate = +e.target.value;
  else if (id === "mixVoice") {
    S.mixVoice = e.target.value === "1";
    try {
      localStorage.setItem("htd_mix", S.mixVoice ? "1" : "0");
    } catch (x) {}
    if (VP.playing && !VP.paused) {
      VP.su = null;
      speechSynthesis.cancel();
      clearTimeout(VP.tm);
      VP.li = Math.max(-1, VP.li - 1);
      VP.tm = setTimeout(vpStep, 200);
    }
    vpRender();
  } else if (id === "rdVoice") {
    S.rdVoice = e.target.value;
    try {
      localStorage.setItem("htd_voice", S.rdVoice);
    } catch (x) {}
    if (RD.playing && !RD.paused) {
      const it = RD.list[RD.i] || {};
      rdStart(RD.key, it.pi || 0, it.ci || 0);
    }
  } else if (id === "rdRate") {
    S.rdRate = +e.target.value;
    try {
      localStorage.setItem("htd_rate", S.rdRate);
    } catch (x) {}
    if (VP.playing && !VP.paused) {
      VP.su = null;
      speechSynthesis.cancel();
      clearTimeout(VP.tm);
      VP.li = Math.max(-1, VP.li - 1);
      VP.tm = setTimeout(vpStep, 200);
    }
    if (RD.playing && !RD.paused) {
      const it = RD.list[RD.i] || {};
      rdStart(RD.key, it.pi || 0, it.ci || 0);
    }
  } else if (id === "hideTx") {
    S.hideTx = e.target.checked;
    renderMain();
  } else if (id === "tplTg") {
    S.showTpl = e.target.checked;
    drawWriteBg();
  } else if (id === "sanLang") {
    S.sanLang = e.target.value;
    S.sanCode = $("#sanEd").value;
    renderMain();
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "sanEd") S.sanCode = e.target.value;
});
document.addEventListener("keydown", (e) => {
  if (QS && !QS.finished && $("#qsBox") && e.target.id !== "chatIn") {
    const typing = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA";
    if (!typing && /^[1-6]$/.test(e.key)) {
      const b = document.querySelector(`#qsBox .qopt[data-j="${+e.key - 1}"]`);
      if (b && !b.disabled) {
        e.preventDefault();
        b.click();
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      const n = $("#qsNext") || $("#qsCheck");
      if (n && (typing ? e.target.id === "qsIn" : true) && document.activeElement !== n) {
        e.preventDefault();
        n.click();
        return;
      }
    }
  }
  if (
    e.key === "Tab" &&
    !e.shiftKey &&
    e.target.classList &&
    e.target.classList.contains("code-ed")
  ) {
    e.preventDefault();
    const t = e.target,
      s = t.selectionStart;
    t.setRangeText("    ", s, t.selectionEnd, "end");
  }
  if (e.key === "Enter" && e.target.id === "chepIn") {
    e.preventDefault();
    ACT["chep-check"]();
  }
});
$("#chatForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#chatIn").value;
  $("#chatIn").value = "";
  $("#chatIn").style.height = "46px";
  sendChat(v);
});
const grow = () => {
  const t = $("#chatIn");
  t.style.height = "46px";
  t.style.height = Math.min(160, t.scrollHeight + 2) + "px";
};
$("#chatIn").addEventListener("input", grow);
$("#chatIn").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("#chatForm").requestSubmit();
  }
});
