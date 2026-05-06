import { useState, useCallback, useEffect, useRef } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Play,
  Eye,
  Code2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Clapperboard,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Film,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Scene {
  id: string;
  label: string;
  html: string;
  script: string;
  duration?: number;
}

interface VideoJob {
  id: string;           // Supabase row UUID
  video_id: string;     // HeyGen video ID
  title: string;
  status: "processing" | "completed" | "failed";
  video_url?: string | null;
  scenes: Scene[];
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FRAME_TEMPLATES = [
  {
    label: "Title Card",
    html: `<html><body style="margin:0;background:#0a0a0f;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui">
  <div style="text-align:center;color:#fff">
    <h1 style="font-size:3rem;font-weight:800;margin:0;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent">
      Your Title Here
    </h1>
    <p style="color:#888;font-size:1.2rem;margin-top:1rem">Subtitle text goes here</p>
  </div>
</body></html>`,
  },
  {
    label: "Data Card",
    html: `<html><body style="margin:0;background:#0d1117;display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace">
  <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:2rem;color:#e6edf3;min-width:320px">
    <div style="color:#58a6ff;font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:1rem">Metric</div>
    <div style="font-size:3rem;font-weight:700;color:#3fb950">+24.8%</div>
    <div style="color:#8b949e;font-size:.9rem;margin-top:.5rem">vs previous period</div>
  </div>
</body></html>`,
  },
  {
    label: "Outro",
    html: `<html><body style="margin:0;background:linear-gradient(135deg,#1a1a2e,#16213e);display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui">
  <div style="text-align:center;color:#fff">
    <div style="font-size:4rem;margin-bottom:1rem">🎬</div>
    <h2 style="font-size:2rem;font-weight:700;margin:0">Thanks for watching</h2>
    <p style="color:#a0aec0;margin-top:.75rem">Subscribe for more content</p>
  </div>
</body></html>`,
  },
];

function makeScene(index: number): Scene {
  return {
    id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: `Scene ${index + 1}`,
    html: FRAME_TEMPLATES[0].html,
    script: "Hello from HyperFrames!",
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HyperFramesPanel() {
  const { heygen } = useSettings();
  const [scenes, setScenes] = useState<Scene[]>([makeScene(0)]);
  const [activeSceneId, setActiveSceneId] = useState<string>(() => scenes[0].id);
  const [title, setTitle] = useState("HyperFrames Video");
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [generating, setGenerating] = useState(false);
  const pollTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const hasApiKey = Boolean(heygen.apiKey);
  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? scenes[0];

  // ── Load persisted jobs on mount ──────────────────────────────────────────
  useEffect(() => {
    loadJobs();
    return () => {
      pollTimers.current.forEach((t) => clearInterval(t));
    };
  }, []);

  const loadJobs = async () => {
    setLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from("hyperframes_videos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const mapped: VideoJob[] = (data ?? []).map((row) => ({
        id: row.id,
        video_id: row.video_id,
        title: row.title,
        status: row.status as VideoJob["status"],
        video_url: row.video_url,
        scenes: (row.scenes as Scene[]) ?? [],
        created_at: row.created_at,
      }));
      setJobs(mapped);

      // Resume polling for any in-flight jobs
      mapped
        .filter((j) => j.status === "processing")
        .forEach((j) => startPolling(j.id, j.video_id));
    } catch (e) {
      console.error("Failed to load hyperframes jobs:", e);
    } finally {
      setLoadingJobs(false);
    }
  };

