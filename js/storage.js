/* Lưu trữ: theo tài khoản (Claude db) hoặc trên trình duyệt (localStorage). */
"use strict";

/* ---------- lưu trữ ---------- */
function makeLocal() {
  const mem = {};
  const k = (id) => "htd:" + id;
  return {
    kind: "local",
    async get(id) {
      try {
        const v = localStorage.getItem(k(id));
        if (v) return JSON.parse(v);
      } catch (e) {}
      return mem[id] ?? null;
    },
    async set(id, d) {
      mem[id] = d;
      try {
        localStorage.setItem(k(id), JSON.stringify(d));
      } catch (e) {}
    },
    async del(id) {
      delete mem[id];
      try {
        localStorage.removeItem(k(id));
      } catch (e) {}
    },
    async listSubjects() {
      const out = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("htd:sub_"))
            out[key.slice(4)] = JSON.parse(localStorage.getItem(key));
        }
      } catch (e) {}
      for (const id in mem) if (id.startsWith("sub_") && !out[id]) out[id] = mem[id];
      return Object.values(out);
    },
  };
}
function makeDb(db, uid) {
  const col = db.collection("data/users/" + uid);
  return {
    kind: "db",
    async get(id) {
      const s = await col.doc(id).get();
      return s.exists ? JSON.parse(JSON.stringify(s.data())) : null;
    },
    async set(id, d) {
      await col.doc(id).set(d);
    },
    async del(id) {
      await col.doc(id).delete();
    },
    async listSubjects() {
      const q = await col.where("kind", "==", "subject").get();
      return q.docs.map((d) => JSON.parse(JSON.stringify(d.data())));
    },
  };
}
const Q = {};
function put(id, d) {
  if (isMem(id)) {
    MEM[id] = d;
    return Promise.resolve();
  }
  Q[id] = (Q[id] || Promise.resolve())
    .then(() => S.store.set(id, d))
    .catch((e) => toast(errMsg(e), "bad"));
  return Q[id];
}
async function get(id) {
  if (isMem(id)) return MEM[id] ?? null;
  try {
    return await S.store.get(id);
  } catch (e) {
    toast(errMsg(e), "bad");
    return null;
  }
}
async function del(id) {
  if (isMem(id)) {
    delete MEM[id];
    return;
  }
  try {
    await S.store.del(id);
  } catch (e) {}
}
const saveSub = (sub) => put("sub_" + sub.sid, JSON.parse(JSON.stringify(sub)));
