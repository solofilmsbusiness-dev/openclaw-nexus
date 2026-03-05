import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  ArrowLeft, TrendingUp, TrendingDown, Activity, DollarSign, BarChart3,
  Target, Brain, BookOpen, Zap, AlertTriangle, Lightbulb, RefreshCw, Eye,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTradingSimulation } from "@/hooks/useTradingSimulation";
import type { LearningNote } from "@/hooks/useTradingSimulation";

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

const Trading = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const { tickers, evaluations, considerations, executedTrades, tradeHistory, learningNotes, stats } =
    useTradingSimulation();

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/login", { replace: true });
      else setAuthChecked(true);
    };
    check();
  }, [navigate]);

  if (!authChecked) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="font-mono text-xs text-muted-foreground tracking-wider">Loading Trading…</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-3 glass-panel rounded-none border-x-0 border-t-0">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-mono hidden sm:inline">Dashboard</span>
        </button>
        <div className="h-5 w-px bg-border/50" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse-glow" />
          <span className="font-display font-semibold text-xs sm:text-sm tracking-wide text-foreground">Trading Analytics</span>
        </div>
        <div className="h-5 w-px bg-border/50 hidden sm:block" />

        {/* Stats */}
        <motion.div className="flex items-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <DollarSign className={`w-4 h-4 ${stats.totalPnl >= 0 ? "text-neon-green" : "text-neon-red"}`} />
          <span className="text-xs text-muted-foreground hidden sm:inline">P/L</span>
          <span className={`font-mono text-sm font-semibold ${stats.totalPnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
            {stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}
          </span>
        </motion.div>
        <motion.div className="flex items-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <BarChart3 className="w-4 h-4 text-neon-blue" />
          <span className="text-xs text-muted-foreground hidden sm:inline">Trades</span>
          <span className="font-mono text-sm font-semibold text-neon-blue">{stats.totalTrades}</span>
        </motion.div>
        <motion.div className="flex items-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Target className="w-4 h-4 text-neon-cyan" />
          <span className="text-xs text-muted-foreground hidden sm:inline">Win Rate</span>
          <span className="font-mono text-sm font-semibold text-neon-cyan">{stats.winRate}%</span>
        </motion.div>

        <div className="ml-auto flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse-glow" />
          <span className="text-[10px] sm:text-xs text-muted-foreground font-mono">Live</span>
        </div>
      </div>

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 min-h-0 overflow-auto">
        {/* Market Data Panel */}
        <motion.div className="glass-panel neon-border p-4 flex flex-col min-h-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
            <span className="font-display font-semibold text-xs tracking-wide text-muted-foreground uppercase">Live Market Data</span>
          </div>
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-[10px] font-mono text-muted-foreground">Symbol</TableHead>
                  <TableHead className="text-[10px] font-mono text-muted-foreground text-right">Price</TableHead>
                  <TableHead className="text-[10px] font-mono text-muted-foreground text-right">Change</TableHead>
                  <TableHead className="text-[10px] font-mono text-muted-foreground text-right">%</TableHead>
                  <TableHead className="text-[10px] font-mono text-muted-foreground text-right hidden sm:table-cell">Vol</TableHead>
                  <TableHead className="text-[10px] font-mono text-muted-foreground w-20">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickers.map((t) => (
                  <TableRow key={t.symbol} className="border-border/20 hover:bg-secondary/30">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-xs text-foreground">{t.symbol}</span>
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
                    <TableCell className="py-2 text-right font-mono text-[10px] text-muted-foreground hidden sm:table-cell">{formatVol(t.volume)}</TableCell>
                    <TableCell className="py-2 w-20">
                      <ResponsiveContainer width="100%" height={24}>
                        <LineChart data={t.history.map((v, i) => ({ v, i }))}>
                          <Line
                            type="monotone"
                            dataKey="v"
                            stroke={t.change >= 0 ? "hsl(var(--neon-green))" : "hsl(var(--neon-red))"}
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </motion.div>

        {/* Trading Agent Panel */}
        <motion.div className="glass-panel neon-border p-4 flex flex-col min-h-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
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
                          <span
                            key={i}
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                              ind.signal === "bullish"
                                ? "bg-neon-green/10 text-neon-green border-neon-green/30"
                                : ind.signal === "bearish"
                                ? "bg-neon-red/10 text-neon-red border-neon-red/30"
                                : "bg-muted text-muted-foreground border-border/30"
                            }`}
                          >
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
                          <Badge className={`text-[9px] ${c.action === "buy" ? "bg-neon-green/15 text-neon-green border-neon-green/30" : "bg-neon-red/15 text-neon-red border-neon-red/30"}`}>
                            {c.action.toUpperCase()}
                          </Badge>
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
                        <Badge className={`text-[9px] ${t.action === "buy" ? "bg-neon-green/15 text-neon-green border-neon-green/30" : "bg-neon-red/15 text-neon-red border-neon-red/30"}`}>
                          {t.action.toUpperCase()}
                        </Badge>
                        <span className="font-mono font-semibold text-xs text-foreground">{t.symbol}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-foreground">${t.price.toFixed(2)}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">×{t.quantity}</span>
                        <span className="text-[9px] font-mono text-muted-foreground">{formatTime(t.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Trade History Log */}
        <motion.div className="glass-panel neon-border p-4 flex flex-col min-h-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-orange" />
            <span className="font-display font-semibold text-xs tracking-wide text-muted-foreground uppercase">Trade History</span>
          </div>
          <ScrollArea className="flex-1 max-h-[320px]">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-[10px] font-mono text-muted-foreground">Type</TableHead>
                  <TableHead className="text-[10px] font-mono text-muted-foreground">Asset</TableHead>
                  <TableHead className="text-[10px] font-mono text-muted-foreground text-right">Entry</TableHead>
                  <TableHead className="text-[10px] font-mono text-muted-foreground text-right">Exit</TableHead>
                  <TableHead className="text-[10px] font-mono text-muted-foreground text-right">P/L</TableHead>
                  <TableHead className="text-[10px] font-mono text-muted-foreground text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tradeHistory.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground font-mono py-4">No trades recorded yet…</TableCell></TableRow>
                )}
                {tradeHistory.map((t) => (
                  <TableRow key={t.id} className="border-border/20">
                    <TableCell className="py-2">
                      <Badge className={`text-[9px] ${t.type === "buy" ? "bg-neon-green/15 text-neon-green border-neon-green/30" : "bg-neon-red/15 text-neon-red border-neon-red/30"}`}>
                        {t.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 font-mono text-xs font-semibold text-foreground">{t.asset}</TableCell>
                    <TableCell className="py-2 text-right font-mono text-xs text-foreground">${t.entryPrice.toFixed(2)}</TableCell>
                    <TableCell className="py-2 text-right font-mono text-xs text-muted-foreground">{t.exitPrice ? `$${t.exitPrice.toFixed(2)}` : "—"}</TableCell>
                    <TableCell className={`py-2 text-right font-mono text-xs font-semibold ${t.pnl === null ? "text-muted-foreground" : t.pnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                      {t.pnl === null ? "Open" : `${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(2)}`}
                    </TableCell>
                    <TableCell className="py-2 text-right text-[9px] font-mono text-muted-foreground">{formatTime(t.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </motion.div>

        {/* Learning Notes */}
        <motion.div className="glass-panel neon-border p-4 flex flex-col min-h-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-purple" />
            <span className="font-display font-semibold text-xs tracking-wide text-muted-foreground uppercase">Learning Journal</span>
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
          </div>
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
                    <span className="text-[9px] font-mono text-muted-foreground">{formatTime(note.timestamp)}</span>
                  </div>
                  <p className="text-[11px] text-foreground/80 leading-relaxed">{note.content}</p>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </motion.div>
      </div>
    </div>
  );
};

export default Trading;
