import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, SkipForward } from "lucide-react";

const STORAGE_KEY = "solo-os-onboarding-done";

const STEPS = [
  {
    target: "metrics-bar",
    title: "Metrics Bar",
    description: "Monitor your agents' health at a glance — total, healthy, active, degraded, and down.",
    position: "bottom" as const,
  },
  {
    target: "agent-cards",
    title: "Agent Cards",
    description: "Browse and manage your agents. Click one to select it in the graph, or add new agents.",
    position: "right" as const,
  },
  {
    target: "agent-graph",
    title: "Node Graph",
    description: "The living network map. Drag nodes to rearrange, scroll to zoom, and click nodes to inspect.",
    position: "bottom" as const,
  },
  {
    target: "graph-connect",
    title: "Connect Mode",
    description: "Enter Connect mode to link agents. Click a source node, then a target, and pick a connection type.",
    position: "bottom" as const,
  },
  {
    target: "graph-tools",
    title: "Graph Tools",
    description: "Zoom in/out, reset view, lock the layout, kill/revive all agents, or save/load configurations.",
    position: "left" as const,
  },
  {
    target: "event-timeline",
    title: "Event Timeline",
    description: "Real-time event feed — filter by clicking an agent name. Shows status changes, messages, and alerts.",
    position: "left" as const,
  },
  {
    target: "terminal-log",
    title: "System Log",
    description: "Raw terminal output of all system events. Scroll to review the latest 30 entries.",
    position: "left" as const,
  },
  {
    target: "cmd-k",
    title: "Command Palette",
    description: "Press ⌘K to quickly search agents and run actions from anywhere.",
    position: "top" as const,
  },
];

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const finish = useCallback(() => {
    setActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const measure = useCallback((index: number) => {
    const el = document.querySelector(`[data-tour="${STEPS[index].target}"]`);
    if (el) setRect(el.getBoundingClientRect());
  }, []);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => {
      setActive(true);
      measure(0);
    }, 1000);
    return () => clearTimeout(timer);
  }, [measure]);

  useEffect(() => {
    if (!active) return;
    const onResize = () => measure(step);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, step, measure]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goBack();
      else if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, step]);

  const goBack = () => {
    if (step > 0) {
      const prev = step - 1;
      setStep(prev);
      measure(prev);
    }
  };

  const goNext = () => {
    if (step >= STEPS.length - 1) {
      finish();
    } else {
      const next = step + 1;
      setStep(next);
      measure(next);
    }
  };

  if (!active || !rect) return null;

  const pad = 8;
  const current = STEPS[step];

  // Tooltip positioning
  const tooltip = (() => {
    const style: React.CSSProperties = { position: "fixed", zIndex: 10002 };
    const tw = 320;
    switch (current.position) {
      case "bottom":
        style.top = rect.bottom + pad + 8;
        style.left = Math.max(8, Math.min(rect.left + rect.width / 2 - tw / 2, window.innerWidth - tw - 8));
        break;
      case "top":
        style.bottom = window.innerHeight - rect.top + pad + 8;
        style.left = Math.max(8, Math.min(rect.left + rect.width / 2 - tw / 2, window.innerWidth - tw - 8));
        break;
      case "right":
        style.top = rect.top + rect.height / 2 - 60;
        style.left = rect.right + pad + 8;
        break;
      case "left":
        style.top = rect.top + rect.height / 2 - 60;
        style.right = window.innerWidth - rect.left + pad + 8;
        break;
    }
    return style;
  })();

  return (
    <>
      {/* Overlay with spotlight cutout */}
      <div
        className="fixed inset-0 z-[10000] pointer-events-auto"
        onClick={finish}
        style={{
          background: `radial-gradient(ellipse ${rect.width + pad * 2}px ${rect.height + pad * 2}px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent 50%, rgba(0,0,0,0.7) 51%)`,
        }}
      />

      {/* Spotlight border highlight */}
      <div
        className="fixed z-[10001] rounded-xl border-2 border-primary/60 pointer-events-none"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: "0 0 0 9999px transparent",
        }}
      />

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[10002] w-80 rounded-xl border border-border bg-card p-4 shadow-xl"
          style={tooltip}
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-display font-semibold text-sm text-foreground">{current.title}</h3>
            <button onClick={finish} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">{current.description}</p>

          {/* Step dots */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? "bg-primary" : "bg-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <span className="text-[9px] font-mono text-muted-foreground/50">← → ESC</span>
            </div>
            <div className="flex items-center gap-2">
              {step < STEPS.length - 1 && (
                <button
                  onClick={finish}
                  className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SkipForward className="w-3 h-3" /> Skip
                </button>
              )}
              <button
                onClick={goNext}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                {step === STEPS.length - 1 ? "Finish" : <>Next <ChevronRight className="w-3 h-3" /></>}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
