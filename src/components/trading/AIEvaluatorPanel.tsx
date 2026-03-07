import { useState, useCallback } from "react";
import { Brain, TrendingUp, TrendingDown, Minus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ALL_INSTRUMENTS } from "@/hooks/useTradingSimulation";
import { toast } from "sonner";

interface Evaluation {
  symbol: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  support_levels: number[];
  resistance_levels: number[];
  risk_factors: string[];
  trade_idea: string;
  timestamp: Date;
}

const SENTIMENT_CONFIG = {
  bullish: { icon: TrendingUp, color: "bg-neon-green/15 text-neon-green border-neon-green/30", label: "Bullish" },
  bearish: { icon: TrendingDown, color: "bg-neon-red/15 text-neon-red border-neon-red/30", label: "Bearish" },
  neutral: { icon: Minus, color: "bg-neon-orange/15 text-neon-orange border-neon-orange/30", label: "Neutral" },
};

export default function AIEvaluatorPanel() {
  const [symbol, setSymbol] = useState("");
  const [customSymbol, setCustomSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<Evaluation | null>(null);
  const [history, setHistory] = useState<Evaluation[]>([]);

  const effectiveSymbol = symbol === "__custom" ? customSymbol.trim().toUpperCase() : symbol;

  const evaluate = useCallback(async () => {
    if (!effectiveSymbol) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-evaluate", {
        body: { symbol: effectiveSymbol },
      });

      if (error) {
        toast.error("Evaluation failed", { description: error.message });
        return;
      }

      if (data?.error) {
        toast.error("Evaluation failed", { description: data.error });
        return;
      }

      const eval_: Evaluation = {
        symbol: effectiveSymbol,
        ...data.evaluation,
        timestamp: new Date(),
      };
      setCurrent(eval_);
      setHistory((prev) => [eval_, ...prev].slice(0, 3));
    } catch (e) {
      toast.error("Failed to evaluate", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  }, [effectiveSymbol]);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-xs tracking-wide text-muted-foreground uppercase">
            AI Stock Evaluator
          </span>
        </div>

        {/* Symbol input */}
        <div className="flex gap-2">
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Select symbol" />
            </SelectTrigger>
            <SelectContent>
              {ALL_INSTRUMENTS.map((inst) => (
                <SelectItem key={inst.symbol} value={inst.symbol}>
                  <span className="font-mono">{inst.symbol}</span>
                  <span className="text-muted-foreground ml-1.5">— {inst.name}</span>
                </SelectItem>
              ))}
              <SelectItem value="__custom">Custom symbol…</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={evaluate} disabled={loading || !effectiveSymbol}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Evaluate
          </Button>
        </div>

        {symbol === "__custom" && (
          <Input
            className="h-8 text-xs font-mono"
            placeholder="Enter ticker (e.g. AAPL, TSLA)"
            value={customSymbol}
            onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
          />
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3 pt-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {/* Results */}
        {current && !loading && <EvaluationCard eval_={current} />}

        {/* History */}
        {history.length > 1 && !loading && (
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Recent</p>
            {history.slice(1).map((ev, i) => (
              <button
                key={i}
                onClick={() => setCurrent(ev)}
                className="w-full flex items-center gap-2 rounded-md border border-border/30 p-2 text-left hover:bg-secondary/30 transition-colors"
              >
                <span className="font-mono text-xs font-semibold text-foreground">{ev.symbol}</span>
                <Badge variant="outline" className={`text-[9px] ${SENTIMENT_CONFIG[ev.sentiment].color}`}>
                  {SENTIMENT_CONFIG[ev.sentiment].label}
                </Badge>
                <span className="ml-auto text-[9px] text-muted-foreground font-mono">
                  {ev.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function EvaluationCard({ eval_ }: { eval_: Evaluation }) {
  const sentCfg = SENTIMENT_CONFIG[eval_.sentiment];
  const SentIcon = sentCfg.icon;

  return (
    <div className="space-y-3 rounded-lg border border-border/40 bg-secondary/20 p-3">
      {/* Sentiment + confidence */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-foreground">{eval_.symbol}</span>
          <Badge variant="outline" className={`gap-1 ${sentCfg.color}`}>
            <SentIcon className="w-3 h-3" />
            {sentCfg.label}
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          {eval_.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">Confidence</span>
          <span className="text-[10px] font-mono font-semibold text-foreground">{eval_.confidence}%</span>
        </div>
        <Progress value={eval_.confidence} className="h-1.5" />
      </div>

      {/* S/R Levels */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-neon-green uppercase">Support</span>
          {eval_.support_levels.map((lvl, i) => (
            <p key={i} className="text-xs font-mono text-foreground">${lvl.toLocaleString()}</p>
          ))}
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-neon-red uppercase">Resistance</span>
          {eval_.resistance_levels.map((lvl, i) => (
            <p key={i} className="text-xs font-mono text-foreground">${lvl.toLocaleString()}</p>
          ))}
        </div>
      </div>

      {/* Risk factors */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-muted-foreground uppercase">Risk Factors</span>
        <ul className="space-y-0.5">
          {eval_.risk_factors.map((rf, i) => (
            <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
              <span className="text-neon-orange mt-0.5">•</span>
              {rf}
            </li>
          ))}
        </ul>
      </div>

      {/* Trade idea */}
      <div className="rounded-md bg-primary/5 border border-primary/20 p-2">
        <span className="text-[10px] font-mono text-primary uppercase block mb-1">Trade Idea</span>
        <p className="text-xs text-foreground leading-relaxed">{eval_.trade_idea}</p>
      </div>
    </div>
  );
}
