import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Plus, FileText, Globe, CheckSquare, RotateCcw, ClipboardList, Shield, PenLine, Target, CalendarDays, TrendingUp, BookOpen, Clock, Link, ChevronRight, Network, Calculator, Search } from "lucide-react";
import { useTradingLayout, type CustomPanelType, type BuiltinPanelId } from "@/contexts/TradingLayoutContext";
import TemplatePreview from "./TemplatePreview";

const BUILTIN_LABELS: Record<BuiltinPanelId, string> = {
  market: "Live Market Data",
  agent: "Trading Agent",
  history: "Trade History",
  journal: "Learning Journal",
  portfolio: "Portfolio Summary",
  watchlist: "Watchlist",
  analytics: "Analytics",
};

interface PremadeTemplate {
  key: string;
  title: string;
  description: string;
  icon: React.ElementType;
  type: CustomPanelType;
  content: string;
}

const PREMADE_TEMPLATES: PremadeTemplate[] = [
  {
    key: "trade-plan",
    title: "Trade Plan",
    description: "Entry/exit criteria & risk/reward",
    icon: ClipboardList,
    type: "notes",
    content: `## Trade Plan\n\n**Ticker:** \n**Date:** \n\n### Entry Criteria\n- Setup: \n- Trigger: \n- Confirmation: \n\n### Exit Criteria\n- Target: \n- Stop-Loss: \n\n### Risk / Reward\n- Risk: \n- Reward: \n- R:R Ratio: \n\n### Position Size\n- Account risk %: \n- Share count: \n- Dollar risk: `,
  },
  {
    key: "pre-market-checklist",
    title: "Pre-Market Checklist",
    description: "Daily prep before market open",
    icon: CheckSquare,
    type: "checklist",
    content: JSON.stringify([
      { text: "Check overnight news & futures", done: false },
      { text: "Review watchlist for gaps/setups", done: false },
      { text: "Set price alerts on key levels", done: false },
      { text: "Check economic calendar events", done: false },
      { text: "Review open positions & stops", done: false },
    ]),
  },
  {
    key: "risk-management",
    title: "Risk Management",
    description: "Rules to protect your capital",
    icon: Shield,
    type: "notes",
    content: `## Risk Management Rules\n\n### Daily Limits\n- Max daily loss: $___\n- Max trades per day: ___\n- Stop trading after ___ consecutive losses\n\n### Position Sizing\n- Max risk per trade: ___% of account\n- Max position size: ___% of portfolio\n- Scale-in rules: \n\n### Stop-Loss Rules\n- Always use stops: ✅\n- Max stop distance: \n- Trailing stop strategy: \n\n### Review Triggers\n- If down ___% for the week → reduce size\n- If up ___% for the month → lock in profits`,
  },
  {
    key: "trade-review",
    title: "Trade Review",
    description: "Post-trade analysis template",
    icon: PenLine,
    type: "notes",
    content: `## Trade Review\n\n**Date:** \n**Ticker:** \n**P/L:** \n\n### What Went Well\n- \n\n### What Went Wrong\n- \n\n### Lessons Learned\n- \n\n### Action Items\n- [ ] \n- [ ] `,
  },
  {
    key: "daily-goals",
    title: "Daily Goals",
    description: "Track your daily trading objectives",
    icon: Target,
    type: "checklist",
    content: JSON.stringify([
      { text: "Set daily P/L target", done: false },
      { text: "Identify key support/resistance levels", done: false },
      { text: "Review and follow strategy rules", done: false },
      { text: "Log all trades with notes", done: false },
    ]),
  },
  {
    key: "economic-calendar",
    title: "Economic Calendar",
    description: "Upcoming market-moving events",
    icon: CalendarDays,
    type: "embed",
    content: "https://www.tradingview.com/embed-widget/events/",
  },
  {
    key: "market-sentiment",
    title: "Market Sentiment",
    description: "Track overall market bias & levels",
    icon: TrendingUp,
    type: "notes",
    content: `## Market Sentiment\n\n**Date:** \n**Overall Bias:** Bullish / Bearish / Neutral\n\n### Key Levels\n- SPY Support: \n- SPY Resistance: \n- VIX Level: \n\n### Sector Rotation\n- Strong sectors: \n- Weak sectors: \n\n### Notes\n- `,
  },
  {
    key: "strategy-playbook",
    title: "Strategy Playbook",
    description: "Document your trading strategies",
    icon: BookOpen,
    type: "notes",
    content: `## Strategy Playbook\n\n### Strategy Name\n_______\n\n### Setup Conditions\n1. \n2. \n3. \n\n### Entry Rules\n- Trigger: \n- Confirmation: \n- Time of day: \n\n### Exit Rules\n- Profit target: \n- Stop-loss: \n- Time stop: \n\n### Example\n- Ticker: \n- Date: \n- Outcome: `,
  },
  {
    key: "session-log",
    title: "Session Log",
    description: "Track your trading session flow",
    icon: Clock,
    type: "checklist",
    content: JSON.stringify([
      { text: "Pre-market prep complete", done: false },
      { text: "Morning session review", done: false },
      { text: "Midday check-in & adjustments", done: false },
      { text: "End-of-day position review", done: false },
      { text: "Journal entry written", done: false },
    ]),
  },
  {
    key: "quick-links",
    title: "Quick Links",
    description: "Embed your favorite trading resource",
    icon: Link,
    type: "embed",
    content: "https://finviz.com/map.ashx",
  },
  {
    key: "agent-trade",
    title: "Agent Trade",
    description: "Live agent trade flow tracker",
    icon: Network,
    type: "graph" as CustomPanelType,
    content: "",
  },
  {
    key: "calculator",
    title: "Calculator",
    description: "Quick trading calculations & position sizing",
    icon: Calculator,
    type: "calculator" as CustomPanelType,
    content: "",
  },
];

