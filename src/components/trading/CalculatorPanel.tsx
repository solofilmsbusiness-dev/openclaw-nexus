import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_INSTRUMENTS } from "@/hooks/useTradingSimulation";

type Mode = "calc" | "tickval" | "rr" | "pnl";

export default function CalculatorPanel() {
  const [mode, setMode] = useState<Mode>("calc");
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  // Tick value mode
  const [tickVal, setTickVal] = useState({ symbol: "ES", ticks: "", contracts: "" });
  // R:R mode
  const [rr, setRr] = useState({ entry: "", stop: "", target: "" });
  // Futures P/L mode
  const [pnl, setPnl] = useState({ symbol: "ES", entry: "", exit: "", contracts: "" });

  const input = (val: string) => {
    if (fresh) { setDisplay(val === "." ? "0." : val); setFresh(false); }
    else { setDisplay((d) => d === "0" && val !== "." ? val : d + val); }
  };

  const operate = (nextOp: string) => {
    const cur = parseFloat(display);
    if (prev !== null && op) {
      const result = calc(prev, cur, op);
      setDisplay(String(result));
      setPrev(result);
    } else {
      setPrev(cur);
    }
    setOp(nextOp);
    setFresh(true);
  };

  const equals = () => {
    if (prev === null || !op) return;
    const cur = parseFloat(display);
    const result = calc(prev, cur, op);
    setDisplay(String(+result.toFixed(8)));
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  const clear = () => { setDisplay("0"); setPrev(null); setOp(null); setFresh(true); };

  const calc = (a: number, b: number, o: string) => {
    switch (o) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      case "%": return a * (b / 100);
      default: return b;
    }
  };

  const tickValResult = () => {
    const inst = ALL_INSTRUMENTS.find((i) => i.symbol === tickVal.symbol);
    const ticks = parseFloat(tickVal.ticks);
    const contracts = parseFloat(tickVal.contracts);
    if (!inst || !ticks || !contracts) return "—";
    const value = ticks * inst.pointValue * contracts;
    return `${value >= 0 ? "+" : ""}$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const tickValDetails = () => {
    const inst = ALL_INSTRUMENTS.find((i) => i.symbol === tickVal.symbol);
    if (!inst) return null;
    const tickValue = inst.pointValue * inst.tickSize;
    return { tickSize: inst.tickSize, pointValue: inst.pointValue, tickDollar: tickValue };
  };

  const rrResult = () => {
    const e = parseFloat(rr.entry);
    const s = parseFloat(rr.stop);
    const t = parseFloat(rr.target);
    if (!e || !s || !t || e === s) return "—";
    const risk = Math.abs(e - s);
    const reward = Math.abs(t - e);
    return `1:${(reward / risk).toFixed(2)}`;
  };

  const pnlResult = () => {
    const inst = ALL_INSTRUMENTS.find((i) => i.symbol === pnl.symbol);
    const e = parseFloat(pnl.entry);
    const x = parseFloat(pnl.exit);
    const ct = parseFloat(pnl.contracts);
    if (!inst || !e || !x || !ct) return "—";
    // Tick-based: ((exit - entry) / tickSize) * pointValue * contracts
    const ticks = (x - e) / inst.tickSize;
    const result = ticks * inst.pointValue * ct;
    return `${result >= 0 ? "+" : ""}$${result.toFixed(2)}`;
  };

  const modes: { key: Mode; label: string }[] = [
    { key: "calc", label: "Calc" },
    { key: "tickval", label: "Tick $" },
    { key: "rr", label: "R:R" },
    { key: "pnl", label: "P/L" },
  ];

  const BUTTONS = [
    ["7", "8", "9", "÷"],
    ["4", "5", "6", "×"],
    ["1", "2", "3", "-"],
    ["0", ".", "%", "+"],
  ];

  const details = tickValDetails();

  return (
    <div className="flex-1 flex flex-col gap-2">
      {/* Mode tabs */}
      <div className="flex gap-1">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex-1 text-[10px] font-mono py-1 rounded transition-colors ${
              mode === m.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "calc" && (
        <>
          <div className="bg-secondary/30 rounded-md px-2 py-1.5 text-right font-mono text-sm text-foreground min-h-[32px] border border-border/20 overflow-hidden">
            {op && <span className="text-muted-foreground text-[10px] mr-1">{prev} {op}</span>}
            {display}
          </div>
          <div className="grid grid-cols-4 gap-1">
            <button onClick={clear} className="col-span-2 text-[10px] font-mono py-1.5 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors">
              AC
            </button>
            <button onClick={equals} className="col-span-2 text-[10px] font-mono py-1.5 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
              =
            </button>
            {BUTTONS.map((row) =>
              row.map((btn) => {
                const isOp = ["+", "-", "×", "÷", "%"].includes(btn);
                return (
                  <button
                    key={btn}
                    onClick={() => isOp ? operate(btn) : input(btn)}
                    className={`text-xs font-mono py-1.5 rounded transition-colors ${
                      isOp
                        ? "bg-accent/50 text-accent-foreground hover:bg-accent/70"
                        : "bg-secondary/30 text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {btn}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}

      {mode === "tickval" && (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px] font-mono text-muted-foreground">Contract</Label>
            <Select value={tickVal.symbol} onValueChange={(v) => setTickVal((s) => ({ ...s, symbol: v }))}>
              <SelectTrigger className="h-7 text-xs bg-secondary/30 border-border/20 mt-0.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_INSTRUMENTS.map((inst) => (
                  <SelectItem key={inst.symbol} value={inst.symbol}>
                    <span className="font-mono">{inst.symbol}</span>
                    <span className="text-muted-foreground ml-1">— {inst.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {details && (
            <div className="flex gap-2 text-[9px] font-mono text-muted-foreground">
              <span>Tick: {details.tickSize}</span>
              <span>·</span>
              <span>Pt Val: ${details.pointValue}</span>
              <span>·</span>
              <span>$/tick: ${details.tickDollar.toFixed(2)}</span>
            </div>
          )}
          <QuickField label="Ticks" value={tickVal.ticks} onChange={(v) => setTickVal((s) => ({ ...s, ticks: v }))} />
          <QuickField label="Contracts" value={tickVal.contracts} onChange={(v) => setTickVal((s) => ({ ...s, contracts: v }))} />
          <ResultBox label="Dollar Value" value={tickValResult()} />
        </div>
      )}

      {mode === "rr" && (
        <div className="space-y-2">
          <QuickField label="Entry Price" value={rr.entry} onChange={(v) => setRr((s) => ({ ...s, entry: v }))} />
          <QuickField label="Stop Price" value={rr.stop} onChange={(v) => setRr((s) => ({ ...s, stop: v }))} />
          <QuickField label="Target Price" value={rr.target} onChange={(v) => setRr((s) => ({ ...s, target: v }))} />
          <ResultBox label="Risk:Reward" value={rrResult()} />
        </div>
      )}

      {mode === "pnl" && (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px] font-mono text-muted-foreground">Contract</Label>
            <Select value={pnl.symbol} onValueChange={(v) => setPnl((s) => ({ ...s, symbol: v }))}>
              <SelectTrigger className="h-7 text-xs bg-secondary/30 border-border/20 mt-0.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_INSTRUMENTS.map((inst) => (
                  <SelectItem key={inst.symbol} value={inst.symbol}>
                    <span className="font-mono">{inst.symbol}</span>
                    <span className="text-muted-foreground ml-1">— {inst.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <QuickField label="Entry Price" value={pnl.entry} onChange={(v) => setPnl((s) => ({ ...s, entry: v }))} />
          <QuickField label="Exit Price" value={pnl.exit} onChange={(v) => setPnl((s) => ({ ...s, exit: v }))} />
          <QuickField label="Contracts" value={pnl.contracts} onChange={(v) => setPnl((s) => ({ ...s, contracts: v }))} />
          <ResultBox label="P/L (tick-based)" value={pnlResult()} />
        </div>
      )}
    </div>
  );
}

function QuickField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[10px] font-mono text-muted-foreground">{label}</Label>
      <Input
        type="number"
        className="h-7 text-xs bg-secondary/30 border-border/20 mt-0.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
    </div>
  );
}

function ResultBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-primary/10 rounded-md px-2 py-2 border border-primary/20">
      <p className="text-[10px] font-mono text-muted-foreground">{label}</p>
      <p className="text-sm font-mono font-semibold text-primary">{value}</p>
    </div>
  );
}
