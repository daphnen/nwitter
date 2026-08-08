import { applySort, matchesWhere } from "./sort";

const PREFIX = "cat-dashboard:";

function read(table) {
  try {
    const raw = window.localStorage.getItem(PREFIX + table);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(table, rows) {
  window.localStorage.setItem(PREFIX + table, JSON.stringify(rows));
}

function newId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Supabase 어댑터와 똑같은 인터페이스를 갖습니다.
export const localAdapter = {
  name: "local",

  async list(table, { where, order } = {}) {
    const rows = read(table).filter((r) => matchesWhere(r, where));
    return applySort(rows, order);
  },

  async insert(table, row) {
    const created = {
      ...row,
      id: row.id || newId(),
      created_at: new Date().toISOString(),
    };
    write(table, [...read(table), created]);
    return created;
  },

  async update(table, id, patch) {
    const rows = read(table);
    const next = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
    write(table, next);
    return next.find((r) => r.id === id);
  },

  async remove(table, id) {
    write(
      table,
      read(table).filter((r) => r.id !== id)
    );
  },
};
