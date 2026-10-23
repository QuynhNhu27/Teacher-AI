/* Trang bài học: giải nghĩa từng dòng, xem đoạn gốc, tóm tắt. */
"use strict";

function lnHtml(t, n, mono, doc, say) {
  return `<div class="ln ${mono ? "mono" : ""}" data-t="${esc(t)}" tabindex="0"><span class="no">${n || ""}</span><span class="tx">${esc(t)}</span>${say && speakable(t) ? sayBtn(t) : ""}${doc ? `<span class="doc">${esc(doc)}</span>` : ""}</div>`;
}
const VIET = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỷỹỵ]/i;
const CODEISH =
  /[=;{}\[\]]|\w\(.*\)|^\s{2,}\S|^\s*(def|class|for|while|if|elif|else|return|import|from|print|int|void|public|private|static|#include|let|const|var|function|try|except|catch|switch|case|break|continue|SELECT|INSERT|UPDATE|CREATE)\b/;
function isCodeLine(t) {
  if (!t || !t.trim()) return false;
  if (/^\s*(#|\/\/|\/\*|\*)/.test(t)) return true;
  if (/^\s*([•\-*]|\d+[.)])\s/.test(t)) return false;
  return !VIET.test(t.replace(/(#|\/\/).*$/, "")) && CODEISH.test(t);
}
function srcHtml(lines, b, mono, say) {
  let o = "";
  for (let i = b.tu; i <= b.den; i++) {
    const t = lines[i - 1] ?? "";
    o += lnHtml(t, i, mono && isCodeLine(t), "", say && !!t.trim());
  }
  return `<div class="src">${o}</div>`;
}

async function pBai(sub) {
  const bs = sortedBai(sub);
  if (!bs.length) {
    const lines = await getLines(sub);
    const nc = lines.filter((l) => l.trim()).length;
    return `<div class="stack"><div class="card empty"><h2>Chưa có bài nào</h2>
      <p class="note">${nc ? `Giáo trình có ${nc} dòng chữ nhưng chưa được chia thành bài.` : "Không đọc được chữ nào từ giáo trình. Nếu là PDF dạng ảnh scan, hãy dán chữ vào thay vì tải file."}</p>
      ${nc ? `<div class="row" style="justify-content:center"><button class="btn" data-act="re-outline" ${S.ai && !S.busy ? "" : "disabled"}>Chia bài lại bằng AI</button><button class="btn soft" data-act="auto-split">Tự chia theo đề mục</button></div>` : ""}</div>
      ${nc ? `<details class="sec src-wrap" open><summary><span class="chip t-sky">Xem giáo trình đã đọc</span><span class="note">${nc} dòng</span></summary>${srcHtml(lines, { tu: 1, den: Math.min(lines.length, 400) }, sub.type === "lap_trinh")}</details>` : ""}</div>`;
  }
  let b = bs.find((x) => x.id === S.bid);
  if (!b) {
    b = bs[0];
    S.bid = b.id;
  }
  const idx = bs.indexOf(b),
    lines = await getLines(sub),
    L = await getLesson(sub.sid, b.id),
    mono = sub.type === "lap_trinh",
    lang = sub.type === "ngoai_ngu";
  let steps = "";
  if (L) {
    const p = prOf(sub, b.id);
    const cs = (await loadCards(sub.sid)).filter((c) => c.id.startsWith(b.id + ":"));
    const due = cs.filter((c) => (c.due || 0) <= Date.now()).length;
    steps = `<div class="steps"><span class="step ok">1 · Đọc hiểu ✓</span><button class="step ${p.n && p.ok.length >= Math.ceil(p.n * 0.7) ? "ok" : ""}" data-act="tab" data-tab="luyen">2 · Luyện ${p.n ? p.ok.length + "/" + p.n + " bài" : "→ bắt đầu"}</button><button class="step ${cs.length && !due ? "ok" : ""}" data-act="tab" data-tab="on">3 · Ôn thẻ: ${due} thẻ đến hạn</button></div>`;
  }
  const nav = `<div class="row" style="justify-content:space-between;margin-top:6px">${idx > 0 ? `<button class="btn ghost" data-act="pick-les" data-bid="${bs[idx - 1].id}">← Bài trước</button>` : "<span></span>"}${idx < bs.length - 1 ? `<button class="btn ghost" data-act="pick-les" data-bid="${bs[idx + 1].id}">Bài sau →</button>` : ""}</div>`;
  const hd = `<div class="lh"><div><div class="label">Bài ${idx + 1} / ${bs.length}</div><h2>${esc(b.ten)}</h2><div class="rg">dòng ${b.tu}–${b.den} trong giáo trình</div>${steps}</div>
    ${L ? `<div class="row"><button class="btn ${sub.done && sub.done[b.id] ? "soft" : ""}" data-act="mark-done">${sub.done && sub.done[b.id] ? "✓ Đã học" : "Đánh dấu đã học"}</button><button class="btn ghost" data-act="regen">Giải nghĩa lại</button></div>` : ""}</div>`;
  const src = `<details class="sec src-wrap" ${L ? "" : "open"}><summary><span class="chip t-sky">Xem đoạn gốc</span><span class="note">Chạm vào dòng nào để tô vàng và hỏi AI</span></summary>${srcHtml(lines, b, mono, lang)}</details>`;
  if (!L) {
    const gen = S.busy && S.busy.bid === b.id;
    return `<div class="stack">${hd}<div class="card empty"><h2>Bài này chưa được giải nghĩa</h2><p class="note">AI sẽ đọc đúng ${b.den - b.tu + 1} dòng của bài này và giải nghĩa từng dòng.</p>
      <div class="row" style="justify-content:center"><button class="btn" data-act="gen-les" ${gen || !S.ai ? "disabled" : ""}>Giải nghĩa bài này</button></div>${S.ai ? "" : `<p class="note">AI chỉ chạy khi mở trang trong claude.ai.</p>`}</div>${src}${nav}</div>`;
  }
  const items = itemsOf(sub, b),
    missIds = arr(sub.miss && sub.miss[b.id]);
  const sec = (c, title, inner) =>
    inner
      ? `<section class="sec"><div class="sh"><span class="chip t-${c}">${title}</span></div>${inner}</section>`
      : "";
  const list = (a) =>
    arr(a).length
      ? `<ul>${arr(a)
          .map((x) => `<li>${esc(x)}</li>`)
          .join("")}</ul>`
      : "";
  const terms = arr(L.thuat_ngu).length
    ? `<div class="terms">${arr(L.thuat_ngu)
        .map(
          (x) =>
            `<div class="term ln" data-t="${esc(x.tu + (x.doc ? " (" + x.doc + ")" : "") + ": " + x.nghia)}" tabindex="0" style="display:block"><b>${esc(x.tu)} ${lang && speakable(x.tu) ? sayBtn(x.tu) : ""}</b>${x.doc ? `<span class="doc">${esc(x.doc)}</span>` : ""}<div class="mn">${esc(x.nghia)}</div></div>`,
        )
        .join("")}</div>`
    : "";
  const ex = arr(L.vi_du)
    .map(
      (v) =>
        `<div class="exttl">${esc(v.tieu_de || "Ví dụ")}</div><div class="ex">${arr(v.dong)
          .map(
            (d) =>
              `<div class="ex-row">${lnHtml(d.t, d.n, mono, d.doc, lang)}<div class="gl">${esc(d.g)}</div></div>`,
          )
          .join("")}</div>`,
    )
    .join("");
  const qa = arr(L.hoi)
    .map(
      (q) =>
        `<details class="qa"><summary>${esc(q.q)}</summary><div class="ans">${esc(q.a)}</div></details>`,
    )
    .join("");
  const missHtml = missIds.length
    ? `<div class="miss">AI báo chưa phủ: ${missIds
        .map((id) => {
          const m = items.find((x) => x.id === id);
          return esc(m ? m.ten : id);
        })
        .join(
          ", ",
        )}. <button class="btn danger" data-act="regen" style="margin-left:6px;padding:4px 10px">Bổ sung</button></div>`
    : "";
  const moRong = arr(L.mo_rong).length
    ? sec(
        "sky",
        "Mở rộng ngoài giáo trình",
        `<p class="note" style="margin:0 0 8px">Kiến thức liên quan hay gặp khi thi, do AI bổ sung. Nên đối chiếu với giảng viên.</p><ul>${arr(
          L.mo_rong,
        )
          .map(
            (x) =>
              `<li>${esc(x.y)}${x.vi_sao ? ` <span class="note">(${esc(x.vi_sao)})</span>` : ""}</li>`,
          )
          .join("")}</ul>`,
      )
    : "";
  const vidHtml = arr(L.video).length
    ? `<section class="sec" style="padding:12px"><div class="row" style="justify-content:space-between;margin:0 4px 10px"><span class="chip t-peach">Video bài giảng</span><button class="btn ghost" data-act="gen-video" ${S.ai && !S.busy ? "" : "disabled"} style="padding:5px 10px;font-size:.8rem">Soạn lại bài giảng</button></div>${videoHtml(`vid:${sub.sid}:${b.id}`, L.video)}</section>`
    : `<section class="sec"><div class="row" style="justify-content:space-between"><div style="flex:1;min-width:220px"><span class="chip t-peach">Video bài giảng</span><p class="note" style="margin:6px 0 0">Thầy cô AI giảng trên bảng như video YouTube: mở đầu gợi tò mò, giảng từng ý kèm ví dụ, viết bảng từng dòng, có phụ đề, câu hỏi nhanh giữa bài và tổng kết cuối bài.</p></div><button class="btn" data-act="gen-video" ${S.ai && !S.busy ? "" : "disabled"}>Tạo video bài giảng</button></div></section>`;
  const cta = lang
    ? `<div class="cta"><div><b>Học nhanh 5 phút</b><div style="font-size:.88rem">Chọn nghĩa, nghe chọn từ, ghép cặp, xếp câu, nghe và gõ lại. Được tính điểm XP và chuỗi ngày học.</div></div><button class="btn" data-act="go-nhanh">Bắt đầu</button></div>`
    : "";
  const gp = arr(L.ngu_phap).length
    ? sec(
        "lilac",
        "Ngữ pháp",
        arr(L.ngu_phap)
          .map(
            (g) =>
              `<div class="gp"><div class="gp-h"><b>${esc(g.mau)}</b> ${speakable(g.mau) ? "" : ""}<div style="font-size:.9rem">${esc(g.nghia)}</div></div><div class="gp-b">${g.cach_dung ? `<div class="note">${esc(g.cach_dung)}</div>` : ""}${arr(
                g.vi_du,
              )
                .map(
                  (v) =>
                    `<div class="ex-row" style="border:1px solid var(--line);border-radius:10px;overflow:hidden">${lnHtml(v.t, "", false, v.doc, true)}<div class="gl">${esc(v.g)}</div></div>`,
                )
                .join("")}</div></div>`,
          )
          .join(""),
      )
    : "";
  return `<div class="stack">${hd}${missHtml}${cta}
    ${sec("sky", "Mục tiêu", list(L.muc_tieu))}
    ${vidHtml}
    ${sec("lilac", "Cốt lõi", list(L.cot_loi))}
    ${sec("butter", lang ? "Từ vựng" : "Thuật ngữ", terms)}
    ${gp}
    ${sec("mint", sub.type === "ngoai_ngu" ? "Giải nghĩa từng câu" : "Giải nghĩa từng dòng", ex)}
    ${moRong}
    ${sec("pink", "Lỗi hay gặp", arr(L.loi).length ? list(L.loi) : `<p class="note">Giáo trình không nêu lỗi hay gặp ở phần này.</p>`)}
    ${sec("peach", "Tự kiểm tra", qa)}
    ${src}${nav}</div>`;
}

async function pPhu(sub) {
  const lines = await getLines(sub),
    c = coverage(sub, lines);
  const bs = sortedBai(sub);
  const pct = (x) => (c.content ? Math.round((x / c.content) * 100) : 0);
  const gapN = c.gaps.reduce((a, g) => a + g.den - g.tu + 1, 0);
  const lessonOf = (m) => bs.find((b) => m.tu >= b.tu && m.tu <= b.den);
  const rows = arr(sub.outline.muc)
    .map((m) => {
      const b = lessonOf(m);
      let st, cl;
      if (!b) {
        st = "Không thuộc bài nào";
        cl = "pink";
      } else if (!(sub.ready && sub.ready[b.id])) {
        st = "Chưa giải nghĩa";
        cl = "butter";
      } else if (arr(sub.miss && sub.miss[b.id]).includes(m.id)) {
        st = "AI báo thiếu";
        cl = "pink";
      } else {
        st = "Đã phủ";
        cl = "mint";
      }
      return `<tr><td>${esc(m.ten)}</td><td class="n">${m.tu}–${m.den}</td><td>${b ? `<button class="sug" data-act="pick-les" data-bid="${b.id}">${bs.indexOf(b) + 1}. ${esc(b.ten)}</button>` : "—"}</td><td><span class="chip t-${cl}">${st}</span></td></tr>`;
    })
    .join("");
  const done = arr(sub.outline.muc).filter((m) => {
    const b = lessonOf(m);
    return b && sub.ready && sub.ready[b.id] && !arr(sub.miss && sub.miss[b.id]).includes(m.id);
  }).length;
  return `<div class="stack">
    <div class="card"><div class="row" style="justify-content:space-between;align-items:flex-end">
      <div><div class="label">Mục đã được giải nghĩa</div><div class="big">${done} / ${arr(sub.outline.muc).length}</div></div>
      <div style="text-align:right"><div class="label">Dòng chưa thuộc bài nào</div><div class="big" style="color:${gapN ? "var(--bad)" : "var(--ok)"}">${gapN}</div></div></div>
      <div class="meter" style="margin-top:12px" aria-label="Độ phủ theo dòng"><i style="width:${pct(c.gen)}%;background:var(--ok)"></i><i style="width:${pct(c.cov - c.gen)}%;background:var(--accent);opacity:.45"></i><i style="width:${pct(c.skip)}%;background:var(--muted);opacity:.35"></i><i style="width:${pct(gapN)}%;background:var(--bad)"></i></div>
      <div class="legend"><span style="--c:var(--ok)">Đã giải nghĩa ${pct(c.gen)}%</span><span style="--c:var(--accent)">Có bài, chưa giải nghĩa ${pct(c.cov - c.gen)}%</span><span style="--c:var(--muted)">Bỏ qua ${pct(c.skip)}%</span><span style="--c:var(--bad)">Chưa thuộc bài ${pct(gapN)}%</span></div></div>
    ${
      c.gaps.length
        ? `<section class="sec"><div class="sh"><span class="chip t-pink">Đoạn có thể bị sót</span></div><div class="stack">${c.gaps
            .map(
              (g) =>
                `<div><div class="row" style="justify-content:space-between"><span class="note">Dòng ${g.tu}–${g.den}</span><button class="btn soft" data-act="extra-les" data-tu="${g.tu}" data-den="${g.den}">Tạo bài bổ sung</button></div><div class="src" style="max-height:160px">${(() => {
                  let o = "";
                  for (let i = g.tu; i <= Math.min(g.den, g.tu + 8); i++)
                    o += lnHtml(lines[i - 1] ?? "", i, sub.type === "lap_trinh");
                  return o;
                })()}</div></div>`,
            )
            .join("")}</div></section>`
        : ""
    }
    ${
      arr(sub.outline.bo_qua).length
        ? `<section class="sec"><div class="sh"><span class="chip t-sky">AI đã bỏ qua</span></div><ul>${arr(
            sub.outline.bo_qua,
          )
            .map((x) => `<li><span class="note">Dòng ${x.tu}–${x.den}:</span> ${esc(x.ly_do)}</li>`)
            .join("")}</ul></section>`
        : ""
    }
    <section class="sec"><div class="sh"><span class="chip t-lilac">Các mục trong giáo trình</span></div><div class="tw"><table class="tbl"><thead><tr><th>Mục</th><th>Dòng</th><th>Bài</th><th>Trạng thái</th></tr></thead><tbody>${rows || `<tr><td colspan="4" class="note">Chưa có mục.</td></tr>`}</tbody></table></div></section></div>`;
}
