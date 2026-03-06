import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type BuiltinPanelId = "market" | "agent" | "history" | "journal" | "portfolio" | "watchlist" | "analytics";

export type CustomPanelType = "notes" | "embed" | "checklist" | "graph" | "calculator";

export interface CustomPanelDef {
  id: string;
  title: string;
  type: CustomPanelType;
  content: string;
}

export interface PanelItem {
  id: string;
  isCustom: boolean;
  row: number;
  col: number;
}

interface TradingLayoutContextType {
  panels: PanelItem[];
  customPanels: CustomPanelDef[];
  swapPanels: (draggedId: string, targetId: string) => void;
  movePanelTo: (id: string, row: number, col: number) => void;
  removePanel: (id: string) => void;
  restorePanel: (id: string) => void;
  hiddenBuiltins: string[];
  addCustomPanel: (panel: CustomPanelDef) => void;
  updateCustomPanel: (id: string, content: string) => void;
  deleteCustomPanel: (id: string) => void;
  columnCount: 1 | 2 | 3;
  setColumnCount: (count: 1 | 2 | 3) => void;
}

const STORAGE_KEY = "trading-layout-v2";
const ALL_BUILTINS: BuiltinPanelId[] = ["market", "agent", "history", "journal", "portfolio", "watchlist", "analytics"];

function computePositions(panels: { id: string; isCustom: boolean }[], cols: number): PanelItem[] {
  return panels.map((p, i) => ({
    ...p,
    row: Math.floor(i / cols),
    col: i % cols,
  }));
}

interface LayoutState {
  panels: PanelItem[];
  customPanels: CustomPanelDef[];
  hiddenBuiltins: string[];
  columnCount: 1 | 2 | 3;
}

function loadState(): LayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate from v1 (panels without row/col)
      if (parsed.panels?.length > 0 && parsed.panels[0].row === undefined) {
        const cols = parsed.columnCount || 2;
        parsed.panels = computePositions(parsed.panels, cols);
      }
      return parsed;
    }
    // Try migrating from v1 key
    const v1 = localStorage.getItem("trading-layout-v1");
    if (v1) {
      const parsed = JSON.parse(v1);
      const cols = parsed.columnCount || 2;
      return {
        ...parsed,
        panels: computePositions(parsed.panels || ALL_BUILTINS.map((id) => ({ id, isCustom: false })), cols),
      };
    }
  } catch {}
  return {
    panels: computePositions(ALL_BUILTINS.map((id) => ({ id, isCustom: false })), 2),
    customPanels: [],
    hiddenBuiltins: [],
    columnCount: 2,
  };
}

const TradingLayoutContext = createContext<TradingLayoutContextType | null>(null);

export function TradingLayoutProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const swapPanels = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setState((s) => {
      const panels = [...s.panels];
      const draggedIdx = panels.findIndex((p) => p.id === draggedId);
      const targetIdx = panels.findIndex((p) => p.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return s;
      // Swap row/col
      const tempRow = panels[draggedIdx].row;
      const tempCol = panels[draggedIdx].col;
      panels[draggedIdx] = { ...panels[draggedIdx], row: panels[targetIdx].row, col: panels[targetIdx].col };
      panels[targetIdx] = { ...panels[targetIdx], row: tempRow, col: tempCol };
      return { ...s, panels };
    });
  }, []);

  const movePanelTo = useCallback((id: string, row: number, col: number) => {
    setState((s) => {
      const panels = [...s.panels];
      const idx = panels.findIndex((p) => p.id === id);
      if (idx === -1) return s;
      // Check if another panel occupies that cell
      const occupant = panels.find((p) => p.row === row && p.col === col && p.id !== id);
      if (occupant) {
        // Swap
        const oldRow = panels[idx].row;
        const oldCol = panels[idx].col;
        const occIdx = panels.indexOf(occupant);
        panels[occIdx] = { ...panels[occIdx], row: oldRow, col: oldCol };
      }
      panels[idx] = { ...panels[idx], row, col };
      return { ...s, panels };
    });
  }, []);

  const removePanel = useCallback((id: string) => {
    setState((s) => {
      const panel = s.panels.find((p) => p.id === id);
      if (!panel) return s;
      const remaining = s.panels.filter((p) => p.id !== id);
      return {
        ...s,
        panels: computePositions(remaining, s.columnCount),
        hiddenBuiltins: panel.isCustom ? s.hiddenBuiltins : [...s.hiddenBuiltins, id],
      };
    });
  }, []);

  const restorePanel = useCallback((id: string) => {
    setState((s) => {
      const newPanels = [...s.panels, { id, isCustom: false, row: 0, col: 0 }];
      return {
        ...s,
        panels: computePositions(newPanels, s.columnCount),
        hiddenBuiltins: s.hiddenBuiltins.filter((h) => h !== id),
      };
    });
  }, []);

  const addCustomPanel = useCallback((panel: CustomPanelDef) => {
    setState((s) => {
      const newPanels = [...s.panels, { id: panel.id, isCustom: true, row: 0, col: 0 }];
      return {
        ...s,
        panels: computePositions(newPanels, s.columnCount),
        customPanels: [...s.customPanels, panel],
      };
    });
  }, []);

  const updateCustomPanel = useCallback((id: string, content: string) => {
    setState((s) => ({
      ...s,
      customPanels: s.customPanels.map((p) => (p.id === id ? { ...p, content } : p)),
    }));
  }, []);

  const deleteCustomPanel = useCallback((id: string) => {
    setState((s) => {
      const remaining = s.panels.filter((p) => p.id !== id);
      return {
        ...s,
        panels: computePositions(remaining, s.columnCount),
        customPanels: s.customPanels.filter((p) => p.id !== id),
      };
    });
  }, []);

  const setColumnCount = useCallback((count: 1 | 2 | 3) => {
    setState((s) => ({
      ...s,
      columnCount: count,
      panels: computePositions(s.panels, count),
    }));
  }, []);

  return (
    <TradingLayoutContext.Provider
      value={{
        panels: state.panels,
        customPanels: state.customPanels,
        swapPanels,
        movePanelTo,
        removePanel,
        restorePanel,
        hiddenBuiltins: state.hiddenBuiltins,
        addCustomPanel,
        updateCustomPanel,
        deleteCustomPanel,
        columnCount: state.columnCount,
        setColumnCount,
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
