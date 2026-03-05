import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type BuiltinPanelId = "market" | "agent" | "history" | "journal" | "portfolio" | "watchlist" | "analytics";

export type CustomPanelType = "notes" | "embed" | "checklist";

export interface CustomPanelDef {
  id: string;
  title: string;
  type: CustomPanelType;
  content: string; // for notes: text, for embed: url, for checklist: JSON stringified array
}

export interface PanelItem {
  id: string;
  isCustom: boolean;
}

interface TradingLayoutContextType {
  panels: PanelItem[];
  customPanels: CustomPanelDef[];
  reorderPanels: (newOrder: PanelItem[]) => void;
  removePanel: (id: string) => void;
  restorePanel: (id: string) => void;
  hiddenBuiltins: string[];
  addCustomPanel: (panel: CustomPanelDef) => void;
  updateCustomPanel: (id: string, content: string) => void;
  deleteCustomPanel: (id: string) => void;
  columnCount: 1 | 2 | 3;
  setColumnCount: (count: 1 | 2 | 3) => void;
}

const STORAGE_KEY = "trading-layout-v1";
const ALL_BUILTINS: BuiltinPanelId[] = ["market", "agent", "history", "journal", "portfolio", "watchlist", "analytics"];

function loadState(): { panels: PanelItem[]; customPanels: CustomPanelDef[]; hiddenBuiltins: string[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    panels: ALL_BUILTINS.map((id) => ({ id, isCustom: false })),
    customPanels: [],
    hiddenBuiltins: [],
  };
}

const TradingLayoutContext = createContext<TradingLayoutContextType | null>(null);

export function TradingLayoutProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const reorderPanels = useCallback((newOrder: PanelItem[]) => {
    setState((s) => ({ ...s, panels: newOrder }));
  }, []);

  const removePanel = useCallback((id: string) => {
    setState((s) => {
      const panel = s.panels.find((p) => p.id === id);
      if (!panel) return s;
      return {
        ...s,
        panels: s.panels.filter((p) => p.id !== id),
        hiddenBuiltins: panel.isCustom ? s.hiddenBuiltins : [...s.hiddenBuiltins, id],
      };
    });
  }, []);

  const restorePanel = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      panels: [...s.panels, { id, isCustom: false }],
      hiddenBuiltins: s.hiddenBuiltins.filter((h) => h !== id),
    }));
  }, []);

  const addCustomPanel = useCallback((panel: CustomPanelDef) => {
    setState((s) => ({
      ...s,
      panels: [...s.panels, { id: panel.id, isCustom: true }],
      customPanels: [...s.customPanels, panel],
    }));
  }, []);

  const updateCustomPanel = useCallback((id: string, content: string) => {
    setState((s) => ({
      ...s,
      customPanels: s.customPanels.map((p) => (p.id === id ? { ...p, content } : p)),
    }));
  }, []);

  const deleteCustomPanel = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      panels: s.panels.filter((p) => p.id !== id),
      customPanels: s.customPanels.filter((p) => p.id !== id),
    }));
  }, []);

  return (
    <TradingLayoutContext.Provider
      value={{
        panels: state.panels,
        customPanels: state.customPanels,
        reorderPanels,
        removePanel,
        restorePanel,
        hiddenBuiltins: state.hiddenBuiltins,
        addCustomPanel,
        updateCustomPanel,
        deleteCustomPanel,
      }}
    >
      {children}
    </TradingLayoutContext.Provider>
  );
}

export function useTradingLayout() {
  const ctx = useContext(TradingLayoutContext);
  if (!ctx) throw new Error("useTradingLayout must be used within TradingLayoutProvider");
  return ctx;
}
