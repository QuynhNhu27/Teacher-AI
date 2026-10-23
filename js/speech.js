/* Giọng đọc: nhận diện ngôn ngữ, chọn giọng tốt nhất, đọc xen tiếng Việt và tiếng nước ngoài. */
"use strict";

const SAY_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const sayBtn = (t) =>
  `<button class="say" data-act="say" data-t="${esc(t)}" aria-label="Nghe phát âm" title="Nghe">${SAY_SVG}</button>`;
function detectLang(t) {
  t = String(t || "");
  if (/[\u3040-\u30ff]/.test(t)) return "ja-JP";
  if (/[\uac00-\ud7af]/.test(t)) return "ko-KR";
  if (/[\u4e00-\u9fff]/.test(t)) return "zh-CN";
  if (/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỷỹỵ]/i.test(t)) return "vi-VN";
  return "en-US";
}
function subLang(sub) {
  if (!sub) return "en-US";
  const ls = S.sources[sub.sid];
  if (ls) {
    const txt = ls.slice(0, 600).join("\n");
    if (/[\u3040-\u30ff]/.test(txt)) return "ja-JP";
    if (/[\uac00-\ud7af]/.test(txt)) return "ko-KR";
    if (/[\u4e00-\u9fff]/.test(txt)) return "zh-CN";
  }
  return "en-US";
}
const speakable = (t) => {
  const l = detectLang(t);
  return l !== "vi-VN" && String(t).trim().length > 0;
};
/* Giọng đọc chuẩn: tự chọn 1 giọng tốt nhất cho mỗi ngôn ngữ */
const BEST = {
  en: [
    /Aria.*Natural|Jenny.*Natural|Ava.*Natural|Andrew.*Natural|Emma.*Natural/i,
    /Google US English/i,
    /Samantha|Ava \(|Allison/i,
    /Microsoft (Aria|Jenny|Zira)/i,
    /Google UK English Female/i,
  ],
  ja: [
    /Nanami.*Natural|Keita.*Natural/i,
    /Google 日本語/i,
    /Kyoko|Otoya/i,
    /Microsoft (Nanami|Haruka|Ayumi)/i,
  ],
  vi: [
    /Microsoft An\b/i,
    /NamMinh.*Natural/i,
    /NamMinh/i,
    /HoaiMy.*Natural/i,
    /HoaiMy/i,
    /Google Tiếng Việt|Google Vietnamese/i,
    /Linh/i,
  ],
  ko: [/SunHi.*Natural|InJoon.*Natural/i, /Google 한국의/i, /Yuna/i],
  zh: [/Xiaoxiao.*Natural|Yunxi.*Natural/i, /Google 普通话/i, /Tingting/i],
};
const PREF_LANG = { en: "en-US", ja: "ja-JP", vi: "vi-VN", ko: "ko-KR", zh: "zh-CN" };
const VCACHE = {};
function bestVoice(lang) {
  const k = lang.slice(0, 2).toLowerCase();
  if (VCACHE[k]) return VCACHE[k];
  if (!("speechSynthesis" in window)) return null;
  const all = speechSynthesis.getVoices();
  if (!all.length) return null;
  const norm = (v) => (v.lang || "").replace("_", "-").toLowerCase();
  let vs = all.filter((v) => norm(v).startsWith(k));
  const pref = (PREF_LANG[k] || lang).toLowerCase();
  const exact = vs.filter((v) => norm(v) === pref);
  if (exact.length) vs = exact.concat(vs.filter((v) => !exact.includes(v)));
  let pick = null;
  for (const re of BEST[k] || []) {
    pick = vs.find((v) => re.test(v.name));
    if (pick) break;
  }
  pick =
    pick ||
    vs.find((v) => /natural|neural|online/i.test(v.name)) ||
    vs.find((v) => /google/i.test(v.name)) ||
    vs[0] ||
    null;
  if (pick) VCACHE[k] = pick;
  return pick;
}
const VSYL =
  /^(ngh|ng|nh|ch|gh|gi|kh|ph|qu|th|tr|[bcdghklmnpqrstvx])?(oai|oay|uoi|uou|uya|uye|uyu|ieu|yeu|uay|oa|oe|oo|uy|ua|uo|ue|ui|ia|ie|ye|ai|ao|au|ay|eo|eu|iu|oi|uu|a|e|i|o|u|y)(ch|ng|nh|c|m|n|p|t)?$/i;
function isEnWord(w) {
  if (!w || !/[a-z]/i.test(w) || VIET.test(w)) return false;
  if (/[_()\[\]{}.=<>+\/]/.test(w) || (/\d/.test(w) && /[a-z]/i.test(w))) return true;
  if (/^[A-Z]{2,}s?$/.test(w)) return true;
  return w.split(/[-'’]/).some((p) => p && /^[a-z]+$/i.test(p) && !VSYL.test(p));
}
function viRuns(text) {
  const toks = String(text).match(/\S+\s*/g) || [];
  const runs = [];
  let off = 0;
  for (const tk of toks) {
    const core = tk.trim().replace(/^[^\p{L}\p{N}_(]+|[^\p{L}\p{N}_)]+$/gu, "");
    const hasL = /\p{L}/u.test(core);
    const lang = hasL && isEnWord(core) ? "en" : "vi";
    const last = runs[runs.length - 1];
    if (last && (last.lang === lang || !hasL)) last.t += tk;
    else runs.push({ t: tk, lang, off });
    off += tk.length;
  }
  for (let i = 1; i < runs.length - 1; i++) {
    if (
      runs[i].lang === "vi" &&
      runs[i - 1].lang === "en" &&
      runs[i + 1].lang === "en" &&
      /^[\s\p{P}]*$/u.test(runs[i].t)
    ) {
      runs[i - 1].t += runs[i].t + runs[i + 1].t;
      runs.splice(i, 2);
      i--;
    }
  }
  return runs;
}
function sayRuns(text, o) {
  const src = String(text).replace(/[“”"«»*#`]/g, "");
  const sb = curSub();
  const isLang = !!(sb && sb.type === "ngoai_ngu");
  const runs = [];
  const plain = (t, off) => {
    if (!t) return;
    if (!/[\p{L}\p{N}]/u.test(t)) {
      if (runs.length) runs[runs.length - 1].t += t;
      return;
    }
    (S.mixVoice ? viRuns(t) : [{ t, lang: "vi", off: 0 }]).forEach((r) =>
      runs.push({ t: r.t, lang: r.lang, off: off + r.off }),
    );
  };
  const re = /\{\{(.+?)\}\}/g;
  let last = 0,
    m;
  while ((m = re.exec(src))) {
    plain(src.slice(last, m.index), last);
    const f = m[1];
    const fl = /[぀-ヿ]/.test(f)
      ? "ja"
      : /[가-힯]/.test(f)
        ? "ko"
        : /[一-鿿]/.test(f)
          ? isLang && subLang(sb) === "ja-JP"
            ? "ja"
            : "zh"
          : VIET.test(f)
            ? "vi"
            : "en";
    runs.push({
      t: f + (/[.!?。]$/.test(f) ? " " : ", "),
      lang: isLang || S.mixVoice || fl !== "en" ? fl : "vi",
      off: m.index,
      fx: true,
    });
    last = m.index + m[0].length;
  }
  plain(src.slice(last), last);
  if (!runs.length) {
    o.onDone && o.onDone();
    return runs;
  }
  const us = runs.map((r, k) => {
    const lang = r.lang === "vi" ? "vi-VN" : PREF_LANG[r.lang] || "en-US";
    const u = new SpeechSynthesisUtterance(r.lang === "vi" ? r.t : r.t.replace(/[_()]/g, " "));
    u.lang = lang;
    const v = bestVoice(lang);
    if (v) u.voice = v;
    u.rate = (S.rdRate || 1) * (r.lang === "vi" ? 1 : isLang && r.fx ? 0.88 : 0.95);
    u.pitch = 1;
    u.onstart = () => {
      if (o.isCurrent()) o.onPos && o.onPos(r.off);
    };
    u.onboundary = (e) => {
      if (o.isCurrent() && !r.fx) o.onPos && o.onPos(r.off + (e.charIndex || 0));
    };
    const fin = () => {
      if (k === runs.length - 1 && o.isCurrent()) o.onDone && o.onDone();
    };
    u.onend = fin;
    u.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") return;
      fin();
    };
    return u;
  });
  us.forEach((u) => speechSynthesis.speak(u));
  return runs;
}
function langFor(text) {
  const clean = String(text);
  const d = detectLang(clean);
  if (d !== "en-US") return d;
  const sl = subLang(curSub());
  return /^[\x00-\x7f’‘“”]*$/.test(clean) ? "en-US" : sl;
}
function speak(text, rate) {
  if (!("speechSynthesis" in window)) {
    toast("Trình duyệt này không đọc được thành tiếng.", "bad");
    return;
  }
  const clean = String(text)
    .replace(/[(（][぀-ヿa-zA-Z\s.\-]*[)）]/g, "")
    .replace(/[_*#`]/g, " ")
    .trim();
  if (!clean) return;
  const lang = langFor(clean);
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = PREF_LANG[lang.slice(0, 2)] || lang;
  const base = rate || S.rate || 0.85;
  u.rate = lang.startsWith("en") ? Math.max(0.8, base) : base;
  u.pitch = 1;
  const v = bestVoice(lang);
  if (v) u.voice = v;
  else if (speechSynthesis.getVoices().length)
    toast(
      lang.startsWith("en")
        ? "Máy chưa có giọng tiếng Anh chuẩn. Mở trang bằng Microsoft Edge để có giọng Aria/Jenny tự nhiên."
        : `Máy chưa có giọng đọc ${lang}. Thêm giọng đọc trong cài đặt Ngôn ngữ của Windows/điện thoại.`,
    );
  speechSynthesis.speak(u);
}