export default function AddPanelDialog() {
  const { addCustomPanel, hiddenBuiltins, restorePanel } = useTradingLayout();
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CustomPanelType>("notes");
  const [embedUrl, setEmbedUrl] = useState("");

  const handleTemplate = (tpl: PremadeTemplate) => {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    addCustomPanel({ id, title: tpl.title, type: tpl.type, content: tpl.content });
    setOpen(false);
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    addCustomPanel({
      id,
      title: title.trim(),
      type,
      content: type === "embed" ? embedUrl : type === "checklist" ? "[]" : "",
    });
    setTitle("");
    setEmbedUrl("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs font-mono border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5">
          <Plus className="w-3.5 h-3.5" /> Add Panel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-sm">Add Panel</DialogTitle>
         </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="h-8 text-xs pl-8"
            placeholder="Search panels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Restore hidden builtins */}
        {hiddenBuiltins.filter((id) => {
          if (!search) return true;
          const label = BUILTIN_LABELS[id as BuiltinPanelId] || id;
          return label.toLowerCase().includes(search.toLowerCase());
        }).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Restore hidden panels:</p>
            <div className="flex flex-wrap gap-1.5">
              {hiddenBuiltins
                .filter((id) => {
                  if (!search) return true;
                  const label = BUILTIN_LABELS[id as BuiltinPanelId] || id;
                  return label.toLowerCase().includes(search.toLowerCase());
                })
                .map((id) => (
                  <Button key={id} variant="secondary" size="sm" className="text-[10px] gap-1 h-7" onClick={() => { restorePanel(id); setOpen(false); }}>
                    <RotateCcw className="w-3 h-3" /> {BUILTIN_LABELS[id as BuiltinPanelId] || id}
                  </Button>
                ))}
            </div>
            <div className="border-t border-border/30 my-2" />
          </div>
        )}

        {/* Templates grid */}
        {(() => {
          const filtered = PREMADE_TEMPLATES.filter((t) => {
            if (!search) return true;
            const q = search.toLowerCase();
            return [t.title, t.description, t.type].some((s) => s.toLowerCase().includes(q));
          });
          return (
            <div className="space-y-2">
              <p className="text-xs font-mono text-muted-foreground">Templates</p>
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No panels match "{search}"</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filtered.map((tpl) => {
                    const Icon = tpl.icon;
                    return (
                      <HoverCard key={tpl.key} openDelay={300} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <button
                            onClick={() => handleTemplate(tpl)}
                            className="flex items-start gap-2.5 rounded-md border border-border/50 p-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Icon className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium leading-tight truncate">{tpl.title}</p>
                              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{tpl.description}</p>
                            </div>
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent side="right" sideOffset={8} className="w-60 p-3 border-border/50 bg-popover/95 backdrop-blur-sm">
                          <p className="text-[11px] font-medium text-foreground mb-2">{tpl.title}</p>
                          <div className="max-h-40 overflow-hidden">
                            <TemplatePreview template={tpl} />
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        <div className="border-t border-border/30" />

        {/* Custom panel collapsible */}
        <Collapsible open={customOpen} onOpenChange={setCustomOpen}>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors w-full">
            <ChevronRight className={`w-3 h-3 transition-transform ${customOpen ? "rotate-90" : ""}`} />
            Create Custom Panel
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <div>
              <Label className="text-xs font-mono">Title</Label>
              <Input className="mt-1 h-8 text-xs" placeholder="My Custom Panel" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-mono">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as CustomPanelType)}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notes"><span className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> Notes</span></SelectItem>
                  <SelectItem value="embed"><span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> Embed (URL)</span></SelectItem>
                  <SelectItem value="checklist"><span className="flex items-center gap-1.5"><CheckSquare className="w-3 h-3" /> Checklist</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === "embed" && (
              <div>
                <Label className="text-xs font-mono">URL</Label>
                <Input className="mt-1 h-8 text-xs" placeholder="https://..." value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} />
              </div>
            )}
            <Button className="w-full" size="sm" onClick={handleCreate} disabled={!title.trim()}>
              Create Panel
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </DialogContent>
    </Dialog>
  );
}
