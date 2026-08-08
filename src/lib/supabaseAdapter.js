// 의존성 없이 Supabase의 REST(PostgREST) 엔드포인트를 직접 호출합니다.
// @supabase/supabase-js 를 따로 설치할 필요가 없습니다.

function buildQuery({ where, order } = {}) {
  const params = new URLSearchParams();
  params.set("select", "*");
  if (where) {
    for (const [col, value] of Object.entries(where)) {
      if (value === undefined) continue;
      params.append(col, `eq.${value}`);
    }
  }
  if (order && order.length) {
    params.set("order", order.map(([col, dir]) => `${col}.${dir}`).join(","));
  }
  return params.toString();
}

export function createSupabaseAdapter(url, anonKey) {
  const base = `${url.replace(/\/$/, "")}/rest/v1`;
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  async function request(path, init) {
    const res = await fetch(`${base}${path}`, { ...init, headers });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Supabase ${res.status}: ${detail || res.statusText}`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  return {
    name: "supabase",

    async list(table, options) {
      return (await request(`/${table}?${buildQuery(options)}`)) || [];
    },

    async insert(table, row) {
      const created = await request(`/${table}`, {
        method: "POST",
        body: JSON.stringify(row),
      });
      return Array.isArray(created) ? created[0] : created;
    },

    async update(table, id, patch) {
      const updated = await request(`/${table}?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      return Array.isArray(updated) ? updated[0] : updated;
    },

    async remove(table, id) {
      await request(`/${table}?id=eq.${id}`, { method: "DELETE" });
    },
  };
}
