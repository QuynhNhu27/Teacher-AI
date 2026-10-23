/* Khung hỏi AI về bài và chọn dòng (tô vàng) để hỏi. */
"use strict";

/* ---------- Chat ---------- */
function chatKey() {
  return (S.sid || "") + "/" + (S.bid || "");
}
function renderChat() {
  const sel = S.sel;
  $("#selWrap").innerHTML = sel
    ? `<div class="selbox"><div class="label" style="color:inherit;opacity:.8;margin-bottom:4px">Đang hỏi về</div><div class="q">${esc(sel.text)}</div><button class="x" data-act="sel-clear" aria-label="Bỏ chọn">×</button></div>`
    : "";
  const msgs = S.chats[chatKey()] || [];
  $("#msgs").innerHTML = msgs.length
    ? msgs
        .map(
          (m, i) =>
            `<div class="msg ${m.role === "user" ? "u" : "a"}" data-mi="${i}">${m.quote ? `<span class="qt">${esc(m.quote)}</span>` : ""}${esc(m.show || m.content)}</div>`,
        )
        .join("")
    : `<p class="note" style="margin:0">Chạm vào một dòng hoặc bôi đen một câu trong bài, dòng đó sẽ được tô vàng. Sau đó hỏi ở đây. AI chỉ trả lời dựa trên giáo trình của bạn.</p>`;
  $("#msgs").scrollTop = $("#msgs").scrollHeight;
  const sugs = sel
    ? ["Giải thích dòng này", "Cho ví dụ trong giáo trình", "Dòng này hay sai ở đâu?"]
    : ["Tóm tắt bài này", "Ý nào quan trọng nhất?"];
  $("#sugs").innerHTML = sugs
    .map((s) => `<button class="sug" data-act="sug" data-q="${esc(s)}">${s}</button>`)
    .join("");
  $("#fabTx").textContent = sel ? "Hỏi về dòng tô vàng" : "Hỏi AI";
  $("#fab").classList.toggle("hasSel", !!sel);
}
async function sendChat(q) {
  q = q.trim();
  if (!q) return;
  const sub = curSub();
  if (!sub) {
    toast("Hãy chọn một môn trước.");
    return;
  }
  if (!S.ai) {
    toast("AI chỉ chạy khi mở trang trong claude.ai.", "bad");
    return;
  }
  const key = chatKey();
  const msgs = (S.chats[key] = S.chats[key] || []);
  const bs = sortedBai(sub),
    b = bs.find((x) => x.id === S.bid) || bs[0];
  const lines = await getLines(sub);
  const ctx = b ? numbered(lines, b.tu, b.den) : numbered(lines, 1, Math.min(lines.length, 300));
  const quote = S.sel ? S.sel.text : "";
  const content =
    (quote ? `Dòng/câu đang được chọn:\n"""\n${quote}\n"""\n\n` : "") + "Câu hỏi: " + q;
  const first = `Bạn là trợ giảng môn "${sub.name}" (loại: ${T(sub.type).n}). Bài đang học: "${b ? b.ten : ""}".
Trả lời tiếng Việt, ngắn gọn, từ dễ hiểu. Chỉ dựa vào đoạn giáo trình bên dưới. Nếu giáo trình không có thông tin, nói rõ "Giáo trình không nói về điều này" và không bịa. Không dùng markdown phức tạp.

ĐOẠN GIÁO TRÌNH:
${ctx}

`;
  msgs.push({ role: "user", content, show: q, quote });
  const reply = { role: "assistant", content: "…" };
  msgs.push(reply);
  renderChat();
  const bubble = $("#msgs").lastElementChild;
  $("#chatSend").disabled = true;
  const input = msgs
    .slice(0, -1)
    .map((m, i) => ({ role: m.role, content: i === 0 ? first + m.content : m.content }));
  try {
    const r = await S.ai(input, {
      cache: false,
      onText: (u) => {
        reply.content = u.text;
        if (bubble) bubble.textContent = u.text;
        $("#msgs").scrollTop = $("#msgs").scrollHeight;
      },
    });
    reply.content = r.text;
  } catch (e) {
    reply.content = (e && e.text) || "⚠ " + errMsg(e);
  }
  $("#chatSend").disabled = false;
  renderChat();
}

/* ---------- chọn dòng, tô vàng ---------- */
function setSel(text, el) {
  document.querySelectorAll(".ln.hl").forEach((x) => x.classList.remove("hl"));
  S.sel = text ? { text: String(text).slice(0, 1500) } : null;
  if (el && text) el.classList.add("hl");
  renderChat();
}
function reapplyHl() {
  if (!S.sel) return;
  for (const el of document.querySelectorAll("#main .ln"))
    if (el.dataset.t === S.sel.text) {
      el.classList.add("hl");
      break;
    }
}