  // ── Scene editing ─────────────────────────────────────────────────────────
  const updateScene = (id: string, patch: Partial<Scene>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addScene = () => {
    const scene = makeScene(scenes.length);
    setScenes((prev) => [...prev, scene]);
    setActiveSceneId(scene.id);
  };

  const deleteScene = (id: string) => {
    if (scenes.length === 1) {
      toast.error("A video needs at least one scene");
      return;
    }
    const idx = scenes.findIndex((s) => s.id === id);
    const next = scenes[idx === 0 ? 1 : idx - 1];
    setScenes((prev) => prev.filter((s) => s.id !== id));
    if (activeSceneId === id) setActiveSceneId(next.id);
  };

  const moveScene = (id: string, dir: -1 | 1) => {
    setScenes((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const to = idx + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  };

  // ── Video generation ──────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!hasApiKey) {
      toast.error("HeyGen API key not set", { description: "Admin → HeyGen" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("heygen-proxy", {
        body: {
          action: "generate_video",
          apiKey: heygen.apiKey,
          title,
          scenes: scenes.map(({ html, script, duration }) => ({ html, script, duration })),
        },
      });

      if (error || data?.error) {
        toast.error("Video generation failed", { description: data?.error || error?.message });
        return;
      }

      const videoId: string = data?.data?.video_id || data?.video_id;
      if (!videoId) {
        toast.error("No video ID returned from HeyGen");
        return;
      }

      const { data: row, error: insertErr } = await supabase
        .from("hyperframes_videos")
        .insert({
          video_id: videoId,
          title,
          status: "processing",
          scenes: scenes as unknown as Record<string, unknown>[],
        })
        .select()
        .single();

      if (insertErr || !row) {
        toast.error("Couldn't save job to library", { description: insertErr?.message });
        return;
      }

      const job: VideoJob = {
        id: row.id,
        video_id: videoId,
        title,
        status: "processing",
        scenes,
        created_at: row.created_at,
      };
      setJobs((prev) => [job, ...prev]);
      toast.success("Video queued", { description: `${scenes.length} scene${scenes.length > 1 ? "s" : ""}` });
      startPolling(job.id, videoId);
    } catch (e) {
      toast.error("Unexpected error", { description: e instanceof Error ? e.message : "Unknown" });
    } finally {
      setGenerating(false);
    }
  }, [heygen.apiKey, hasApiKey, scenes, title]);

  // ── Status polling ────────────────────────────────────────────────────────
  const startPolling = (rowId: string, videoId: string) => {
    if (pollTimers.current.has(rowId)) return;
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts++;
      if (attempts > 60) {
        clearInterval(timer);
        pollTimers.current.delete(rowId);
        await updateJobStatus(rowId, videoId, "failed", undefined);
        return;
      }
      try {
        const { data } = await supabase.functions.invoke("heygen-proxy", {
          body: { action: "check_video_status", apiKey: heygen.apiKey, videoId },
        });
        const s = data?.data?.status || data?.status;
        const url: string | undefined = data?.data?.video_url || data?.video_url;
        if (s === "completed") {
          clearInterval(timer);
          pollTimers.current.delete(rowId);
          await updateJobStatus(rowId, videoId, "completed", url);
          toast.success("Video ready!", { description: title });
        } else if (s === "failed") {
          clearInterval(timer);
          pollTimers.current.delete(rowId);
          await updateJobStatus(rowId, videoId, "failed", undefined);
          toast.error("Video generation failed");
        }
      } catch {
        // keep polling
      }
    }, 10_000);
    pollTimers.current.set(rowId, timer);
  };

  const updateJobStatus = async (
    rowId: string,
    _videoId: string,
    status: VideoJob["status"],
    videoUrl: string | undefined,
  ) => {
    await supabase
      .from("hyperframes_videos")
      .update({ status, ...(videoUrl ? { video_url: videoUrl } : {}) })
      .eq("id", rowId);

    setJobs((prev) =>
      prev.map((j) =>
        j.id === rowId ? { ...j, status, ...(videoUrl ? { video_url: videoUrl } : {}) } : j,
      ),
    );
  };

  const refreshJob = async (job: VideoJob) => {
    if (!hasApiKey) return;
    try {
      const { data } = await supabase.functions.invoke("heygen-proxy", {
        body: { action: "check_video_status", apiKey: heygen.apiKey, videoId: job.video_id },
      });
      const s = data?.data?.status || data?.status;
      const url = data?.data?.video_url || data?.video_url;
      await updateJobStatus(job.id, job.video_id, s || job.status, url);
    } catch {
      toast.error("Status check failed");
    }
  };

