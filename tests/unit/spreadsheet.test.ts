import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { parseSpreadsheet } from "@/domain/import/spreadsheet";

describe("parseSpreadsheet", () => {
  it("parses a CSV buffer into normalized headers and trimmed rows", async () => {
    const csv = "Topic_Slug,Content_Vi\nalgebra, 1 + 1 = ? \n";
    const result = await parseSpreadsheet(new TextEncoder().encode(csv), "CSV");
    expect(result.headers).toEqual(["topic_slug", "content_vi"]);
    expect(result.rows).toEqual([["algebra", "1 + 1 = ?"]]);
  });

  it("parses an XLSX workbook produced by exceljs into the same shape", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.addRow(["Topic_Slug", "Content_Vi"]);
    sheet.addRow(["algebra", "1 + 1 = ?"]);
    const arrayBuffer = await workbook.xlsx.writeBuffer();

    const result = await parseSpreadsheet(new Uint8Array(arrayBuffer), "XLSX");
    expect(result.headers).toEqual(["topic_slug", "content_vi"]);
    expect(result.rows).toEqual([["algebra", "1 + 1 = ?"]]);
  });

  it("drops fully blank data rows", async () => {
    const csv = "a,b\n1,2\n,\n";
    const result = await parseSpreadsheet(new TextEncoder().encode(csv), "CSV");
    expect(result.rows).toEqual([["1", "2"]]);
  });
});
