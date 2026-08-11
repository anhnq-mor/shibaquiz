import { describe, expect, it } from "vitest";

import { parseCsv, toCsv } from "@/domain/import/csv";

describe("parseCsv", () => {
  it("parses a simple UTF-8 CSV with a header and data rows", () => {
    const text = "a,b,c\n1,2,3\n4,5,6\n";
    expect(parseCsv(text)).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("handles quoted fields containing commas and embedded newlines", () => {
    const text = 'name,note\n"Nguyễn, Văn A","multi\nline"\n';
    expect(parseCsv(text)).toEqual([
      ["name", "note"],
      ["Nguyễn, Văn A", "multi\nline"],
    ]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    const text = 'a\n"She said ""hi"""\n';
    expect(parseCsv(text)).toEqual([["a"], ['She said "hi"']]);
  });

  it("strips a leading UTF-8 BOM", () => {
    const text = "﻿a,b\n1,2\n";
    expect(parseCsv(text)).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("normalizes CRLF line endings", () => {
    const text = "a,b\r\n1,2\r\n";
    expect(parseCsv(text)).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("drops trailing blank lines", () => {
    const text = "a,b\n1,2\n\n";
    expect(parseCsv(text)).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("toCsv", () => {
  it("quotes fields containing commas, quotes, or newlines", () => {
    expect(toCsv([["a,b", 'c"d', "e\nf"]])).toBe('"a,b","c""d","e\nf"');
  });

  it("guards formula-triggering prefixes to prevent CSV injection", () => {
    expect(toCsv([["=SUM(A1:A2)"]])).toBe("'=SUM(A1:A2)");
    expect(toCsv([["+1", "-1", "@cmd"]])).toBe("'+1,'-1,'@cmd");
  });

  it("leaves plain values untouched", () => {
    expect(toCsv([["hello", "world"]])).toBe("hello,world");
  });

  it("round-trips through parseCsv for quoted content", () => {
    const rows = [["a", 'contains "quotes" and, commas']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
