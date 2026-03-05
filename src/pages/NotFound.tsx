import { useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

function NotFoundParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      x: ((i * 173 + 29) % 100),
      y: ((i * 241 + 53) % 100),
      size: 0.5 + ((i * 7) % 15) / 10,
      dur: 3 + ((i * 13) % 80) / 10,
      delay: ((i * 31) % 50) / 10,
      drift: ((i * 47) % 30) - 15,
    })), []);

  return (
    <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
      <defs>
        <radialGradient id="notFoundGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0.1" />
          <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50%" cy="45%" r="200" fill="url(#notFoundGlow)">
        <animate attributeName="r" values="180;220;180" dur="6s" repeatCount="indefinite" />
      </circle>
      {particles.map((p, i) => (
        <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r={p.size} fill="hsl(var(--muted-foreground))" opacity={0}>
          <animate attributeName="opacity" values="0;0.3;0" dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values={`0,0;${p.drift},${-p.drift * 0.5};0,0`} dur={`${p.dur * 2}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <NotFoundParticles />

      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(hsl(225, 10%, 30%) 1px, transparent 1px), linear-gradient(90deg, hsl(225, 10%, 30%) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 text-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center justify-center mb-6"
        >
          <div className="w-16 h-16 rounded-full border-2 border-destructive/40 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
        </motion.div>

        <div className="glass-panel neon-border p-8 max-w-sm mx-4">
          <h1 className="font-mono text-5xl font-bold text-foreground mb-2">404</h1>
          <p className="font-mono text-xs text-muted-foreground tracking-[0.3em] uppercase mb-1">
            Signal Lost
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Route <span className="font-mono text-destructive">{location.pathname}</span> not found in the mesh.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-mono text-sm tracking-wider uppercase hover:bg-primary/90 transition-all"
          >
            Return to Base
          </a>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
            <span className="font-mono text-[9px] text-muted-foreground">SYSTEMS ONLINE</span>
          </div>
          <div className="w-px h-3 bg-border/50" />
          <span className="font-mono text-[9px] text-muted-foreground">SOLO OS v2.26</span>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
