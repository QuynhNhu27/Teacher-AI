/* Đọc giáo trình: PDF (pdf.js), Word (mammoth), PowerPoint (JSZip), ảnh scan; lọc watermark. */
"use strict";

/* ---------- đọc giáo trình ---------- */
function loadScript(src, test) {
  return new Promise((ok, no) => {
    if (test()) return ok();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => ok();
    s.onerror = () => no(new Error("Không tải được thư viện đọc file"));
    document.head.appendChild(s);
  });
}
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
async function openPdf(f) {
  await loadScript(PDFJS + "pdf.worker.min.js", () => window.pdfjsWorker);
  await loadScript(PDFJS + "pdf.min.js", () => window.pdfjsLib);
  return await window.pdfjsLib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
}
async function pdfLines(pdf, p) {
  const tc = await (await pdf.getPage(p)).getTextContent();
  let line = "",
    lastY = null;
  const ls = [];
  for (const it of tc.items) {
    const y = it.transform ? Math.round(it.transform[5]) : null;
    if (lastY !== null && y !== lastY) {
      ls.push(line);
      line = "";
    }
    line += it.str;
    lastY = y;
    if (it.hasEOL) {
      ls.push(line);
      line = "";
      lastY = null;
    }
  }
  if (line) ls.push(line);
  return ls;
}
function stripNoise(pages) {
  const cnt = {};
  pages.forEach((ls) =>
    new Set(ls.map((l) => l.trim())).forEach((l) => {
      cnt[l] = (cnt[l] || 0) + 1;
    }),
  );
  const lim = Math.max(3, Math.ceil(pages.length * 0.3));
  return pages.map((ls) =>
    ls.filter((l) => {
      const t = l.trim();
      if (!t) return false;
      if (
        t.length < 16 &&
        /\d/.test(t) &&
        /^[\s\d\-–—\/.()]*(ページ|頁|page|trang|p\.)?[\s\d\-–—\/.()]*$/i.test(t)
      )
        return false;
      if (pages.length >= 4 && cnt[t] >= lim && t.length < 60) return false;
      return true;
    }),
  );
}
async function canvasBlob(c, maxBytes) {
  let q = 0.85,
    b = await new Promise((r) => c.toBlob(r, "image/jpeg", q));
  while (maxBytes && b && b.size > maxBytes && q > 0.4) {
    q -= 0.15;
    b = await new Promise((r) => c.toBlob(r, "image/jpeg", q));
  }
  return b;
}
async function pageBlob(pdf, p, maxBytes) {
  const page = await pdf.getPage(p);
  const v0 = page.getViewport({ scale: 1 });
  const scale = Math.min(2.2, 1800 / Math.max(v0.width, v0.height));
  const vp = page.getViewport({ scale });
  const c = document.createElement("canvas");
  c.width = Math.floor(vp.width);
  c.height = Math.floor(vp.height);
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: x, viewport: vp }).promise;
  return canvasBlob(c, maxBytes);
}
async function imageBlob(f, maxBytes) {
  const bmp = await createImageBitmap(f);
  const s = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(bmp, 0, 0, c.width, c.height);
  return canvasBlob(c, maxBytes);
}
const OCR_PROMPT = (
  n,
) => `Đây là ${n} trang ảnh của một giáo trình, theo đúng thứ tự. Hãy chép lại NGUYÊN VĂN toàn bộ chữ trên các trang.
- Giữ xuống dòng, đề mục, danh sách. Bảng: mỗi hàng một dòng, các ô cách nhau bằng " | ".
- Giữ nguyên ngôn ngữ gốc (chữ Nhật, tiếng Anh, code, công thức).
- Kanji có furigana: ghi kanji rồi furigana trong ngoặc, ví dụ 学生(がくせい).
- Bỏ watermark, tên website, số trang, header/footer lặp lại.
- Không dịch, không giải thích, không thêm chữ nào khác.`;
async function ocr(getBlob, count, progress) {
  if (!S.ai || !S.imgLim)
    throw new Error(
      "Giáo trình này là ảnh scan, không có lớp chữ. AI chỉ đọc được ảnh khi trang mở trong claude.ai. Bạn cũng có thể dán chữ vào ô bên dưới.",
    );
  const per = Math.max(1, Math.min(3, S.imgLim.maxCount || 1));
  const out = [];
  for (let i = 0; i < count; i += per) {
    progress && progress(`AI đang đọc ảnh trang ${i + 1}–${Math.min(count, i + per)} / ${count}…`);
    const blobs = [];
    for (let k = i; k < Math.min(count, i + per); k++) blobs.push(await getBlob(k));
    const r = await S.ai(OCR_PROMPT(blobs.length), { images: blobs, modelTier: "default" });
    out.push(String(r.text || "").trim());
  }
  return out.join("\n");
}
async function readFile(f, opt, progress) {
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  opt = opt || {};
  if (["txt", "md", "markdown", "csv"].includes(ext) || f.type.startsWith("text/"))
    return await f.text();
  if (ext === "pptx") {
    progress && progress("Đang đọc file PowerPoint…");
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
      () => window.JSZip,
    );
    const zip = await window.JSZip.loadAsync(await f.arrayBuffer());
    const num = (n) => +(n.match(/(\d+)\.xml$/) || [0, 0])[1];
    const slides = Object.keys(zip.files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => num(a) - num(b));
    const dp = new DOMParser();
    const textOf = (xml) => {
      const d = dp.parseFromString(xml, "application/xml");
      return [...d.getElementsByTagName("a:p")]
        .map((p) => [...p.getElementsByTagName("a:t")].map((t) => t.textContent).join(""))
        .filter((t) => t.trim());
    };
    const out = [];
    for (const n of slides) {
      const k = num(n);
      const ls = textOf(await zip.file(n).async("string"));
      const nf = zip.file(`ppt/notesSlides/notesSlide${k}.xml`);
      const notes = nf
        ? textOf(await nf.async("string")).filter((t) => !/^\d+$/.test(t.trim()))
        : [];
      if (ls.length || notes.length) {
        out.push(`Slide ${k}:`, ...ls);
        if (notes.length) out.push("Ghi chú của giảng viên: " + notes.join(" "));
      }
    }
    if (!out.length)
      throw new Error(
        "Slide này chỉ có hình, không có chữ. Hãy xuất PowerPoint ra PDF rồi tải PDF lên để AI đọc ảnh.",
      );
    return out.join("\n");
  }
  if (ext === "ppt")
    throw new Error(
      "File .ppt cũ chưa đọc được. Hãy mở bằng PowerPoint và lưu lại thành .pptx hoặc PDF.",
    );
  if (ext === "docx") {
    progress && progress("Đang đọc file Word…");
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",
      () => window.mammoth,
    );
    const r = await window.mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() });
    return r.value;
  }
  if (ext === "pdf") {
    progress && progress("Đang mở PDF…");
    const pdf = await openPdf(f);
    const from = Math.max(1, Math.min(pdf.numPages, opt.from || 1)),
      to = Math.max(from, Math.min(pdf.numPages, opt.to || pdf.numPages));
    const pages = [];
    for (let p = from; p <= to; p++) {
      progress && progress(`Đang lấy chữ trang ${p}/${to}…`);
      pages.push(await pdfLines(pdf, p));
    }
    const clean = stripNoise(pages);
    const chars = clean.reduce((a, ls) => a + ls.join("").length, 0);
    if (chars / Math.max(1, pages.length) >= 80) return clean.map((ls) => ls.join("\n")).join("\n");
    const maxB = S.imgLim && S.imgLim.maxInputBytes;
    return await ocr((k) => pageBlob(pdf, from + k, maxB), to - from + 1, progress);
  }
  if (/^(png|jpe?g|webp|gif|bmp)$/.test(ext) || f.type.startsWith("image/")) {
    const maxB = S.imgLim && S.imgLim.maxInputBytes;
    return await ocr(() => imageBlob(f, maxB), 1, progress);
  }
  if (ext === "doc")
    throw new Error("File .doc cũ chưa đọc được. Hãy lưu lại thành .docx hoặc dán chữ vào.");
  return await f.text();
}
function cleanText(t) {
  return String(t)
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ")
    .replace(/[ \u00a0]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
