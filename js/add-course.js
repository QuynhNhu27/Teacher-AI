/* Thêm môn học mới: chọn file hoặc dán chữ, chọn khoảng trang. */
"use strict";

/* ---------- thêm môn ---------- */
function openAdd(rep) {
  const r = rep && !rep.sample ? rep : null;
  $("#layer").innerHTML =
    `<div class="ov" id="addOv"><form class="dlg" id="addForm" novalidate data-rep="${r ? esc(r.sid) : ""}">
    <h2>${r ? "Thay giáo trình" : "Thêm môn học"}</h2>
    ${r ? `<p class="note" style="margin:0">Giáo trình mới sẽ thay giáo trình cũ của “${esc(r.name)}”. Bài, bài tập và thẻ cũ của môn này sẽ bị xóa.</p>` : ""}
    <div class="fld"><label for="fName">Tên môn</label><input class="inp" id="fName" required value="${r ? esc(r.name) : ""}" placeholder="Ví dụ: Tiếng Nhật N5, Cấu trúc dữ liệu và giải thuật"></div>
    <div class="fld"><span style="font-weight:600;font-size:.88rem">Loại môn</span><div class="types">${Object.entries(
      TYPES,
    )
      .map(
        ([k, t], i) =>
          `<input type="radio" name="ftype" id="ft-${k}" value="${k}" ${(r ? r.type === k : i === 0) ? "checked" : ""}><label for="ft-${k}" class="t-${t.c}">${t.n}</label>`,
      )
      .join("")}</div></div>
    <div class="fld"><label for="fFile">Tải giáo trình: PowerPoint (pptx), Word (docx), PDF, txt, hoặc ảnh chụp trang sách</label><div class="drop" id="drop"><input type="file" id="fFile" accept=".txt,.md,.markdown,.docx,.pptx,.pdf,image/*,text/plain" multiple><div id="fInfo" style="margin-top:6px">Hoặc kéo thả file vào đây</div></div></div>
    <div class="fld" id="pdfRange" hidden><span style="font-weight:600;font-size:.88rem">Chỉ đọc phần cần học</span><div class="row"><span>Từ trang</span><input class="inp" type="number" id="fFrom" min="1" value="1" style="width:90px"><span>đến trang</span><input class="inp" type="number" id="fTo" min="1" style="width:90px"><span class="note" id="pdfNote"></span></div></div>
    <div class="fld"><label for="fText">Hoặc dán nội dung giáo trình</label><textarea class="inp" id="fText" rows="6" placeholder="Dán chữ trong giáo trình vào đây…"></textarea></div>
    <p class="note" style="margin:0">PDF dạng ảnh scan và ảnh chụp: AI sẽ đọc chữ trên ảnh trước, mất khoảng 10–20 giây mỗi trang.</p>
    <div id="fErr"></div><div id="fProg"></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-act="add-close">Hủy</button><button type="submit" class="btn" id="fGo">${r ? "Đọc lại & chia bài" : "Tạo môn & chia bài"}</button></div>
  </form></div>`;
  const drop = $("#drop"),
    fi = $("#fFile");
  ["dragover", "dragenter"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("on");
    }),
  );
  ["dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove("on");
    }),
  );
  drop.addEventListener("drop", (e) => {
    if (e.dataTransfer.files.length) {
      fi.files = e.dataTransfer.files;
      showFiles();
    }
  });
  fi.addEventListener("change", showFiles);
  function showFiles() {
    $("#fInfo").textContent =
      [...fi.files].map((f) => f.name).join(", ") || "Hoặc kéo thả file vào đây";
    if (!$("#fName").value && fi.files[0])
      $("#fName").value = fi.files[0].name.replace(/\.[^.]+$/, "");
    const pdf = [...fi.files].find((f) => /\.pdf$/i.test(f.name));
    $("#pdfRange").hidden = !pdf;
    if (pdf)
      openPdf(pdf)
        .then((d) => {
          $("#fTo").value = d.numPages;
          $("#fTo").max = d.numPages;
          $("#fFrom").max = d.numPages;
          $("#pdfNote").textContent = `PDF có ${d.numPages} trang`;
        })
        .catch(() => {});
  }
  $("#addForm").addEventListener("submit", submitAdd);
  setTimeout(() => $("#fName").focus(), 30);
}
async function submitAdd(e) {
  e.preventDefault();
  const repSid = $("#addForm").dataset.rep;
  const label = repSid ? "Đọc lại & chia bài" : "Tạo môn & chia bài";
  const name = $("#fName").value.trim(),
    type = (document.querySelector('input[name="ftype"]:checked') || {}).value || "khac",
    files = [...$("#fFile").files];
  const prog = (m) => {
    const el = $("#fProg");
    if (el)
      el.innerHTML = `<div class="status"><span class="spin"></span><span>${esc(m)}</span></div>`;
  };
  const fail = (m) => {
    $("#fGo").disabled = false;
    $("#fGo").textContent = label;
    $("#fProg").innerHTML = "";
    $("#fErr").innerHTML = `<div class="fb bad">${esc(m)}</div>`;
  };
  if (!name) return fail("Hãy nhập tên môn.");
  $("#fGo").disabled = true;
  $("#fGo").textContent = "Đang đọc…";
  $("#fErr").innerHTML = "";
  let text = $("#fText").value;
  try {
    for (const f of files) {
      text +=
        "\n" +
        (await readFile(f, { from: +$("#fFrom").value || 1, to: +$("#fTo").value || 0 }, prog));
    }
  } catch (x) {
    return fail(x && x.code ? errMsg(x) : x.message || String(x));
  }
  text = cleanText(text);
  const uniq = new Set(
    text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  );
  if (text.length < 20 || uniq.size < 4)
    return fail(
      "Chỉ đọc được rất ít chữ. Nếu là PDF scan, hãy mở trang trong claude.ai để AI đọc ảnh, hoặc dán chữ vào ô bên trên.",
    );
  if (!S.ai) return fail("AI chưa sẵn sàng. Hãy mở trang trong claude.ai và đăng nhập.");
  prog("Đang lưu giáo trình…");
  let sub;
  if (repSid) {
    sub = S.subjects.find((s) => s.sid === repSid);
    if (!sub) return fail("Không tìm thấy môn cần thay.");
    const old = [];
    for (let k = 0; k < (sub.parts || 1); k++) old.push(`src_${sub.sid}_${k}`);
    arr(sub.outline && sub.outline.bai).forEach((b) =>
      old.push(`les_${sub.sid}_${b.id}`, `prac_${sub.sid}_${b.id}`),
    );
    for (const id of old) await del(id);
    [S.lessons, S.prac].forEach((o) =>
      Object.keys(o).forEach((k) => {
        if (k.startsWith(sub.sid + "/")) delete o[k];
      }),
    );
    S.cards[sub.sid] = [];
    put("cards_" + sub.sid, { kind: "cards", list: [] });
    sub.name = name;
    sub.type = type;
  } else sub = { kind: "subject", sid: newId(), created: Date.now() };
  const sid = sub.sid,
    CH = 60000,
    parts = Math.ceil(text.length / CH);
  for (let k = 0; k < parts; k++)
    put(`src_${sid}_${k}`, { kind: "source", text: text.slice(k * CH, (k + 1) * CH) });
  Object.assign(sub, {
    name,
    type,
    nlines: text.split("\n").length,
    parts,
    outline: null,
    ready: {},
    done: {},
    miss: {},
    pr: {},
  });
  S.sources[sid] = text.split("\n");
  if (!repSid) S.subjects.push(sub);
  await saveSub(sub);
  $("#layer").innerHTML = "";
  S.sid = sid;
  S.bid = null;
  S.tab = "bai";
  S.confirmDel = false;
  document.body.classList.remove("side-open");
  try {
    await buildOutline(sub);
    const first = sortedBai(sub)[0];
    S.busy = null;
    if (first) {
      S.bid = first.id;
      await runGen(first.id);
    } else renderMain();
  } catch (x) {
    S.busy = null;
    toast(errMsg(x), "bad");
    renderMain();
  }
}
