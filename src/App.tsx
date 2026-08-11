import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AgentProvider } from "@/contexts/AgentContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { TradingLayoutProvider } from "@/contexts/TradingLayoutContext";
import { AnimatePresence, motion } from "framer-motion";
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Admin = lazy(() => import("./pages/Admin"));
const Trading = lazy(() => import("./pages/Trading"));
const Agent = lazy(() => import("./pages/Agent"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Profile = lazy(() => import("./pages/Profile"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="h-screen bg-background flex flex-col items-center justify-center gap-3">
    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    <span className="font-mono text-xs text-muted-foreground tracking-wider">Loading…</span>
  </div>
);

const queryClient = new QueryClient();

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        <Suspense fallback={<RouteFallback />}>
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/trading" element={<Trading />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" storageKey="solo-os-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SettingsProvider>
            <AgentProvider>
              <TradingLayoutProvider>
                <AnimatedRoutes />
              </TradingLayoutProvider>
            </AgentProvider>
          </SettingsProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
