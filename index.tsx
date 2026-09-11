import type { GloomPlugin } from "gloomberb/types/plugin";
import {
  attachIpoCalendarHealth,
  resetIpoCalendarHealth,
  STOCKANALYSIS_IPO_CONNECTION_ID,
} from "./client";
import { attachIpoCalendarPersistence, resetIpoCalendarPersistence } from "./cache";
import { IPOCalendarPane } from "./pane";
import { ipoCalendarHeadless } from "./headless";
import { IPO_CALENDAR_PANE_ID } from "./types";

let disposeConnection: (() => void) | null = null;

export const ipoCalendarPlugin: GloomPlugin = {
  id: "ipo-calendar",
  name: "IPO Calendar",
  version: "1.0.0",
  description: "Upcoming and recent IPOs from Stock Analysis",
  homepage: "https://github.com/gloom-sh/gloom-ipo-calendar",
  toggleable: true,

  // JSON over HTTPS, so every renderer. Stock Analysis sends no CORS headers,
  // which is why the host is declared: the web app proxies it.
  targets: ["cli", "tui", "desktop", "web"],
  hosts: ["stockanalysis.com"],

  setup(ctx) {
    attachIpoCalendarHealth(ctx.connectionHealth);
    attachIpoCalendarPersistence(ctx.persistence);
    disposeConnection = ctx.connectionHealth.registerSource({
      id: STOCKANALYSIS_IPO_CONNECTION_ID,
      name: "Stock Analysis",
      kind: "api",
      ownerId: "ipo-calendar",
      detail: "stockanalysis.com",
      priority: 300,
    });
  },

  dispose() {
    disposeConnection?.();
    disposeConnection = null;
    resetIpoCalendarHealth();
    resetIpoCalendarPersistence();
  },

  panes: [
    {
      id: IPO_CALENDAR_PANE_ID,
      name: "IPO Calendar",
      icon: "I",
      component: IPOCalendarPane,
      defaultPosition: "right",
      defaultMode: "floating",
      defaultFloatingSize: { width: 110, height: 28 },
      tableExport: true,
    },
  ],

  paneTemplates: [
    {
      id: "ipo-calendar-pane",
      paneId: IPO_CALENDAR_PANE_ID,
      label: "IPO Calendar",
      description: "Upcoming and recent IPOs from Stock Analysis: pricing, offer size, and first-day return.",
      keywords: [
        "ipo",
        "initial",
        "public",
        "offering",
        "new",
        "listing",
        "debut",
      ],
      shortcut: { prefix: "IPO" },
      headless: ipoCalendarHeadless,
      createInstance: () => ({ placement: "floating" }),
    },
  ],
};

export default ipoCalendarPlugin;
