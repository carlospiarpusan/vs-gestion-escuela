import { describe, expect, it } from "vitest";
import { parseInteger, parseListParams } from "./api-helpers";

describe("API integer defaults", () => {
  it.each([null, "", " ", "not-a-number", "Infinity"])(
    "keeps the configured fallback for %s",
    (value) => expect(parseInteger(value, 10, 1, 50)).toBe(10)
  );
  it("keeps an explicit zero month and clamps numeric values", () => {
    expect(parseInteger("0", 9, 0, 11)).toBe(0);
    expect(parseInteger("25.9", 10, 1, 50)).toBe(25);
    expect(parseInteger("99", 10, 1, 50)).toBe(50);
    expect(parseInteger("-1", 10, 1, 50)).toBe(1);
  });
  it.each(["", "?page=&pageSize=%20"])(
    "lists keep defaults when parameters are missing or blank: %s",
    (query) => {
      expect(parseListParams(new URL(`https://example.com/api/list${query}`))).toEqual({
        search: "",
        page: 0,
        pageSize: 10,
      });
    }
  );
});
