"use client";

import { useMemo, useState } from "react";

interface SelectableRow {
  id: string;
  status: string;
}

export function useBulkSelection<T extends SelectableRow>(rows: T[]) {
  const [rawSelected, setRawSelected] = useState<Set<string>>(new Set());

  const selected = useMemo(() => {
    const rowIds = new Set(rows.map((row) => row.id));
    return new Set([...rawSelected].filter((id) => rowIds.has(id)));
  }, [rawSelected, rows]);

  function toggle(id: string) {
    setRawSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setRawSelected((current) => {
      if (rows.length > 0 && rows.every((row) => current.has(row.id))) {
        return new Set();
      }
      return new Set(rows.map((row) => row.id));
    });
  }

  function clear() {
    setRawSelected(new Set());
  }

  function replace(ids: string[]) {
    setRawSelected(new Set(ids));
  }

  const allSelected =
    rows.length > 0 && rows.every((row) => selected.has(row.id));
  const selectedRows = rows.filter((row) => selected.has(row.id));
  const allArchived =
    selectedRows.length > 0 &&
    selectedRows.every((row) => row.status === "ARCHIVED");

  return {
    selected,
    count: selected.size,
    allSelected,
    allArchived,
    toggle,
    toggleAll,
    clear,
    replace,
  };
}
