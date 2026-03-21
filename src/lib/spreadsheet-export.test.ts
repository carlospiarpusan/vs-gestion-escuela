// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { downloadCsv } from "@/lib/spreadsheet-export";

describe("spreadsheet-export", () => {
  it("genera csv escapando comillas y nulos", () => {
    const createObjectURL = URL.createObjectURL;
    const revokeObjectURL = URL.revokeObjectURL;
    const clicks: string[] = [];
    const blobs: Blob[] = [];

    URL.createObjectURL = ((blob: Blob) => {
      blobs.push(blob);
      return "blob:test";
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => undefined) as typeof URL.revokeObjectURL;

    const originalCreateElement = document.createElement.bind(document);
    document.createElement = ((tagName: string) => {
      const node = originalCreateElement(tagName);
      if (tagName === "a") {
        node.click = () => {
          clicks.push((node as HTMLAnchorElement).download);
        };
      }
      return node;
    }) as typeof document.createElement;

    downloadCsv("reporte.csv", ["Nombre", "Valor"], [['Carlos "A"', null]]);

    expect(clicks).toEqual(["reporte.csv"]);
    expect(blobs).toHaveLength(1);

    document.createElement = originalCreateElement;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });
});
