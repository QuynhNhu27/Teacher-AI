/* Điểm XP, chuỗi ngày học và âm thanh đúng/sai. */
"use strict";

/* ---------- XP & chuỗi ngày học ---------- */
const GOAL = 50;
const dayKey = (d) =>
  d.getFullYear() +
  "-" +
  String(d.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(d.getDate()).padStart(2, "0");
function streakDays() {
  const days = S.stats.days || {};
  const d = new Date();
  if (!(days[dayKey(d)] > 0)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days[dayKey(d)] > 0) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
const FLAME = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5 .2 1.6 1 2.6 2.2 3C11 8 11.5 5 12 2z" fill="currentColor"/></svg>`;
function renderStats() {
  const el = $("#statPill");
  if (!el) return;
  const t = (S.stats.days || {})[dayKey(new Date())] || 0;
  el.hidden = false;
  el.innerHTML = `${FLAME}${streakDays()} ngày · ${t}/${GOAL} XP hôm nay`;
  el.title = "Chuỗi ngày học liên tiếp và điểm XP hôm nay";
}
async function loadStats() {
  const d = await get("stats_me");
  if (d) S.stats = { xp: d.xp || 0, days: d.days || {} };
  renderStats();
}
function addXP(n) {
  if (!n) return;
  const k = dayKey(new Date()),
    before = S.stats.days[k] || 0;
  S.stats.xp = (S.stats.xp || 0) + n;
  S.stats.days[k] = before + n;
  const keys = Object.keys(S.stats.days).sort();
  while (keys.length > 120) delete S.stats.days[keys.shift()];
  put("stats_me", { kind: "stats", xp: S.stats.xp, days: S.stats.days });
  renderStats();
  if (before < GOAL && before + n >= GOAL) toast(`Đạt mục tiêu ${GOAL} XP hôm nay!`);
}
let AC = null;
function beep(ok) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime;
    (ok ? [660, 880] : [240, 180]).forEach((f, i) => {
      const o = AC.createOscillator(),
        g = AC.createGain();
      o.type = ok ? "sine" : "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.2);
      o.connect(g).connect(AC.destination);
      o.start(t + i * 0.09);
      o.stop(t + i * 0.09 + 0.22);
    });
  } catch (e) {}
}
