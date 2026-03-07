import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, TrendingUp, TrendingDown, Activity, DollarSign, BarChart3,
  Target, Brain, BookOpen, Zap, AlertTriangle, Lightbulb, RefreshCw, Eye, Wallet, Trash2, Plus, LayoutGrid,
  Settings2, Check, Minimize2, Maximize2, Clock, Sun, Moon, ShieldAlert, Layers, Percent,
} from "lucide-react";
import PageNav from "@/components/PageNav";
import TopBarWidget from "@/components/trading/TopBarWidget";
import { useTheme } from "next-themes";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTradingSimulation, ALL_INSTRUMENTS } from "@/hooks/useTradingSimulation";
import type { LearningNote, InstrumentInfo } from "@/hooks/useTradingSimulation";
import { useTradingLayout, type PanelItem, TOP_BAR_ITEMS } from "@/contexts/TradingLayoutContext";
import { Switch } from "@/components/ui/switch";
import Watchlist from "@/components/trading/Watchlist";
import AnalyticsPanel from "@/components/trading/AnalyticsPanel";
import PanelWrapper from "@/components/trading/PanelWrapper";
import CustomPanel from "@/components/trading/CustomPanel";
import AddPanelDialog from "@/components/trading/AddPanelDialog";
import { TradingDataProvider, useTradingData } from "@/contexts/TradingDataContext";

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function formatVol(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return `${v}`;
}

const categoryIcon: Record<LearningNote["category"], React.ReactNode> = {
  Mistake: <AlertTriangle className="w-3.5 h-3.5 text-neon-red" />,
  Insight: <Lightbulb className="w-3.5 h-3.5 text-neon-cyan" />,
  Adjustment: <RefreshCw className="w-3.5 h-3.5 text-neon-orange" />,
  Pattern: <Eye className="w-3.5 h-3.5 text-neon-purple" />,
};
const categoryColor: Record<LearningNote["category"], string> = {
  Mistake: "bg-neon-red/15 text-neon-red border-neon-red/30",
  Insight: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30",
  Adjustment: "bg-neon-orange/15 text-neon-orange border-neon-orange/30",
  Pattern: "bg-neon-purple/15 text-neon-purple border-neon-purple/30",
};

// --- Session clock helpers ---
function getFuturesSession(): { label: string; color: string; next: string; countdown: string } {
  const now = new Date();
  // Convert to ET
  const etStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const et = new Date(etStr);
  const h = et.getHours();
  const m = et.getMinutes();
  const day = et.getDay(); // 0=Sun, 6=Sat
  const mins = h * 60 + m;

  // Weekend: Fri 5PM to Sun 6PM
  if (day === 6 || (day === 0 && mins < 18 * 60) || (day === 5 && mins >= 17 * 60)) {
    // Calculate countdown to Sunday 6PM ET
    const daysUntilSun = day === 6 ? 1 : day === 0 ? 0 : 2;
    const targetMins = 18 * 60;
    const currentMins = mins;
    const remainMins = daysUntilSun * 24 * 60 + (targetMins - currentMins);
    const rh = Math.floor(remainMins / 60);
    const rm = remainMins % 60;
    return { label: "CLOSED", color: "text-neon-red", next: "Globex opens Sun 6PM ET", countdown: `${rh}h ${rm}m` };
  }

  // RTH: 9:30 AM - 4:00 PM ET (Mon-Fri)
  const rthOpen = 9 * 60 + 30;
  const rthClose = 16 * 60;

  if (mins >= rthOpen && mins < rthClose) {
    const remain = rthClose - mins;
    const rh = Math.floor(remain / 60);
    const rm = remain % 60;
    return { label: "RTH", color: "text-neon-green", next: "Close", countdown: `${rh}h ${rm}m` };
  }

  // ETH/Globex: 6PM - 9:30AM ET
  if (mins >= 18 * 60 || mins < rthOpen) {
    let remain: number;
    if (mins >= 18 * 60) {
      remain = (24 * 60 - mins) + rthOpen;
    } else {
      remain = rthOpen - mins;
    }
    const rh = Math.floor(remain / 60);
    const rm = remain % 60;
    return { label: "ETH", color: "text-neon-orange", next: "RTH opens", countdown: `${rh}h ${rm}m` };
  }

  // Between 4PM and 6PM — brief close
  const remain = 18 * 60 - mins;
  const rh = Math.floor(remain / 60);
  const rm = remain % 60;
  return { label: "CLOSED", color: "text-neon-red", next: "Globex opens", countdown: `${rh}h ${rm}m` };
}

