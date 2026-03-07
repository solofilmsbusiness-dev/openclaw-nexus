import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const pages = [
  { path: "/", label: "Dashboard", adminOnly: true },
  { path: "/trading", label: "Trading", adminOnly: false },
  { path: "/calendar", label: "Calendar", adminOnly: false },
  { path: "/profile", label: "Profile", adminOnly: false },
];

export default function PageNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      setIsAdmin(roles?.some((r) => r.role === "admin") ?? false);
    })();
  }, []);

  const visiblePages = pages.filter((p) => !p.adminOnly || isAdmin);

  return (
    <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5">
      {visiblePages.map((p) => (
        <button
          key={p.path}
          onClick={() => navigate(p.path)}
          className={`px-3 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all ${
            location.pathname === p.path
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
