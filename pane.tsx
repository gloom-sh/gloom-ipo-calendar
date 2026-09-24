import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DataTableView,
  PaneStatusBody, QueryBar, unavailableText, useExternalLinkFooter, usePaneNoticeFooter,
  type DataTableCell,
  type DataTableKeyEvent
} from "gloomberb/components";
import { useAsyncResource } from "gloomberb/react";
import { useShortcut } from "gloomberb/react";
import { colors, priceColor } from "gloomberb/theme";
import { TICKER_RESEARCH_PANE_ID } from "gloomberb/types/config";
import type { PaneProps } from "gloomberb/types/plugin";
import { Box, TextAttributes, type InputRenderable } from "gloomberb/ui";
import { isPlainKey } from "gloomberb/utils";
import { usePluginTickerActions } from "gloomberb/react";
import { useAutoRefresh } from "gloomberb/react";
import { loadingErrorFooterInfo } from "gloomberb/components";
import { getCachedIpoCalendar, loadIpoCalendar } from "./cache";
import {
  DEFAULT_SORT_PREFERENCE,
  buildColumns,
  formatDate,
  formatOfferSize,
  formatPrice,
  formatReturn,
  formatShares,
  matchesSearch,
  nextSortPreference,
  partialBoardNotices,
  sortRows,
  statusColor,
  stockAnalysisUrl,
  type IPOColumn,
  type IPOSortPreference,
} from "./model";
import { IPO_CALENDAR_PANE_ID, type IPORecord } from "./types";

const EMPTY_RECORDS: IPORecord[] = [];
const SEARCH_DEBOUNCE_MS = 250;