const CATEGORY_LABELS: Record<InstrumentInfo["category"], string> = {
  index: "Index Futures",
  micro: "Micro Futures",
  commodity: "Commodities",
  rates: "Rates & FX",
};

const Trading = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const sim = useTradingSimulation();
  const { tickers, evaluations, considerations, executedTrades, tradeHistory, learningNotes, stats, dataSource, portfolio, deleteTrade, deleteLearningNote, addLearningNote, activeSymbols, setActiveSymbols, allInstruments } = sim;
  const layout = useTradingLayout();
  const { theme, setTheme } = useTheme();
  const gridRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);

  // Session clock
  const [session, setSession] = useState(getFuturesSession);
  useEffect(() => {
    const interval = setInterval(() => setSession(getFuturesSession()), 10_000);
    return () => clearInterval(interval);
  }, []);

  // New note form state
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteCategory, setNoteCategory] = useState<LearningNote["category"]>("Insight");
  const [noteContent, setNoteContent] = useState("");

  const handleAddNote = useCallback(async () => {
    if (!noteContent.trim()) return;
    await addLearningNote(noteCategory, noteContent.trim());
    setNoteContent("");
    setShowNoteForm(false);
  }, [noteCategory, noteContent, addLearningNote]);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/login", { replace: true });
      else setAuthChecked(true);
    };
    check();
  }, [navigate]);

  // Panel render map
  const renderPanel = useCallback((panelItem: PanelItem) => {
    if (panelItem.isCustom) {
      const def = layout.customPanels.find((p) => p.id === panelItem.id);
      if (!def) return null;
      return <CustomPanel panel={def} />;
    }

    switch (panelItem.id) {
      case "market":
        return <MarketPanel tickers={tickers} activeSymbols={activeSymbols} setActiveSymbols={setActiveSymbols} />;
      case "agent":
        return <AgentPanel evaluations={evaluations} considerations={considerations} executedTrades={executedTrades} />;
      case "history":
        return <HistoryPanel tradeHistory={tradeHistory} deleteTrade={deleteTrade} />;
      case "journal":
        return (
          <JournalPanel
            learningNotes={learningNotes}
            deleteLearningNote={deleteLearningNote}
            showNoteForm={showNoteForm}
            setShowNoteForm={setShowNoteForm}
            noteCategory={noteCategory}
            setNoteCategory={setNoteCategory}
            noteContent={noteContent}
            setNoteContent={setNoteContent}
            onAddNote={handleAddNote}
          />
        );
      case "portfolio":
        return <PortfolioPanel portfolio={portfolio} />;
      case "watchlist":
        return <WatchlistInner tickers={tickers} activeSymbols={activeSymbols} />;
      case "analytics":
        return <AnalyticsInner stats={stats} tradeHistory={tradeHistory} />;
      default:
        return null;
    }
  }, [tickers, evaluations, considerations, executedTrades, tradeHistory, learningNotes, stats, portfolio, deleteTrade, deleteLearningNote, showNoteForm, noteCategory, noteContent, handleAddNote, layout.customPanels]);

  // Compute open positions count
  const openPositions = useMemo(() => portfolio.holdings?.filter((h: any) => h.qty > 0).length ?? 0, [portfolio]);

  // Render individual top bar widget content
  const renderTopBarWidget = useCallback((id: string): React.ReactNode => {
    switch (id) {
      case "pagenav":
        return <PageNav />;
      case "session":
        return (
          <div className="flex items-center gap-1.5 bg-secondary/40 rounded-md px-2 py-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className={`text-[10px] font-mono font-semibold ${session.color}`}>{session.label}</span>
            <span className="text-[9px] font-mono text-muted-foreground">→ {session.next}</span>
            <span className="text-[10px] font-mono text-foreground">{session.countdown}</span>
          </div>
        );
      case "pnl":
        return (
          <div className="flex items-center gap-1.5">
            <DollarSign className={`w-4 h-4 ${stats.totalPnl >= 0 ? "text-neon-green" : "text-neon-red"}`} />
            <span className="text-xs text-muted-foreground hidden sm:inline">P/L</span>
            <span className={`font-mono text-sm font-semibold ${stats.totalPnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
              {stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}
            </span>
          </div>
        );
      case "trades":
        return (
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-neon-blue" />
            <span className="text-xs text-muted-foreground hidden sm:inline">Trades</span>
            <span className="font-mono text-sm font-semibold text-neon-blue">{stats.totalTrades}</span>
          </div>
        );
      case "winrate":
        return (
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-neon-cyan" />
            <span className="text-xs text-muted-foreground hidden sm:inline">Win Rate</span>
            <span className="font-mono text-sm font-semibold text-neon-cyan">{stats.winRate}%</span>
          </div>
        );
      case "maxdd": {
        // Max drawdown from stats
        const maxDD = stats.totalPnl < 0 ? Math.abs(stats.totalPnl) : 0;
        return (
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-neon-red" />
            <span className="text-xs text-muted-foreground hidden sm:inline">Max DD</span>
            <span className="font-mono text-sm font-semibold text-neon-red">${maxDD.toFixed(2)}</span>
          </div>
        );
      }
      case "avgwin":
        return (
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-neon-green" />
            <span className="text-xs text-muted-foreground hidden sm:inline">Avg Win</span>
            <span className="font-mono text-sm font-semibold text-neon-green">+${stats.avgWin.toFixed(2)}</span>
          </div>
        );
      case "avgloss":
        return (
          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-neon-red" />
            <span className="text-xs text-muted-foreground hidden sm:inline">Avg Loss</span>
            <span className="font-mono text-sm font-semibold text-neon-red">-${stats.avgLoss.toFixed(2)}</span>
          </div>
        );
      case "openpos":
        return (
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-neon-purple" />
            <span className="text-xs text-muted-foreground hidden sm:inline">Open</span>
            <span className="font-mono text-sm font-semibold text-neon-purple">{openPositions}</span>
          </div>
        );
      case "margin":
        return (
          <div className="flex items-center gap-1.5">
            <Percent className="w-4 h-4 text-neon-orange" />
            <span className="text-xs text-muted-foreground hidden sm:inline">Margin</span>
            <span className="font-mono text-sm font-semibold text-neon-orange">{portfolio.marginUtilization.toFixed(0)}%</span>
          </div>
        );
      case "theme":
        return (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        );
      case "compact":
        return (
          <button
            onClick={() => layout.setCompactMode(!layout.compactMode)}
            className={`p-1.5 rounded transition-colors ${layout.compactMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}
            title={layout.compactMode ? "Expand panels" : "Compact panels"}
          >
            {layout.compactMode ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        );
      case "columns":
        return (
          <div className="flex items-center gap-1 bg-secondary/50 rounded-md p-1">
            {([1, 2, 3] as const).map((cols) => (
              <button
                key={cols}
                onClick={() => layout.setColumnCount(cols)}
                className={`p-1.5 rounded transition-colors ${layout.columnCount === cols ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title={`${cols} column${cols > 1 ? "s" : ""}`}
              >
                <LayoutGrid className="w-4 h-4" style={{ opacity: cols === 1 ? 1 : 0.6 + cols * 0.2 }} />
              </button>
            ))}
          </div>
        );
      case "addpanel":
        return <AddPanelDialog />;
      case "status":
        return (
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${dataSource === "live" ? "bg-neon-green" : dataSource === "simulated" ? "bg-neon-orange" : "bg-muted-foreground"} animate-pulse-glow`} />
            <span className="text-[10px] sm:text-xs text-muted-foreground font-mono">
              {dataSource === "live" ? "Live Data" : dataSource === "simulated" ? "Simulated" : "Loading…"}
            </span>
          </div>
        );
      default:
        return null;
    }
  }, [session, stats, theme, setTheme, layout, dataSource, openPositions, portfolio]);

  if (!authChecked) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="font-mono text-xs text-muted-foreground tracking-wider">Loading Trading…</span>
      </div>
    );
  }

  return (
    <TradingDataProvider executedTrades={executedTrades} considerations={considerations} evaluations={evaluations}>
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 glass-panel rounded-none border-x-0 border-t-0 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse-glow" />
          <span className="font-display font-semibold text-xs sm:text-sm tracking-wide text-foreground">Futures Trading</span>
        </div>

        <div ref={topBarRef} className="flex items-center gap-3 sm:gap-4 flex-wrap flex-1">
          {layout.topBarItems.map((widgetId, idx) => {
            if (!layout.isTopBarVisible(widgetId)) return null;
            const content = renderTopBarWidget(widgetId);
            if (!content) return null;
            return (
              <TopBarWidget key={widgetId} id={widgetId} index={idx} containerRef={topBarRef}>
                {content}
              </TopBarWidget>
            );
          })}
        </div>

        {/* Top bar settings */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50 shrink-0" title="Customize top bar">
              <Settings2 className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="end">
            <div className="p-3 border-b border-border/30">
              <p className="font-display font-semibold text-xs text-foreground">Top Bar Items</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Show or hide top bar elements</p>
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="p-2 space-y-1">
                {TOP_BAR_ITEMS.map((item) => (
                  <label key={item.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-secondary/30 cursor-pointer">
                    <span className="text-xs font-mono text-foreground">{item.label}</span>
                    <Switch
                      checked={layout.isTopBarVisible(item.id)}
                      onCheckedChange={() => layout.toggleTopBarItem(item.id)}
                      className="scale-75"
                    />
                  </label>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* Main grid */}
      <div
        ref={gridRef}
        className={`flex-1 grid gap-3 p-3 min-h-0 overflow-auto auto-rows-min ${
          layout.columnCount === 1 ? "grid-cols-1" : layout.columnCount === 2 ? "grid-cols-2" : "grid-cols-3"
        }`}
      >
        <AnimatePresence>
          {layout.panels.map((panelItem) => (
            <PanelWrapper
              key={panelItem.id}
              item={panelItem}
              onRemove={panelItem.isCustom ? layout.deleteCustomPanel : layout.removePanel}
              gridRef={gridRef}
            >
              {renderPanel(panelItem)}
            </PanelWrapper>
          ))}
        </AnimatePresence>
      </div>
    </div>
    </TradingDataProvider>
  );
};

// ─── Extracted panel components ───

function MarketPanel({ tickers, activeSymbols, setActiveSymbols }: {
  tickers: ReturnType<typeof useTradingSimulation>["tickers"];
  activeSymbols: string[];
  setActiveSymbols: (syms: string[]) => void;
}) {
  const categories: InstrumentInfo["category"][] = ["index", "micro", "commodity", "rates"];

  const toggleSymbol = (sym: string) => {
    if (activeSymbols.includes(sym)) {
      if (activeSymbols.length <= 1) return;
      setActiveSymbols(activeSymbols.filter((s) => s !== sym));
    } else {
      setActiveSymbols([...activeSymbols, sym]);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
        <span className="font-display font-semibold text-xs tracking-wide text-muted-foreground uppercase">Futures Market Data</span>
        <Popover>
          <PopoverTrigger asChild>
            <button className="ml-auto p-1 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <div className="p-3 border-b border-border/30">
              <p className="font-display font-semibold text-xs text-foreground">Manage Instruments</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Toggle contracts to show in the market panel</p>
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="p-2">
                {categories.map((cat) => {
                  const instruments = ALL_INSTRUMENTS.filter((i) => i.category === cat);
                  return (
                    <div key={cat}>
                      <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider px-2 py-1 mt-1">{CATEGORY_LABELS[cat]}</p>
                      {instruments.map((inst) => (
                        <label key={inst.symbol} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/30 cursor-pointer">
                          <Checkbox
                            checked={activeSymbols.includes(inst.symbol)}
                            onCheckedChange={() => toggleSymbol(inst.symbol)}
                            className="h-3.5 w-3.5"
                          />
                          <span className="font-mono text-xs font-semibold text-foreground w-10">{inst.symbol}</span>
                          <span className="text-[10px] text-muted-foreground truncate flex-1">{inst.name}</span>
                          <span className="text-[8px] font-mono text-muted-foreground">{inst.contractMonth}</span>
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30">
              <TableHead className="text-[10px] font-mono text-muted-foreground">Contract</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground text-right">Price</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground text-right">Chg</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground text-right">%</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground text-right hidden sm:table-cell">Tick</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground text-right hidden sm:table-cell">Pt Val</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground text-right hidden md:table-cell">Vol</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground w-16">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickers.map((t) => {
              const inst = ALL_INSTRUMENTS.find((i) => i.symbol === t.symbol);
              return (
                <TableRow key={t.symbol} className="border-border/20 hover:bg-secondary/30">
                  <TableCell className="py-2">
                    <div className="flex flex-col">
                      <span className="font-mono font-semibold text-xs text-foreground">{t.symbol}</span>
                      {inst && <span className="text-[8px] text-muted-foreground">{inst.contractMonth}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-right font-mono text-xs text-foreground">${t.price.toFixed(2)}</TableCell>
                  <TableCell className={`py-2 text-right font-mono text-xs ${t.change >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                    {t.change >= 0 ? "+" : ""}{t.change.toFixed(2)}
                  </TableCell>
                  <TableCell className={`py-2 text-right font-mono text-xs ${t.changePercent >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                    <span className="inline-flex items-center gap-0.5">
                      {t.changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(t.changePercent).toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-right font-mono text-[10px] text-muted-foreground hidden sm:table-cell">{inst?.tickSize}</TableCell>
                  <TableCell className="py-2 text-right font-mono text-[10px] text-muted-foreground hidden sm:table-cell">${inst?.pointValue}</TableCell>
                  <TableCell className="py-2 text-right font-mono text-[10px] text-muted-foreground hidden md:table-cell">{formatVol(t.volume)}</TableCell>
                  <TableCell className="py-2 w-16">
                    <ResponsiveContainer width="100%" height={24}>
                      <LineChart data={t.history.map((v, i) => ({ v, i }))}>
                        <Line type="monotone" dataKey="v" stroke={t.change >= 0 ? "hsl(var(--neon-green))" : "hsl(var(--neon-red))"} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </>
  );
}

function AgentPanel({ evaluations, considerations, executedTrades }: {
  evaluations: ReturnType<typeof useTradingSimulation>["evaluations"];
  considerations: ReturnType<typeof useTradingSimulation>["considerations"];
  executedTrades: ReturnType<typeof useTradingSimulation>["executedTrades"];
}) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-blue" />
        <span className="font-display font-semibold text-xs tracking-wide text-muted-foreground uppercase">Trading Agent</span>
      </div>
      <Tabs defaultValue="evaluating" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-secondary/50 self-start">
          <TabsTrigger value="evaluating" className="text-[10px] font-mono gap-1"><Brain className="w-3 h-3" /> Evaluating</TabsTrigger>
          <TabsTrigger value="considering" className="text-[10px] font-mono gap-1"><Zap className="w-3 h-3" /> Considering</TabsTrigger>
          <TabsTrigger value="executed" className="text-[10px] font-mono gap-1"><Activity className="w-3 h-3" /> Executed</TabsTrigger>
        </TabsList>
        <TabsContent value="evaluating" className="flex-1 min-h-0">
          <ScrollArea className="h-full max-h-[320px]">
            <div className="space-y-2 pr-2">
              {evaluations.length === 0 && <p className="text-xs text-muted-foreground font-mono py-4 text-center">Waiting for agent…</p>}
              {evaluations.map((e) => (
                <div key={e.id} className="p-3 rounded-lg bg-secondary/30 border border-border/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-semibold text-xs text-foreground">{e.symbol}</span>
                    <span className="text-[9px] font-mono text-muted-foreground">{formatTime(e.timestamp)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {e.indicators.map((ind, i) => (
                      <span key={i} className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${ind.signal === "bullish" ? "bg-neon-green/10 text-neon-green border-neon-green/30" : ind.signal === "bearish" ? "bg-neon-red/10 text-neon-red border-neon-red/30" : "bg-muted text-muted-foreground border-border/30"}`}>
                        {ind.name}: {ind.value}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="considering" className="flex-1 min-h-0">
          <ScrollArea className="h-full max-h-[320px]">
            <div className="space-y-2 pr-2">
              {considerations.length === 0 && <p className="text-xs text-muted-foreground font-mono py-4 text-center">No signals yet…</p>}
              {considerations.map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-secondary/30 border border-border/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-xs text-foreground">{c.symbol}</span>
                      <Badge className={`text-[9px] ${c.action === "buy" ? "bg-neon-green/15 text-neon-green border-neon-green/30" : "bg-neon-red/15 text-neon-red border-neon-red/30"}`}>{c.action.toUpperCase()}</Badge>
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground">{formatTime(c.timestamp)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">{c.reason}</p>
                  <div className="flex items-center gap-2">
                    <Progress value={c.confidence} className="h-1.5 flex-1" />
                    <span className="text-[10px] font-mono text-foreground font-semibold">{c.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="executed" className="flex-1 min-h-0">
          <ScrollArea className="h-full max-h-[320px]">
            <div className="space-y-2 pr-2">
              {executedTrades.length === 0 && <p className="text-xs text-muted-foreground font-mono py-4 text-center">No trades yet…</p>}
              {executedTrades.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/20">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[9px] ${t.action === "buy" ? "bg-neon-green/15 text-neon-green border-neon-green/30" : "bg-neon-red/15 text-neon-red border-neon-red/30"}`}>{t.action.toUpperCase()}</Badge>
                    <span className="font-mono font-semibold text-xs text-foreground">{t.symbol}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-foreground">${t.price.toFixed(2)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">×{t.quantity} ct</span>
                    <span className="text-[9px] font-mono text-muted-foreground">{formatTime(t.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </>
  );
}

function HistoryPanel({ tradeHistory, deleteTrade }: {
  tradeHistory: ReturnType<typeof useTradingSimulation>["tradeHistory"];
  deleteTrade: (id: string) => void;
}) {
  const { selectedAgentId, tradeAgentMap } = useTradingData();

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-orange" />
        <span className="font-display font-semibold text-xs tracking-wide text-muted-foreground uppercase">Trade History</span>
        {selectedAgentId && (
          <span className="text-[9px] font-mono text-primary/70 ml-auto">filtered by agent</span>
        )}
      </div>
      <ScrollArea className="flex-1 max-h-[320px]">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30">
              <TableHead className="text-[10px] font-mono text-muted-foreground">Type</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground">Contract</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground text-right">Entry</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground text-right">Exit</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground text-right">P/L</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground text-right">Time</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tradeHistory.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground font-mono py-4">No trades recorded yet…</TableCell></TableRow>
            )}
            {tradeHistory.map((t) => {
              const isHighlighted = selectedAgentId && tradeAgentMap[t.id] === selectedAgentId;
              const isDimmed = selectedAgentId && !isHighlighted;
              return (
                <TableRow key={t.id} className={`border-border/20 transition-all duration-300 ${isHighlighted ? "bg-primary/10 ring-1 ring-primary/20" : isDimmed ? "opacity-30" : ""}`}>
                  <TableCell className="py-2">
                    <Badge className={`text-[9px] ${t.type === "buy" ? "bg-neon-green/15 text-neon-green border-neon-green/30" : "bg-neon-red/15 text-neon-red border-neon-red/30"}`}>{t.type.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="py-2 font-mono text-xs font-semibold text-foreground">{t.asset}</TableCell>
                  <TableCell className="py-2 text-right font-mono text-xs text-foreground">${t.entryPrice.toFixed(2)}</TableCell>
                  <TableCell className="py-2 text-right font-mono text-xs text-muted-foreground">{t.exitPrice ? `$${t.exitPrice.toFixed(2)}` : "—"}</TableCell>
                  <TableCell className={`py-2 text-right font-mono text-xs font-semibold ${t.pnl === null ? "text-muted-foreground" : t.pnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                    {t.pnl === null ? "Open" : `${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(2)}`}
                  </TableCell>
                  <TableCell className="py-2 text-right text-[9px] font-mono text-muted-foreground">{formatTime(t.timestamp)}</TableCell>
                  <TableCell className="py-2 w-8">
                    <button onClick={() => deleteTrade(t.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground/40 hover:text-destructive transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </>
  );
}

function JournalPanel({
  learningNotes, deleteLearningNote, showNoteForm, setShowNoteForm, noteCategory, setNoteCategory, noteContent, setNoteContent, onAddNote,
}: {
  learningNotes: LearningNote[];
  deleteLearningNote: (id: string) => void;
  showNoteForm: boolean;
  setShowNoteForm: (v: boolean) => void;
  noteCategory: LearningNote["category"];
  setNoteCategory: (v: LearningNote["category"]) => void;
  noteContent: string;
  setNoteContent: (v: string) => void;
  onAddNote: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-purple" />
        <span className="font-display font-semibold text-xs tracking-wide text-muted-foreground uppercase">Learning Journal</span>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowNoteForm(!showNoteForm)}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>

      <AnimatePresence>
        {showNoteForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="p-3 rounded-lg bg-secondary/40 border border-border/30 space-y-2">
              <Select value={noteCategory} onValueChange={(v) => setNoteCategory(v as LearningNote["category"])}>
                <SelectTrigger className="h-7 text-[10px] font-mono bg-secondary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Insight">💡 Insight</SelectItem>
                  <SelectItem value="Mistake">⚠️ Mistake</SelectItem>
                  <SelectItem value="Adjustment">🔄 Adjustment</SelectItem>
                  <SelectItem value="Pattern">👁 Pattern</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                className="min-h-[60px] text-xs bg-secondary/30 border-border/20 resize-none"
                placeholder="Write your learning note..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) onAddNote(); }}
              />
              <div className="flex gap-1.5 justify-end">
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowNoteForm(false)}>Cancel</Button>
                <Button size="sm" className="h-6 text-[10px]" onClick={onAddNote} disabled={!noteContent.trim()}>Save Note</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollArea className="flex-1 max-h-[320px]">
        <div className="space-y-2 pr-2">
          {learningNotes.map((note) => (
            <motion.div
              key={note.id}
              className="p-3 rounded-lg bg-secondary/30 border border-border/20"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${categoryColor[note.category]}`}>
                  {categoryIcon[note.category]}
                  {note.category}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-muted-foreground">{formatTime(note.timestamp)}</span>
                  <button onClick={() => deleteLearningNote(note.id)} className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground/40 hover:text-destructive transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{note.content}</p>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </>
  );
}

function PortfolioPanel({ portfolio }: { portfolio: ReturnType<typeof useTradingSimulation>["portfolio"] }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan" />
        <span className="font-display font-semibold text-xs tracking-wide text-muted-foreground uppercase">Margin & Positions</span>
        <Wallet className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/20 text-center">
          <p className="text-[9px] font-mono text-muted-foreground uppercase mb-1">Account Balance</p>
          <p className="font-mono text-sm font-semibold text-foreground">${portfolio.accountBalance.toLocaleString()}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/20 text-center">
          <p className="text-[9px] font-mono text-muted-foreground uppercase mb-1">Available Margin</p>
          <p className={`font-mono text-sm font-semibold ${portfolio.availableMargin >= 0 ? "text-foreground" : "text-neon-red"}`}>${portfolio.availableMargin.toLocaleString()}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/20 text-center">
          <p className="text-[9px] font-mono text-muted-foreground uppercase mb-1">Used Margin</p>
          <p className="font-mono text-sm font-semibold text-neon-orange">${portfolio.usedMargin.toLocaleString()}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/20 text-center">
          <p className="text-[9px] font-mono text-muted-foreground uppercase mb-1">Utilization</p>
          <p className={`font-mono text-sm font-semibold ${portfolio.marginUtilization > 80 ? "text-neon-red" : portfolio.marginUtilization > 50 ? "text-neon-orange" : "text-neon-green"}`}>
            {portfolio.marginUtilization}%
          </p>
          <Progress value={portfolio.marginUtilization} className="h-1 mt-1" />
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] font-mono text-muted-foreground uppercase">
          P/L: <span className={`font-semibold ${portfolio.totalPnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
            {portfolio.totalPnl >= 0 ? "+" : ""}${portfolio.totalPnl.toLocaleString()} ({portfolio.totalPnlPercent >= 0 ? "+" : ""}{portfolio.totalPnlPercent.toFixed(2)}%)
          </span>
        </span>
      </div>
      <ScrollArea className="flex-1 max-h-[180px]">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30">
              <TableHead className="text-[10px] font-mono text-muted-foreground">Contract</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground text-right">Cts</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground text-right">Margin</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground text-right">P/L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {portfolio.holdings.map((h) => (
              <TableRow key={h.symbol} className="border-border/20">
                <TableCell className="py-1.5 font-mono text-xs font-semibold text-foreground">{h.symbol}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-muted-foreground">{h.contracts}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-foreground">${(h.initialMargin * h.contracts).toLocaleString()}</TableCell>
                <TableCell className={`py-1.5 text-right font-mono text-xs font-semibold ${h.pnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                  {h.pnl >= 0 ? "+" : ""}${h.pnl.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </>
  );
}

function WatchlistInner({ tickers, activeSymbols }: { tickers: ReturnType<typeof useTradingSimulation>["tickers"]; activeSymbols: string[] }) {
  return <Watchlist tickers={tickers} availableSymbols={activeSymbols} />;
}

function AnalyticsInner({ stats, tradeHistory }: { stats: ReturnType<typeof useTradingSimulation>["stats"]; tradeHistory: ReturnType<typeof useTradingSimulation>["tradeHistory"] }) {
  return <AnalyticsPanel stats={stats} tradeHistory={tradeHistory} />;
}

export default Trading;
