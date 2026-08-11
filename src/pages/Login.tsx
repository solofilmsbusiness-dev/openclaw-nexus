import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight, Eye, EyeOff } from "lucide-react";

function ParticleField() {
  const particles = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      x: ((i * 173 + 29) % 100),
      y: ((i * 241 + 53) % 100),
      size: 0.5 + ((i * 7) % 15) / 10,
      dur: 3 + ((i * 13) % 80) / 10,
      delay: ((i * 31) % 50) / 10,
      drift: ((i * 47) % 30) - 15,
    })), []);

  const orbitals = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      radius: 120 + ((i * 37) % 300),
      size: 1.5 + ((i * 7) % 4),
      dur: 15 + ((i * 13) % 45),
      reverse: i % 3 === 0,
      startAngle: (i * 47) % 360,
      opacity: 0.08 + ((i * 11) % 20) / 100,
    })), []);

  return (
    <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
      <defs>
        <radialGradient id="loginCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(215, 80%, 60%)" stopOpacity="0.15" />
          <stop offset="50%" stopColor="hsl(215, 80%, 60%)" stopOpacity="0.04" />
          <stop offset="100%" stopColor="hsl(215, 80%, 60%)" stopOpacity="0" />
        </radialGradient>
        <filter id="loginGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Core glow */}
      <circle cx="50%" cy="45%" r="250" fill="url(#loginCoreGlow)">
        <animate attributeName="r" values="220;280;220" dur="6s" repeatCount="indefinite" />
      </circle>

      {/* Energy rings */}
      {[0, 2, 4].map((delay, i) => (
        <circle key={`ring-${i}`} cx="50%" cy="45%" r="30" fill="none" stroke="hsl(215, 80%, 60%)" strokeWidth={0.5} opacity={0}>
          <animate attributeName="r" from="30" to="350" dur="8s" begin={`${delay}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.12;0.06;0" dur="8s" begin={`${delay}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Stardust */}
      {particles.map((p, i) => (
        <circle key={`star-${i}`} cx={`${p.x}%`} cy={`${p.y}%`} r={p.size} fill="hsl(215, 60%, 75%)" opacity={0}>
          <animate attributeName="opacity" values="0;0.4;0" dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values={`0,0;${p.drift},${-p.drift * 0.5};0,0`} dur={`${p.dur * 2}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Orbital particles around center */}
      {orbitals.map((o, i) => (
        <circle key={`orbital-${i}`} cx={`calc(50% + ${o.radius}px)`} cy="45%" r={o.size} fill="hsl(215, 80%, 65%)" opacity={o.opacity} filter="url(#loginGlow)">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`${o.startAngle} 50% 45%`}
            to={`${o.startAngle + (o.reverse ? -360 : 360)} 50% 45%`}
            dur={`${o.dur}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Logged in");
        // Role-based redirect
        const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
          _user_id: signInData.user.id,
          _role: "admin",
        });
        if (roleErr) console.error("Failed to verify admin role:", roleErr);
        navigate(isAdmin ? "/" : "/trading");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <ParticleField />

      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-3 mb-4"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-primary/60 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: "3s" }} />
            </div>
          </motion.div>
          <h1 className="font-mono text-3xl font-bold tracking-[0.3em] text-foreground mb-1">
            SOLO OS
          </h1>
          <span className="font-mono text-xs text-primary tracking-[0.5em]">v2.26</span>
          <p className="text-muted-foreground text-xs font-mono mt-3 tracking-wider">
            NEURAL MESH CONTROL SYSTEM
          </p>
        </div>

        {/* Login card */}
        <div className="glass-panel neon-border p-8">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
              {isSignUp ? "Create Account" : "Authenticate"}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@solo.os"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-border/50 bg-secondary/30 text-foreground font-mono text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full h-11 pl-10 pr-10 rounded-lg border border-border/50 bg-secondary/30 text-foreground font-mono text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-mono text-sm tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden group"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? "Create Account" : "Authenticate"}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors tracking-wider"
            >
              {isSignUp ? "Already have access? Sign in" : "Request access? Sign up"}
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
            <span className="font-mono text-[9px] text-muted-foreground">SYSTEMS ONLINE</span>
          </div>
          <div className="w-px h-3 bg-border/50" />
          <span className="font-mono text-[9px] text-muted-foreground">12 AGENTS READY</span>
          <div className="w-px h-3 bg-border/50" />
          <span className="font-mono text-[9px] text-muted-foreground">ENCRYPTED</span>
        </div>
      </motion.div>
    </div>
  );
}
