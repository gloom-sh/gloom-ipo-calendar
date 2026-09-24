import { expect, test } from "bun:test";
import { buildColumns, ipoTableWidth } from "./model";

test("a narrowing pane drops SHARES, EXCH, then OFFER so RETURN never runs off the edge", () => {
  const ids = (width: number) => buildColumns(width).map((column) => column.id);
  expect(ids(137)).toEqual(["ticker", "company", "date", "status", "exchange", "offer", "price", "shares", "return"]);
  expect(ids(95)).toEqual(["ticker", "company", "date", "status", "exchange", "offer", "price", "return"]);
  expect(ids(89)).toEqual(["ticker", "company", "date", "status", "offer", "price", "return"]);
  expect(ids(80)).toEqual(["ticker", "company", "date", "status", "price", "return"]);
  for (let width = 75; width <= 160; width += 1) {
    expect(ipoTableWidth(buildColumns(width))).toBeLessThanOrEqual(width);
  }
});
