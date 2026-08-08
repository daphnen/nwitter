import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "../lib/db";
import { applySort } from "../lib/sort";

/**
 * 테이블 하나를 구독하듯 쓰는 훅.
 * localStorage 든 Supabase 든 동일하게 동작합니다.
 */
export default function useCollection(table, options) {
  const key = JSON.stringify(options || {});
  const opts = useMemo(() => JSON.parse(key), [key]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await db.list(table, opts);
      setItems(rows);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [table, opts]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await db.list(table, opts);
        if (alive) {
          setItems(rows);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [table, opts]);

  const resort = useCallback((rows) => applySort(rows, opts.order), [opts]);

  const add = useCallback(
    async (row) => {
      const created = await db.insert(table, { ...opts.where, ...row });
      setItems((prev) => resort([...prev, created]));
      return created;
    },
    [table, opts, resort]
  );

  const patch = useCallback(
    async (id, changes) => {
      setItems((prev) =>
        resort(prev.map((r) => (r.id === id ? { ...r, ...changes } : r)))
      );
      await db.update(table, id, changes);
    },
    [table, resort]
  );

  const remove = useCallback(
    async (id) => {
      setItems((prev) => prev.filter((r) => r.id !== id));
      await db.remove(table, id);
    },
    [table]
  );

  return { items, loading, error, add, patch, remove, reload };
}
