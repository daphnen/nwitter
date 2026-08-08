// order: [["date", "asc"], ["time", "asc"]] 형태
export function applySort(rows, order) {
  if (!order || order.length === 0) return rows;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    for (const [col, dir] of order) {
      const av = a[col];
      const bv = b[col];
      if (av === bv) continue;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      const cmp = av > bv ? 1 : -1;
      return dir === "desc" ? -cmp : cmp;
    }
    return 0;
  });
  return sorted;
}

export function matchesWhere(row, where) {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => row[k] === v);
}
