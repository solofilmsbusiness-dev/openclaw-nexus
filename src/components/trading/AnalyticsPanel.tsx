import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, TrendingDown, Flame, Timer, Activity, Award, Percent,
} from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, Tooltip as ReTooltip, Cell } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AnalyticsPanelProps {
  stats: {
    totalPnl: number;
    totalTrades: number;
    winRate: number;
    wins: number;
    losses: number;
    maxWinStreak: number;
    maxLossStreak: number;
    currentStreak: number;
    currentStreakType: "win" | "loss" | null;
    avgDurationSec: number;
    sharpeRatio: number;
    profitFactor: number;
    avgWin: number;
    avgLoss: number;
  };
  tradeHistory: { pnl: number | null; timestamp: Date }[];
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}h`;
}

export default function AnalyticsPanel({ stats, tradeHistory }: AnalyticsPanelProps) {
  // Build PnL distribution for bar chart (last 20 closed trades)
  const closedTrades = tradeHistory
    .filter((t) => t.pnl !== null)
    .slice(0, 20)
    .reverse();

  const pnlData = closedTrades.map((t, i) => ({
    idx: i + 1,
    pnl: t.pnl!,
  }));

  const metrics = [
    {
      label: "Win Rate",
      value: `${stats.winRate}%`,
      icon: <Percent className="w-3.5 h-3.5" />,
      color: stats.winRate >= 50 ? "text-neon-green" : "text-neon-red",
    },
    {
      label: "Sharpe Ratio",
      value: stats.sharpeRatio.toFixed(2),
      icon: <Activity className="w-3.5 h-3.5" />,
      color: stats.sharpeRatio >= 1 ? "text-neon-green" : stats.sharpeRatio >= 0 ? "text-neon-orange" : "text-neon-red",
    },
    {
      label: "Profit Factor",
      value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2),
      icon: <Award className="w-3.5 h-3.5" />,
      color: stats.profitFactor >= 1.5 ? "text-neon-green" : stats.profitFactor >= 1 ? "text-neon-orange" : "text-neon-red",
    },
    {
      label: "Avg Duration",
      value: formatDuration(stats.avgDurationSec),
      icon: <Timer className="w-3.5 h-3.5" />,
      color: "text-neon-cyan",
    },
  ];

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-blue" />
        <span className="font-display font-semibold text-xs tracking-wide text-muted-foreground uppercase">
          Performance Analytics
        </span>
        <BarChart3 className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
      </div>

      <ScrollArea className="flex-1 max-h-[380px]">
        <div className="space-y-4 pr-2">
          {/* Key metrics grid */}
          <div className="grid grid-cols-2 gap-2">
            {metrics.map((m) => (
              <div key={m.label} className="p-2.5 rounded-lg bg-secondary/30 border border-border/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`${m.color}`}>{m.icon}</span>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">{m.label}</span>
                </div>
                <p className={`font-mono text-lg font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Streaks */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/20">
            <div className="flex items-center gap-1.5 mb-3">
              <Flame className="w-3.5 h-3.5 text-neon-orange" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Streaks</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-[9px] font-mono text-muted-foreground mb-0.5">Current</p>
                <div className="flex items-center justify-center gap-1">
                  {stats.currentStreakType === "win" ? (
                    <TrendingUp className="w-3 h-3 text-neon-green" />
                  ) : stats.currentStreakType === "loss" ? (
                    <TrendingDown className="w-3 h-3 text-neon-red" />
                  ) : null}
                  <span className={`font-mono text-sm font-bold ${
                    stats.currentStreakType === "win" ? "text-neon-green" : stats.currentStreakType === "loss" ? "text-neon-red" : "text-muted-foreground"
                  }`}>
                    {stats.currentStreak || "—"}
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-mono text-muted-foreground mb-0.5">Best Win</p>
                <span className="font-mono text-sm font-bold text-neon-green">{stats.maxWinStreak || "—"}</span>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-mono text-muted-foreground mb-0.5">Worst Loss</p>
                <span className="font-mono text-sm font-bold text-neon-red">{stats.maxLossStreak || "—"}</span>
              </div>
            </div>
          </div>

          {/* Win/Loss breakdown */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Win / Loss</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {stats.wins}W — {stats.losses}L
              </span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-secondary/50">
              {stats.wins + stats.losses > 0 && (
                <>
                  <div
                    className="bg-neon-green/70 transition-all duration-500"
                    style={{ width: `${(stats.wins / (stats.wins + stats.losses)) * 100}%` }}
                  />
                  <div
                    className="bg-neon-red/70 transition-all duration-500"
                    style={{ width: `${(stats.losses / (stats.wins + stats.losses)) * 100}%` }}
                  />
                </>
              )}
            </div>
            <div className="flex justify-between mt-2">
              <div>
                <span className="text-[9px] font-mono text-muted-foreground">Avg Win</span>
                <p className="font-mono text-xs font-semibold text-neon-green">+${stats.avgWin.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono text-muted-foreground">Avg Loss</span>
                <p className="font-mono text-xs font-semibold text-neon-red">-${stats.avgLoss.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* PnL distribution bar chart */}
          {pnlData.length > 0 && (
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/20">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block mb-2">
                Recent P/L Distribution
              </span>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnlData} barSize={8}>
                    <ReTooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 11,
                        fontFamily: "monospace",
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "P/L"]}
                      labelFormatter={(label) => `Trade #${label}`}
                    />
                    <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                      {pnlData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.pnl >= 0 ? "hsl(var(--neon-green))" : "hsl(var(--neon-red))"}
                          opacity={0.7}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
}
