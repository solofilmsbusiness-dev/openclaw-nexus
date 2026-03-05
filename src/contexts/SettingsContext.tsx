import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type AccentColor = "blue" | "teal" | "purple" | "rose" | "amber";
export type FontSize = "small" | "medium" | "large";

export interface NotificationSettings {
  systemAlerts: boolean;
  statusChanges: boolean;
  killSwitchWarnings: boolean;
  soundEffects: boolean;
}

export interface SystemConfig {
  simulationSpeed: number; // ms tick interval
  autoRefreshInterval: number; // seconds
  logRetention: number; // max events to keep
}

export interface SettingsState {
  accentColor: AccentColor;
  fontSize: FontSize;
  notifications: NotificationSettings;
  system: SystemConfig;
}

interface SettingsContextValue extends SettingsState {
  setAccentColor: (c: AccentColor) => void;
  setFontSize: (s: FontSize) => void;
  setNotifications: (n: Partial<NotificationSettings>) => void;
  setSystemConfig: (s: Partial<SystemConfig>) => void;
}

const DEFAULTS: SettingsState = {
  accentColor: "blue",
  fontSize: "medium",
  notifications: {
    systemAlerts: true,
    statusChanges: true,
    killSwitchWarnings: true,
    soundEffects: false,
  },
  system: {
    simulationSpeed: 1500,
    autoRefreshInterval: 30,
    logRetention: 50,
  },
};

const ACCENT_VARS: Record<AccentColor, { primary: string; ring: string }> = {
  blue:   { primary: "215 80% 60%", ring: "215 80% 60%" },
  teal:   { primary: "172 60% 45%", ring: "172 60% 45%" },
  purple: { primary: "270 50% 60%", ring: "270 50% 60%" },
  rose:   { primary: "350 65% 55%", ring: "350 65% 55%" },
  amber:  { primary: "38 70% 55%",  ring: "38 70% 55%" },
};

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
};

const STORAGE_KEY = "solo-os-settings";

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

function saveSettings(s: SettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function applyAccent(color: AccentColor) {
  const vars = ACCENT_VARS[color];
  document.documentElement.style.setProperty("--primary", vars.primary);
  document.documentElement.style.setProperty("--ring", vars.ring);
}

function applyFontSize(size: FontSize) {
  document.documentElement.style.fontSize = FONT_SIZE_MAP[size];
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SettingsState>(loadSettings);

  useEffect(() => {
    applyAccent(state.accentColor);
    applyFontSize(state.fontSize);
    saveSettings(state);
  }, [state]);

  const setAccentColor = useCallback((accentColor: AccentColor) => {
    setState((p) => ({ ...p, accentColor }));
  }, []);

  const setFontSize = useCallback((fontSize: FontSize) => {
    setState((p) => ({ ...p, fontSize }));
  }, []);

  const setNotifications = useCallback((partial: Partial<NotificationSettings>) => {
    setState((p) => ({ ...p, notifications: { ...p.notifications, ...partial } }));
  }, []);

  const setSystemConfig = useCallback((partial: Partial<SystemConfig>) => {
    setState((p) => ({ ...p, system: { ...p.system, ...partial } }));
  }, []);

  return (
    <SettingsContext.Provider value={{ ...state, setAccentColor, setFontSize, setNotifications, setSystemConfig }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
