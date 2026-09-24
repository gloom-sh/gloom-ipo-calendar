import type { DataTableColumn } from "gloomberb/components";
import { colors } from "gloomberb/theme";
import { compareSortValues, type SortDirection } from "gloomberb/utils";
import type { IPORecord, IPOStatus } from "./types";
import { formatIpoDate, matchesIpoRecord } from "./client";

type IPOColumnId =
  | "ticker"
  | "company"
  | "date"
  | "status"
  | "exchange"
  | "offer"
  | "price"
  | "shares"
  | "return";

export type IPOColumn = DataTableColumn & { id: IPOColumnId };

export interface IPOSortPreference {
  columnId: IPOColumnId | null;
  direction: SortDirection;
}

export const DEFAULT_SORT_PREFERENCE: IPOSortPreference = {
  columnId: null,
  direction: "asc",
};

export function statusColor(status: IPOStatus): string {
  switch (status) {
    case "upcoming":
      return colors.warning;
    case "priced":
      return colors.textBright;
    case "trading":
      return colors.positive;
  }
}

export const formatDate = formatIpoDate;

export function formatOfferSize(value: number | null): string {
  if (value == null) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatShares(value: number | null): string {
  if (value == null) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

export function formatPrice(record: IPORecord): string {
  if (record.pricedPrice != null) return `$${record.pricedPrice.toFixed(2)}`;
  if (record.priceRange != null) return `$${record.priceRange[0].toFixed(2)}-$${record.priceRange[1].toFixed(2)}`;
  return "—";
}

export function formatReturn(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function stockAnalysisUrl(ticker: string): string {
  return `https://stockanalysis.com/stocks/${ticker.toLowerCase()}/`;
}

/** "$100.00-$120.00" is the widest price a row can hold; anything narrower clips a real number. */
const PRICE_WIDTH = 15;

/**
 * COMPANY is the flexible column: it starts at this width and takes whatever
 * the pane has left, so the numbers on the right never run off the edge.
 */
const COMPANY_MIN_WIDTH = 16;

const ALL_COLUMNS: IPOColumn[] = [
  { id: "ticker", label: "TICKER", width: 8, align: "left" },
  { id: "company", label: "COMPANY", width: COMPANY_MIN_WIDTH, align: "left", flexGrow: 1 },
  { id: "date", label: "DATE", width: 11, align: "left" },
  { id: "status", label: "STATUS", width: 9, align: "left" },
  { id: "exchange", label: "EXCH", width: 8, align: "left" },
  { id: "offer", label: "OFFER", width: 8, align: "right" },
  { id: "price", label: "PRICE", width: PRICE_WIDTH, align: "right" },
  { id: "shares", label: "SHARES", width: 8, align: "right" },
  { id: "return", label: "RETURN", width: 8, align: "right" },
];

/**
 * Leave in this order as the pane narrows. All three are filled only for
 * upcoming deals; SHARES goes first because OFFER and PRICE imply it.
 */
const OPTIONAL_COLUMNS: IPOColumnId[] = ["shares", "exchange", "offer"];

/**
 * Cells the table draws for these columns: each at least its header plus the
 * sort arrow, a one-cell gap after each, and a cell of padding on either side.
 * Every right-aligned column sits after the left-aligned ones, so there is no
 * extra gutter to count.
 */
export function ipoTableWidth(columns: readonly IPOColumn[]): number {
  return columns.reduce((sum, column) => sum + Math.max(column.width, column.label.length + 2) + 1, 2);
}

export function buildColumns(width: number): IPOColumn[] {
  const dropped = new Set<IPOColumnId>();
  const visible = () => ALL_COLUMNS.filter((column) => !dropped.has(column.id));
  for (const id of OPTIONAL_COLUMNS) {
    if (ipoTableWidth(visible()) <= width) break;
    dropped.add(id);
  }
  return visible();
}

function getSortValue(columnId: IPOColumnId, row: IPORecord): string | number | null {
  switch (columnId) {
    case "ticker":
      return row.ticker;
    case "company":
      return row.companyName;
    case "date":
      return row.date.getTime();
    case "status":
      return row.status;
    case "exchange":
      return row.exchange ?? "";
    case "offer":
      return row.offerSize;
    case "price":
      return row.pricedPrice ?? row.priceRange?.[0] ?? null;
    case "shares":
      return row.shares;
    case "return":
      return row.change1D;
  }
}

export function sortRows(rows: IPORecord[], sort: IPOSortPreference): IPORecord[] {
  if (!sort.columnId) return rows;
  return [...rows].sort((a, b) =>
    compareSortValues(getSortValue(sort.columnId!, a), getSortValue(sort.columnId!, b), sort.direction),
  );
}

export function nextSortPreference(current: IPOSortPreference, columnId: string): IPOSortPreference {
  const typed = columnId as IPOColumnId;
  if (current.columnId !== typed) return { columnId: typed, direction: "asc" };
  if (current.direction === "asc") return { columnId: typed, direction: "desc" };
  return DEFAULT_SORT_PREFERENCE;
}

export const matchesSearch = matchesIpoRecord;

/**
 * The board is two lists and one can fail while the other loads. Name the
 * missing half in words: the raw errors carry request URLs.
 */
export function partialBoardNotices(errors: readonly string[]): string[] {
  return errors.map((error) => {
    if (error.startsWith("recent:")) return "Recent IPOs did not load, so only upcoming IPOs are listed.";
    if (error.startsWith("upcoming:")) return "Upcoming IPOs did not load, so only recent IPOs are listed.";
    return "Part of the IPO calendar did not load.";
  });
}