export function IPOCalendarPane({ focused, width, height }: PaneProps) {
  const { pinTicker } = usePluginTickerActions();
  const resource = useAsyncResource(loadIpoCalendar, { initialData: getCachedIpoCalendar });
  const { status, load, reload: refresh } = resource;
  const records = resource.data?.records ?? EMPTY_RECORDS;
  const stale = resource.data?.stale ?? false;
  const error = resource.error ?? resource.data?.errors[0] ?? null;
  const lastUpdated = resource.data?.fetchedAt ?? null;
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [sortPreference, setSortPreference] = useState<IPOSortPreference>(DEFAULT_SORT_PREFERENCE);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchFocusToken, setSearchFocusToken] = useState(0);
  const searchInputRef = useRef<InputRenderable | null>(null);

  // The cache decides whether a tick becomes a scrape; only [r] forces it.
  useAutoRefresh(status === "loaded" && !stale ? lastUpdated : null, () => {
    void load();
  });

  const filtered = useMemo(
    () => records.filter((record) => matchesSearch(record, searchQuery)),
    [records, searchQuery],
  );

  const sorted = useMemo(
    () => sortRows(filtered, sortPreference),
    [filtered, sortPreference],
  );

  const columns = useMemo(() => buildColumns(width), [width]);

  useEffect(() => {
    if (selectedTicker && sorted.some((record) => record.ticker === selectedTicker)) return;
    const first = sorted[0];
    if (first) {
      setSelectedTicker(first.ticker);
    } else if (selectedTicker !== null) {
      setSelectedTicker(null);
    }
  }, [selectedTicker, sorted]);

  const loading = status === "loading" && records.length === 0;

  const focusSearch = useCallback(() => {
    setSearchFocused(true);
    setSearchFocusToken((token) => token + 1);
  }, []);

  const blurSearch = useCallback(() => {
    setSearchFocused(false);
  }, []);

  const updateSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedTicker(null);
  }, []);

  const handleHeaderClick = useCallback((columnId: string) => {
    setSortPreference((current) => nextSortPreference(current, columnId));
  }, []);

  const handleTableKeyDown = useCallback((event: DataTableKeyEvent) => {
    if (isPlainKey(event, "r")) {
      event.preventDefault?.();
      event.stopPropagation?.();
      refresh();
      return true;
    }
    if (isPlainKey(event, "/")) {
      event.preventDefault?.();
      event.stopPropagation?.();
      focusSearch();
      return true;
    }
    return false;
  }, [focusSearch, refresh]);

  const handleActivate = useCallback((record: IPORecord) => {
    pinTicker(record.ticker, { floating: true, paneType: TICKER_RESEARCH_PANE_ID });
  }, [pinTicker]);

  useShortcut((event) => {
    if (!focused || searchFocused) return;
    if (event.targetEditable) return;
    if (isPlainKey(event, "/")) {
      event.stopPropagation?.();
      event.preventDefault?.();
      focusSearch();
    } else if (isPlainKey(event, "r")) {
      event.stopPropagation?.();
      event.preventDefault?.();
      refresh();
    }
  }, { allowEditable: true, enabled: focused });

  const selectedRecord = useMemo(
    () => sorted.find((record) => record.ticker === selectedTicker) ?? null,
    [selectedTicker, sorted],
  );

  // Rows kept from before a failed refresh are old, not partial: the footer says
  // so rather than repeating the error.
  const staleBoard = records.length > 0 && (stale || resource.error != null);

  const footerInfo = useMemo(() => [
    ...loadingErrorFooterInfo(status === "loading", records.length === 0 ? error : null),
    ...(staleBoard ? [{ id: "stale", parts: [{ text: "stale", tone: "warning" as const }] }] : []),
  ], [error, records.length, staleBoard, status]);

  // One endpoint failed while the other returned rows.
  usePaneNoticeFooter({
    registrationId: `${IPO_CALENDAR_PANE_ID}-notices`,
    notices: records.length > 0 && !staleBoard ? partialBoardNotices(resource.data?.errors ?? []) : [],
    focused,
  });

  const footerHints = useMemo(
    () => [{ id: "search", key: "/", label: "search", onPress: focusSearch }],
    [focusSearch],
  );

  useExternalLinkFooter({
    registrationId: IPO_CALENDAR_PANE_ID,
    focused,
    url: selectedRecord ? stockAnalysisUrl(selectedRecord.ticker) : null,
    info: footerInfo,
    hints: footerHints,
  });

  const renderCell = useCallback(
    (row: IPORecord, column: IPOColumn, _index: number, rowState: { selected: boolean }): DataTableCell => {
      const selectedColor = rowState.selected ? colors.selectedText : undefined;

      switch (column.id) {
        case "ticker":
          return {
            text: row.ticker,
            color: selectedColor ?? colors.textBright,
            attributes: TextAttributes.BOLD,
          };
        case "company":
          return {
            text: row.companyName,
            color: selectedColor ?? colors.text,
          };
        case "date":
          return {
            text: formatDate(row.date),
            color: selectedColor ?? colors.textMuted,
          };
        case "status":
          return {
            text: row.status,
            color: selectedColor ?? statusColor(row.status),
          };
        case "exchange":
          return {
            text: row.exchange ?? "—",
            color: selectedColor ?? colors.textDim,
          };
        case "offer":
          return {
            text: formatOfferSize(row.offerSize),
            color: selectedColor ?? colors.textDim,
          };
        case "price":
          return {
            text: formatPrice(row),
            color: selectedColor ?? colors.text,
          };
        case "shares":
          return {
            text: formatShares(row.shares),
            color: selectedColor ?? colors.textDim,
          };
        case "return":
          return {
            text: formatReturn(row.change1D),
            color: selectedColor ?? (row.change1D != null ? priceColor(row.change1D) : colors.textDim),
          };
      }
    },
    [],
  );

  const rootBefore = (
    <QueryBar
      width={width}
      search={{
        value: searchQuery,
        onChange: updateSearch,
        placeholder: "ticker, company, or exchange",
        focused,
        active: searchFocused,
        onActiveChange: (active) => (active ? setSearchFocused(true) : blurSearch()),
        focusToken: searchFocusToken,
        inputRef: searchInputRef,
        debounceMs: SEARCH_DEBOUNCE_MS,
        normalizeValue: (value) => value.trim(),
      }}
    />
  );

  if (loading) {
    return (
      <Box flexDirection="column" width={width} height={height}>
        {rootBefore}
        <PaneStatusBody loading align="center" loadingLabel="Loading IPO calendar..." />
      </Box>
    );
  }

  if (status === "error" && records.length === 0) {
    // The reason is in the footer, so the body does not repeat it.
    return (
      <Box flexDirection="column" width={width} height={height}>
        {rootBefore}
        <PaneStatusBody error={unavailableText("IPO calendar")} />
      </Box>
    );
  }

  return (
    <DataTableView<IPORecord, IPOColumn>
      focused={focused && !searchFocused}
      rootBefore={rootBefore}
      rootWidth={width}
      rootHeight={height}
      selection={{
        kind: "id",
        selectedId: selectedTicker,
        getId: (row) => row.ticker,
        onChange: (ticker) => setSelectedTicker(ticker),
      }}
      onRootKeyDown={handleTableKeyDown}
      columns={columns}
      items={sorted}
      sortColumnId={sortPreference.columnId}
      sortDirection={sortPreference.direction}
      onHeaderClick={handleHeaderClick}
      getItemKey={(row) => row.ticker}
      onActivate={handleActivate}
      renderCell={renderCell}
      emptyStateTitle={
        searchQuery
          ? `No IPOs matching "${searchQuery}"`
          : status === "error"
            ? "Failed to load IPO data"
            : "No IPO data"
      }
    />
  );
}
