import ExcelJS from "exceljs";

import { parseCsv } from "@/domain/import/csv";

export type ImportFormat = "CSV" | "XLSX";

export interface ParsedSpreadsheet {
  headers: string[];
  rows: string[][];
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

function toParsedSpreadsheet(rawRows: string[][]): ParsedSpreadsheet {
  const [headerRow, ...dataRows] = rawRows;
  const headers = (headerRow ?? []).map(normalizeHeader);
  const rows = dataRows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
  return { headers, rows };
}

async function parseXlsx(buffer: Uint8Array): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's bundled types predate @types/node's generic Buffer<TArrayBuffer>.
  // @ts-expect-error -- Buffer.from(...) is a real Node Buffer at runtime.
  await workbook.xlsx.load(Buffer.from(buffer));
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value;
      cells.push(
        value === null || value === undefined
          ? ""
          : typeof value === "object" && "text" in value
            ? String((value as { text: unknown }).text)
            : String(cell.text ?? value),
      );
    });
    rows.push(cells);
  });
  return rows;
}

export async function parseSpreadsheet(
  buffer: Uint8Array,
  format: ImportFormat,
): Promise<ParsedSpreadsheet> {
  if (format === "CSV") {
    const text = new TextDecoder("utf-8").decode(buffer);
    return toParsedSpreadsheet(parseCsv(text));
  }
  return toParsedSpreadsheet(await parseXlsx(buffer));
}
