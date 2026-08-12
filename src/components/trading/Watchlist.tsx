import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, BellRing, Plus, X, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MarketTicker } from "@/hooks/useLiveTrading";

interface WatchlistItem {
  id: string;
  symbol: string;
  alertAbove: number | null;
  alertBelow: number | null;
}

// Props defined below with availableSymbols

interface WatchlistProps {
  tickers: MarketTicker[];
  availableSymbols?: string[];
}

export default function Watchlist({ tickers, availableSymbols }: WatchlistProps) {
  const AVAILABLE_SYMBOLS = availableSymbols ?? tickers.map((t) => t.symbol);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingAlert, setEditingAlert] = useState<string | null>(null);
  const [alertAbove, setAlertAbove] = useState("");
  const [alertBelow, setAlertBelow] = useState("");
  const triggeredRef = useRef<Set<string>>(new Set());

  // Load watchlist from DB
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("watchlist")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) {
        setItems(data.map((d) => ({
          id: d.id,
          symbol: d.symbol,
          alertAbove: d.alert_above != null ? Number(d.alert_above) : null,
          alertBelow: d.alert_below != null ? Number(d.alert_below) : null,
        })));
      }
    };
    load();
  }, []);

  // Check price alerts
  useEffect(() => {
    items.forEach((item) => {
      const ticker = tickers.find((t) => t.symbol === item.symbol);
      if (!ticker) return;

      if (item.alertAbove && ticker.price >= item.alertAbove) {
        const key = `${item.symbol}-above-${item.alertAbove}`;
        if (!triggeredRef.current.has(key)) {
          triggeredRef.current.add(key);
          toast.info(`🔔 ${item.symbol} hit $${item.alertAbove.toFixed(2)}! (Current: $${ticker.price.toFixed(2)})`, {
            duration: 8000,
          });
        }
      }
      if (item.alertBelow && ticker.price <= item.alertBelow) {
        const key = `${item.symbol}-below-${item.alertBelow}`;
        if (!triggeredRef.current.has(key)) {
          triggeredRef.current.add(key);
          toast.warning(`🔔 ${item.symbol} dropped to $${ticker.price.toFixed(2)}! (Alert: $${item.alertBelow.toFixed(2)})`, {
            duration: 8000,
          });
        }
      }
    });
  }, [tickers, items]);

  const addSymbol = useCallback(async (symbol: string) => {
    if (items.find((i) => i.symbol === symbol)) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase.from("watchlist").insert({
      user_id: session.user.id,
      symbol,
    }).select().single();

    if (error) {
      toast.error("Failed to add to watchlist");
      return;
    }
    setItems((prev) => [...prev, { id: data.id, symbol, alertAbove: null, alertBelow: null }]);
    setShowAdd(false);
    toast.success(`${symbol} added to watchlist`);
  }, [items]);

  const removeSymbol = useCallback(async (id: string) => {
    await supabase.from("watchlist").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const saveAlert = useCallback(async (id: string) => {
    const above = alertAbove ? parseFloat(alertAbove) : null;
    const below = alertBelow ? parseFloat(alertBelow) : null;

    await supabase.from("watchlist").update({
      alert_above: above,
      alert_below: below,
    }).eq("id", id);

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, alertAbove: above, alertBelow: below } : i))
    );
    // Reset triggered alerts for this symbol when thresholds change
    const item = items.find((i) => i.id === id);
    if (item) {
      triggeredRef.current.forEach((key) => {
        if (key.startsWith(item.symbol)) triggeredRef.current.delete(key);
      });
    }
    setEditingAlert(null);
    toast.success("Price alert updated");
  }, [alertAbove, alertBelow, items]);

  const watchedSymbols = new Set(items.map((i) => i.symbol));
  const availableToAdd = AVAILABLE_SYMBOLS.filter((s) => !watchedSymbols.has(s));

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-orange" />
        <span className="font-display font-semibold text-xs tracking-wide text-muted-foreground uppercase">
          Watchlist
        </span>
        <Star className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="p-1 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Add ticker dropdown */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-secondary/30 border border-border/20">
              {availableToAdd.length === 0 && (
                <span className="text-[10px] font-mono text-muted-foreground">All tickers added</span>
              )}
              {availableToAdd.map((sym) => (
                <button
                  key={sym}
                  onClick={() => addSymbol(sym)}
                  className="px-2 py-1 rounded-md bg-secondary/50 hover:bg-primary/20 border border-border/30 hover:border-primary/40 text-[10px] font-mono font-semibold text-foreground transition-colors"
                >
                  + {sym}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollArea className="flex-1 max-h-[360px]">
        <div className="space-y-2 pr-2">
          {items.length === 0 && (
            <div className="text-center py-8">
              <Star className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-mono">No watchlist items</p>
              <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">Click + to add tickers</p>
            </div>
          )}
          <AnimatePresence>
            {items.map((item) => {
              const ticker = tickers.find((t) => t.symbol === item.symbol);
              const price = ticker?.price ?? 0;
              const change = ticker?.changePercent ?? 0;
              const isEditing = editingAlert === item.id;
              const hasAlert = item.alertAbove != null || item.alertBelow != null;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="p-3 rounded-lg bg-secondary/30 border border-border/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-xs text-foreground">{item.symbol}</span>
                      <span className="font-mono text-xs text-foreground">${price.toFixed(2)}</span>
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono ${change >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                        {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(change).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (isEditing) {
                            setEditingAlert(null);
                          } else {
                            setEditingAlert(item.id);
                            setAlertAbove(item.alertAbove?.toString() ?? "");
                            setAlertBelow(item.alertBelow?.toString() ?? "");
                          }
                        }}
                        className={`p-1 rounded-md hover:bg-secondary/50 transition-colors ${hasAlert ? "text-neon-orange" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {hasAlert ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => removeSymbol(item.id)}
                        className="p-1 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Alert badges */}
                  {!isEditing && hasAlert && (
                    <div className="flex gap-1.5 mt-2">
                      {item.alertAbove != null && (
                        <Badge className="text-[9px] bg-neon-green/10 text-neon-green border-neon-green/30 gap-0.5">
                          <ArrowUp className="w-2.5 h-2.5" /> ${item.alertAbove.toFixed(2)}
                        </Badge>
                      )}
                      {item.alertBelow != null && (
                        <Badge className="text-[9px] bg-neon-red/10 text-neon-red border-neon-red/30 gap-0.5">
                          <ArrowDown className="w-2.5 h-2.5" /> ${item.alertBelow.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Alert editor */}
                  <AnimatePresence>
                    {isEditing && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 pt-2 border-t border-border/20 space-y-2">
                          <div className="flex items-center gap-2">
                            <ArrowUp className="w-3 h-3 text-neon-green shrink-0" />
                            <span className="text-[9px] font-mono text-muted-foreground w-12">Above</span>
                            <input
                              type="number"
                              step="0.01"
                              value={alertAbove}
                              onChange={(e) => setAlertAbove(e.target.value)}
                              placeholder={`e.g. ${(price * 1.05).toFixed(2)}`}
                              className="flex-1 h-7 px-2 rounded border border-border/40 bg-secondary/20 text-foreground font-mono text-[11px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowDown className="w-3 h-3 text-neon-red shrink-0" />
                            <span className="text-[9px] font-mono text-muted-foreground w-12">Below</span>
                            <input
                              type="number"
                              step="0.01"
                              value={alertBelow}
                              onChange={(e) => setAlertBelow(e.target.value)}
                              placeholder={`e.g. ${(price * 0.95).toFixed(2)}`}
                              className="flex-1 h-7 px-2 rounded border border-border/40 bg-secondary/20 text-foreground font-mono text-[11px] placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
                            />
                          </div>
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => setEditingAlert(null)}
                              className="px-2 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveAlert(item.id)}
                              className="px-3 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-mono font-semibold transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </>

  );
}
