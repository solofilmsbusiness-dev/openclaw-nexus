import { Globe, Network, Calculator, Square, CheckSquare } from "lucide-react";

interface PremadeTemplate {
  type: string;
  content: string;
  title: string;
}

export default function TemplatePreview({ template }: { template: PremadeTemplate }) {
  if (template.type === "checklist") {
    try {
      const items = JSON.parse(template.content) as { text: string; done: boolean }[];
      return (
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-muted-foreground mb-2">Checklist Preview</p>
          {items.slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-foreground/80">
              {item.done ? <CheckSquare className="w-3 h-3 mt-0.5 shrink-0 text-primary" /> : <Square className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />}
              <span className="leading-tight">{item.text}</span>
            </div>
          ))}
        </div>
      );
    } catch {
      return <p className="text-[10px] text-muted-foreground">Empty checklist</p>;
    }
  }

  if (template.type === "embed") {
    return (
      <div className="space-y-2">
        <p className="text-[10px] font-mono text-muted-foreground">Embedded Page</p>
        <div className="flex items-center gap-1.5 text-[10px] text-foreground/80 bg-muted/50 rounded px-2 py-1.5">
          <Globe className="w-3 h-3 shrink-0 text-primary" />
          <span className="truncate">{template.content}</span>
        </div>
      </div>
    );
  }

  if (template.type === "graph") {
    return (
      <div className="flex items-center gap-2 text-[10px] text-foreground/80">
        <Network className="w-4 h-4 text-primary" />
        <span>Live agent trade flow diagram</span>
      </div>
    );
  }

  if (template.type === "calculator") {
    return (
      <div className="flex items-center gap-2 text-[10px] text-foreground/80">
        <Calculator className="w-4 h-4 text-primary" />
        <span>Position sizing & risk calculator</span>
      </div>
    );
  }

  // Notes — show truncated markdown lines
  const lines = template.content.split("\n").filter(l => l.trim()).slice(0, 6);
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-mono text-muted-foreground mb-1.5">Notes Preview</p>
      {lines.map((line, i) => (
        <p key={i} className="text-[10px] font-mono text-foreground/70 leading-tight truncate">
          {line}
        </p>
      ))}
    </div>
  );
}
