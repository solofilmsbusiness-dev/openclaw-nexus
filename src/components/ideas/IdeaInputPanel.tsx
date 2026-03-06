import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Sparkles, Trash2, FolderOpen, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { IdeaProject } from "@/hooks/useIdeas";

const CATEGORIES = [
  "Film & Video", "Storytelling", "Startup", "Product Design",
  "Marketing", "Music", "Technology", "Art & Design", "Education", "Other",
];

const MOODS = [
  "Bold & Provocative", "Calm & Reflective", "Dark & Mysterious",
  "Playful & Fun", "Futuristic", "Nostalgic", "Minimalist", "Epic & Grand",
];

interface Props {
  isGenerating: boolean;
  projects: IdeaProject[];
  currentProject: IdeaProject | null;
  onGenerate: (topic: string, category?: string, mood?: string, constraints?: string) => void;
  onLoadProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onNewProject: () => void;
}

export default function IdeaInputPanel({ isGenerating, projects, currentProject, onGenerate, onLoadProject, onDeleteProject, onNewProject }: Props) {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("");
  const [mood, setMood] = useState("");
  const [constraints, setConstraints] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    onGenerate(topic.trim(), category || undefined, mood || undefined, constraints || undefined);
  };

  return (
    <div className="w-72 flex-shrink-0 glass-panel rounded-none border-r border-t-0 border-b-0 border-l-0 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="w-4 h-4 text-neon-orange" />
          <span className="font-display font-semibold text-sm text-foreground">Concept Engine</span>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono">Generate • Explore • Expand</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-3 border-b border-border/30">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1 block">Topic / Theme</label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. AI-powered filmmaking"
            className="h-8 text-xs bg-secondary/50 border-border/40"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1 block">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-xs bg-secondary/50 border-border/40">
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1 block">Mood / Tone</label>
          <Select value={mood} onValueChange={setMood}>
            <SelectTrigger className="h-8 text-xs bg-secondary/50 border-border/40">
              <SelectValue placeholder="Select mood..." />
            </SelectTrigger>
            <SelectContent>
              {MOODS.map(m => (
                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1 block">Constraints (optional)</label>
          <Textarea
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="Budget, timeline, audience..."
            className="min-h-[50px] text-xs bg-secondary/50 border-border/40 resize-none"
          />
        </div>

        <Button
          type="submit"
          disabled={!topic.trim() || isGenerating}
          className="w-full h-9 text-xs font-mono gap-2 bg-gradient-to-r from-neon-orange/80 to-neon-cyan/80 hover:from-neon-orange hover:to-neon-cyan text-white border-0"
        >
          {isGenerating ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> Generate Ideas</>
          )}
        </Button>
      </form>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Saved Projects</span>
          <button onClick={onNewProject} className="text-muted-foreground hover:text-primary transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <AnimatePresence>
          {projects.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className={`group flex items-center gap-2 p-2 rounded-lg mb-1 cursor-pointer transition-all text-xs ${
                currentProject?.id === p.id
                  ? "bg-primary/15 text-primary"
                  : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => onLoadProject(p.id)}
            >
              <FolderOpen className="w-3 h-3 flex-shrink-0" />
              <span className="truncate flex-1">{p.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {projects.length === 0 && (
          <p className="text-[10px] text-muted-foreground/50 text-center mt-4 font-mono">No projects yet</p>
        )}
      </div>
    </div>
  );
}
