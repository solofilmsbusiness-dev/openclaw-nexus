import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Play, Pause, RotateCcw, Search, Zap } from "lucide-react";
import type { Agent, AgentStatus } from "@/data/agents";
import { statusColor } from "@/data/agents";
import { toast } from "sonner";

interface CommandPaletteProps {
  agents: Agent[];
  onSelectAgent: (id: string) => void;
  onStatusChange: (id: string, status: AgentStatus) => void;
}

export default function CommandPalette({ agents, onSelectAgent, onStatusChange }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (agentId: string) => {
    onSelectAgent(agentId);
    setOpen(false);
  };

  const handleAction = (agentId: string, action: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;
    switch (action) {
      case "run":
        onStatusChange(agentId, "active");
        toast.success(`${agent.name} started`);
        break;
      case "pause":
        onStatusChange(agentId, "degraded");
        toast.warning(`${agent.name} paused`);
        break;
      case "restart":
        onStatusChange(agentId, "active");
        toast.success(`${agent.name} restarting`);
        setTimeout(() => onStatusChange(agentId, "healthy"), 2000);
        break;
    }
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search agents, run commands..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Agents">
          {agents.map((agent) => {
            const color = statusColor(agent.status);
            return (
              <CommandItem
                key={agent.id}
                value={`${agent.name} ${agent.type}`}
                onSelect={() => handleSelect(agent.id)}
              >
                <span className="mr-2">{agent.icon}</span>
                <span className="flex-1">{agent.name}</span>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ color: color.bg, backgroundColor: `${color.bg}15` }}
                >
                  {agent.status.toUpperCase()}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {agents.filter((a) => a.status !== "active").slice(0, 4).map((agent) => (
            <CommandItem
              key={`run-${agent.id}`}
              value={`run ${agent.name}`}
              onSelect={() => handleAction(agent.id, "run")}
            >
              <Play className="mr-2 h-3 w-3 text-neon-green" />
              <span>Run {agent.name}</span>
            </CommandItem>
          ))}
          {agents.filter((a) => a.status === "active").slice(0, 3).map((agent) => (
            <CommandItem
              key={`pause-${agent.id}`}
              value={`pause ${agent.name}`}
              onSelect={() => handleAction(agent.id, "pause")}
            >
              <Pause className="mr-2 h-3 w-3 text-neon-orange" />
              <span>Pause {agent.name}</span>
            </CommandItem>
          ))}
          {agents.filter((a) => a.status === "down" || a.status === "degraded").slice(0, 3).map((agent) => (
            <CommandItem
              key={`restart-${agent.id}`}
              value={`restart ${agent.name}`}
              onSelect={() => handleAction(agent.id, "restart")}
            >
              <RotateCcw className="mr-2 h-3 w-3 text-neon-cyan" />
              <span>Restart {agent.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
