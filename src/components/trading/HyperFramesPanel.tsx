import { useState, useCallback, useRef } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

interface VideoJob {
  id: string;
  videoId: string;
  title: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  createdAt: Date;
}

export default function HyperFramesPanel() {
  const { heygen } = useSettings();
  const [html, setHtml] = useState(FRAME_TEMPLATES[0].html);
  const [script, setScript] = useState("Welcome to my video, powered by HyperFrames.");
  const [title, setTitle] = useState("HyperFrames Video");
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [generating, setGenerating] = useState(false);
  const [polling, setPolling] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasApiKey = Boolean(heygen.apiKey);

  const previewSrc = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

  const handleGenerate = useCallback(async () => {
    if (!hasApiKey) {
      toast.error("HeyGen API key not set", { description: "Add your key in Admin → HeyGen" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("heygen-proxy", {
        body: {
          action: "generate_video",
          apiKey: heygen.apiKey,
          title,
          script,
          backgroundHtml: html,
        },
      });

      if (error || data?.error) {
        toast.error("Video generation failed", { description: data?.error || error?.message });
        return;
      }

      const videoId = data?.data?.video_id || data?.video_id;
      if (!videoId) {
        toast.error("No video ID returned from HeyGen");
        return;
      }

      const job: VideoJob = {
        id: `job-${Date.now()}`,
        videoId,
        title,
        status: "processing",
        createdAt: new Date(),
      };
      setJobs((prev) => [job, ...prev]);
      toast.success("Video queued", { description: `ID: ${videoId}` });
      startPolling(job.id, videoId);
    } catch (e) {
      toast.error("Unexpected error", { description: e instanceof Error ? e.message : "Unknown" });
    } finally {
      setGenerating(false);
    }
  }, [heygen.apiKey, hasApiKey, html, script, title]);

  const startPolling = (jobId: string, videoId: string) => {
    setPolling(jobId);
    let attempts = 0;
    const MAX_ATTEMPTS = 60;

    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(pollRef.current!);
        setPolling(null);
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status: "failed" } : j)),
        );
        toast.error("Video timed out");
        return;
      }

      try {
        const { data } = await supabase.functions.invoke("heygen-proxy", {
          body: { action: "check_video_status", apiKey: heygen.apiKey, videoId },
        });

        const videoStatus = data?.data?.status || data?.status;
        if (videoStatus === "completed") {
          clearInterval(pollRef.current!);
          setPolling(null);
          const url = data?.data?.video_url || data?.video_url;
          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId ? { ...j, status: "completed", videoUrl: url } : j,
            ),
          );
          toast.success("Video ready!", { description: title });
        } else if (videoStatus === "failed") {
          clearInterval(pollRef.current!);
          setPolling(null);
          setJobs((prev) =>
            prev.map((j) => (j.id === jobId ? { ...j, status: "failed" } : j)),
          );
          toast.error("Video generation failed");
        }
      } catch {
        // keep polling
      }
    }, 10_000);
  };

  const refreshStatus = async (job: VideoJob) => {
    if (!hasApiKey) return;
    try {
      const { data } = await supabase.functions.invoke("heygen-proxy", {
        body: { action: "check_video_status", apiKey: heygen.apiKey, videoId: job.videoId },
      });
      const videoStatus = data?.data?.status || data?.status;
      const url = data?.data?.video_url || data?.video_url;
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? { ...j, status: videoStatus || j.status, videoUrl: url || j.videoUrl }
            : j,
        ),
      );
    } catch {
      toast.error("Status check failed");
    }
  };

  const statusIcon = (s: VideoJob["status"]) => {
    if (s === "completed") return <CheckCircle2 className="w-3 h-3 text-neon-green" />;
    if (s === "failed") return <XCircle className="w-3 h-3 text-destructive" />;
    if (s === "processing") return <Loader2 className="w-3 h-3 animate-spin text-primary" />;
    return <Clock className="w-3 h-3 text-muted-foreground" />;
  };

  const statusColor = (s: VideoJob["status"]) => {
    if (s === "completed") return "bg-neon-green/10 text-neon-green border-neon-green/30";
    if (s === "failed") return "bg-destructive/10 text-destructive border-destructive/30";
    return "bg-primary/10 text-primary border-primary/30";
  };

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

        {/* No API key warning */}
        {!hasApiKey && (
          <div className="flex items-start gap-2 rounded-lg border border-neon-orange/30 bg-neon-orange/5 p-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-neon-orange mt-0.5 shrink-0" />
            <p className="text-[10px] font-mono text-neon-orange">
              No HeyGen API key. Go to Admin → HeyGen to configure it.
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
            <TabsTrigger value="jobs" className="text-[10px] font-mono flex-1 h-5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Video className="w-3 h-3 mr-1" />Videos{jobs.length > 0 && ` (${jobs.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Compose tab */}
          <TabsContent value="compose" className="space-y-3 mt-3">
            {/* Template picker */}
            <div className="flex gap-1.5 flex-wrap">
              {FRAME_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => setHtml(tpl.html)}
                  className="text-[9px] font-mono px-2 py-1 rounded border border-border/30 bg-secondary/30 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {/* HTML editor */}
            <div className="space-y-1">
              <Label className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                <Code2 className="w-3 h-3" /> Frame HTML
              </Label>
              <Textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="font-mono text-[10px] bg-secondary/30 border-border/20 resize-none min-h-[140px] leading-relaxed"
                placeholder="<html>...</html>"
                spellCheck={false}
              />
            </div>

            {/* Script */}
            <div className="space-y-1">
              <Label className="text-[10px] font-mono text-muted-foreground">Avatar Script</Label>
              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="text-xs bg-secondary/30 border-border/20 resize-none min-h-[56px]"
                placeholder="What the avatar will say…"
              />
            </div>

            {/* Title */}
            <div className="space-y-1">
              <Label className="text-[10px] font-mono text-muted-foreground">Video Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-7 text-xs bg-secondary/30 border-border/20"
                placeholder="My HyperFrames Video"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || !hasApiKey || !html.trim()}
              size="sm"
              className="w-full gap-1.5 text-xs font-mono"
            >
              {generating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
              ) : (
                <><Play className="w-3.5 h-3.5" /> Generate Video</>
              )}
            </Button>
          </TabsContent>

          {/* Preview tab */}
          <TabsContent value="preview" className="mt-3">
            <div className="rounded-lg border border-border/20 overflow-hidden bg-black aspect-video">
              {html.trim() ? (
                <iframe
                  key={html}
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
            <p className="text-[9px] text-muted-foreground font-mono mt-1.5 text-center">
              Live preview · 1280 × 720 render target
            </p>
          </TabsContent>

          {/* Jobs tab */}
          <TabsContent value="jobs" className="mt-3">
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-mono">No videos generated yet</p>
                <p className="text-[9px] mt-0.5">Generate one in the Compose tab</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {jobs.map((job) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 rounded-lg border border-border/20 bg-secondary/20 p-2.5"
                    >
                      {statusIcon(job.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-foreground truncate">{job.title}</p>
                        <p className="text-[9px] text-muted-foreground font-mono truncate">
                          {job.videoId}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[8px] font-mono shrink-0 ${statusColor(job.status)}`}>
                        {job.status}
                      </Badge>
                      {job.status === "completed" && job.videoUrl && (
                        <a
                          href={job.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {(job.status === "processing" || job.status === "pending") && (
                        <button
                          onClick={() => refreshStatus(job)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
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
