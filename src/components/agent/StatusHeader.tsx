import { Activity, Ban, Briefcase, DollarSign, Power } from "lucide-react";
import type { Config } from "@/hooks/useAgentLive";
import { fmtMoney } from "@/lib/agentLang";

interface Props {
  config: Config | null;
  todayPnl: number;
  todayTrades: number;
  openCount: number;
}

export default function StatusHeader({ config, todayPnl, todayTrades, openCount }: Props) {
  const killed = Boolean(config?.kill_switch);
  const armed = Boolean(config?.auto_trade) && !killed;
  const practice = (config?.topstep_account_search ?? "PRAC").toUpperCase().includes("PRAC");

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
      <span className="flex items-center gap-1.5 font-semibold">
        <span
          className={`h-2 w-2 rounded-full ${killed ? "bg-neon-red" : armed ? "bg-neon-green animate-pulse" : "bg-neon-orange"}`}
        />
        {killed ? "STOPPED" : armed ? "LIVE" : "OBSERVING"}
      </span>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Power className="w-3 h-3" /> auto-trade {config?.auto_trade ? "ON" : "OFF"}
      </span>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Briefcase className="w-3 h-3" />
        {practice ? "practice account" : "NON-PRACTICE account"} · {config?.paper_symbol ?? "MNQ"}
      </span>
      <span className={`flex items-center gap-1.5 ${killed ? "text-neon-red" : "text-muted-foreground"}`}>
        <Ban className="w-3 h-3" /> kill switch {killed ? "ENGAGED" : "off"}
      </span>
      <span className={`flex items-center gap-1.5 font-mono ${todayPnl > 0 ? "text-neon-green" : todayPnl < 0 ? "text-neon-red" : "text-muted-foreground"}`}>
        <DollarSign className="w-3 h-3" /> today {fmtMoney(todayPnl)}
      </span>
      <span className="flex items-center gap-1.5 text-muted-foreground font-mono">
        <Activity className="w-3 h-3" /> {todayTrades} trades today · {openCount} open
      </span>
    </div>
  );
}