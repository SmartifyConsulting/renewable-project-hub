/** CSV export for records already authorised by Supabase RLS. */
export function auditCsvCell(value: unknown): string {
  const raw = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  const safe = /^\s*[=+@-]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function auditCsv(columns: string[], records: unknown[][]): string {
  return [columns, ...records].map((row) => row.map(auditCsvCell).join(",")).join("\r\n");
}