  const deleteJob = async (id: string) => {
    await supabase.from("hyperframes_videos").delete().eq("id", id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
    const timer = pollTimers.current.get(id);
    if (timer) { clearInterval(timer); pollTimers.current.delete(id); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const previewSrc = activeScene
    ? `data:text/html;charset=utf-8,${encodeURIComponent(activeScene.html)}`
    : "";

  const statusIcon = (s: VideoJob["status"]) => {
    if (s === "completed") return <CheckCircle2 className="w-3 h-3 text-neon-green" />;
    if (s === "failed") return <XCircle className="w-3 h-3 text-destructive" />;
    return <Loader2 className="w-3 h-3 animate-spin text-primary" />;
  };

  const statusColor = (s: VideoJob["status"]) => {
    if (s === "completed") return "bg-neon-green/10 text-neon-green border-neon-green/30";
    if (s === "failed") return "bg-destructive/10 text-destructive border-destructive/30";
    return "bg-primary/10 text-primary border-primary/30";
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScrollArea className="h-full">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-xs tracking-wide text-muted-foreground uppercase">
            HyperFrames
          </span>
          <Badge variant="outline" className="text-[8px] font-mono px-1.5 py-0 ml-auto border-primary/30 text-primary">
            HEYGEN
          </Badge>
        </div>

        {/* API key warning */}
        {!hasApiKey && (
          <div className="flex items-start gap-2 rounded-lg border border-neon-orange/30 bg-neon-orange/5 p-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-neon-orange mt-0.5 shrink-0" />
            <p className="text-[10px] font-mono text-neon-orange">
              No HeyGen API key — go to Admin → HeyGen to configure it.
            </p>
          </div>
        )}

        <Tabs defaultValue="compose">
          <TabsList className="h-7 bg-secondary/30 border border-border/20 w-full">
            <TabsTrigger value="compose" className="text-[10px] font-mono flex-1 h-5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Code2 className="w-3 h-3 mr-1" />Compose
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-[10px] font-mono flex-1 h-5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Eye className="w-3 h-3 mr-1" />Preview
            </TabsTrigger>
            <TabsTrigger value="library" className="text-[10px] font-mono flex-1 h-5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Film className="w-3 h-3 mr-1" />Library{jobs.length > 0 && ` (${jobs.length})`}
            </TabsTrigger>
          </TabsList>

          {/* ── Compose ─────────────────────────────────────────────────── */}
          <TabsContent value="compose" className="space-y-3 mt-3">

            {/* Scene timeline strip */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Scenes · {scenes.length}
                </span>
                <button
                  onClick={addScene}
                  className="flex items-center gap-1 text-[9px] font-mono text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              <div className="space-y-1">
                <AnimatePresence>
                  {scenes.map((scene, idx) => {
                    const isActive = scene.id === activeSceneId;
                    return (
                      <motion.div
                        key={scene.id}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 cursor-pointer transition-colors ${
                          isActive
                            ? "border-primary/50 bg-primary/10"
                            : "border-border/20 bg-secondary/20 hover:border-border/40"
                        }`}
                        onClick={() => setActiveSceneId(scene.id)}
                      >
                        <span className={`text-[9px] font-mono shrink-0 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                          {idx + 1}
                        </span>
                        <input
                          value={scene.label}
                          onChange={(e) => updateScene(scene.id, { label: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-transparent text-[10px] font-mono text-foreground outline-none min-w-0"
                        />
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 ml-auto">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveScene(scene.id, -1); }}
                            disabled={idx === 0}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors p-0.5"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveScene(scene.id, 1); }}
                            disabled={idx === scenes.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors p-0.5"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }}
                            className="text-muted-foreground hover:text-destructive transition-colors p-0.5 ml-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Active scene editor */}
            {activeScene && (
              <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                <p className="text-[9px] font-mono text-primary uppercase tracking-wider">
                  Editing: {activeScene.label}
                </p>

                {/* Template picker */}
                <div className="flex gap-1.5 flex-wrap">
                  {FRAME_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      onClick={() => updateScene(activeScene.id, { html: tpl.html })}
                      className="text-[9px] font-mono px-2 py-0.5 rounded border border-border/30 bg-secondary/30 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] font-mono text-muted-foreground flex items-center gap-1">
                    <Code2 className="w-3 h-3" /> Frame HTML
                  </Label>
                  <Textarea
                    value={activeScene.html}
                    onChange={(e) => updateScene(activeScene.id, { html: e.target.value })}
                    className="font-mono text-[10px] bg-secondary/30 border-border/20 resize-none min-h-[120px] leading-relaxed"
                    spellCheck={false}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] font-mono text-muted-foreground">Avatar Script</Label>
                  <Textarea
                    value={activeScene.script}
                    onChange={(e) => updateScene(activeScene.id, { script: e.target.value })}
                    className="text-xs bg-secondary/30 border-border/20 resize-none min-h-[48px]"
                    placeholder="What the avatar will say in this scene…"
                  />
                </div>

                <div className="flex gap-2 items-end">
                  <div className="space-y-1 w-24">
                    <Label className="text-[9px] font-mono text-muted-foreground">Duration (s)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={activeScene.duration ?? ""}
                      onChange={(e) =>
                        updateScene(activeScene.id, {
                          duration: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="auto"
                      className="h-7 text-xs bg-secondary/30 border-border/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Video title + generate */}
            <div className="space-y-1">
              <Label className="text-[9px] font-mono text-muted-foreground">Video Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-7 text-xs bg-secondary/30 border-border/20"
                placeholder="My HyperFrames Video"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || !hasApiKey || scenes.every((s) => !s.html.trim())}
              size="sm"
              className="w-full gap-1.5 text-xs font-mono"
            >
              {generating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
              ) : (
                <><Play className="w-3.5 h-3.5" /> Generate · {scenes.length} scene{scenes.length > 1 ? "s" : ""}</>
              )}
            </Button>
          </TabsContent>

          {/* ── Preview ──────────────────────────────────────────────────── */}
          <TabsContent value="preview" className="mt-3 space-y-2">
            {/* Scene selector in preview */}
            {scenes.length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                {scenes.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSceneId(s.id)}
                    className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                      s.id === activeSceneId
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/30 bg-secondary/30 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {i + 1} · {s.label}
                  </button>
                ))}
              </div>
            )}
            <div className="rounded-lg border border-border/20 overflow-hidden bg-black aspect-video">
              {activeScene?.html.trim() ? (
                <iframe
                  key={activeScene.id + activeScene.html.slice(0, 40)}
                  src={previewSrc}
                  className="w-full h-full"
                  sandbox="allow-scripts"
                  title="Frame Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-xs font-mono">Write HTML in the Compose tab</p>
                </div>
              )}
            </div>
            <p className="text-[9px] text-muted-foreground font-mono text-center">
              Previewing: {activeScene?.label} · 1280 × 720 render target
            </p>
          </TabsContent>

          {/* ── Library ──────────────────────────────────────────────────── */}
          <TabsContent value="library" className="mt-3">
            {loadingJobs ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-mono">Loading library…</span>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-mono">No videos yet</p>
                <p className="text-[9px] mt-0.5">Generated videos are saved here automatically</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {jobs.map((job) => (
                    <motion.div
                      key={job.id}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="rounded-lg border border-border/20 bg-secondary/20 p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        {statusIcon(job.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono text-foreground truncate">{job.title}</p>
                          <p className="text-[9px] text-muted-foreground font-mono">
                            {job.scenes.length} scene{job.scenes.length !== 1 ? "s" : ""} ·{" "}
                            {new Date(job.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-[8px] font-mono shrink-0 ${statusColor(job.status)}`}>
                          {job.status}
                        </Badge>
                        {job.status === "completed" && job.video_url && (
                          <a
                            href={job.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {job.status === "processing" && (
                          <button
                            onClick={() => refreshJob(job)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteJob(job.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Scene list */}
                      {job.scenes.length > 0 && (
                        <div className="flex gap-1 flex-wrap pt-0.5">
                          {job.scenes.map((s, i) => (
                            <span
                              key={s.id}
                              className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground"
                            >
                              {i + 1} · {s.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
