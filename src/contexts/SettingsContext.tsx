import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type AccentColor = "blue" | "teal" | "purple" | "rose" | "amber";
export type FontSize = "small" | "medium" | "large";
export type LayoutPreset = "default" | "compact" | "wide-graph" | "logs-focus";

export interface NotificationSettings {
  systemAlerts: boolean;
  statusChanges: boolean;
  killSwitchWarnings: boolean;
  soundEffects: boolean;
}

export interface LayoutSettings {
  preset: LayoutPreset;
  leftPanelWidth: number; // px
  rightPanelWidth: number; // px
  compactMode: boolean;
  showMetricsBar: boolean;
}

export interface CustomTool {
  id: string;
  name: string;
  icon: string;
  type: "link" | "snippet" | "webhook";
  value: string; // URL, code snippet, or webhook URL
  color: string;
}

export interface SystemConfig {
  simulationSpeed: number;
  autoRefreshInterval: number;
  logRetention: number;
}

export interface ProfileSettings {
  displayName: string;
  avatar: string;
}

export interface SettingsState {
  accentColor: AccentColor;
  fontSize: FontSize;
  notifications: NotificationSettings;
  system: SystemConfig;
  layout: LayoutSettings;
  customTools: CustomTool[];
  profile: ProfileSettings;
}

interface SettingsContextValue extends SettingsState {
  setAccentColor: (c: AccentColor) => void;
  setFontSize: (s: FontSize) => void;
  setNotifications: (n: Partial<NotificationSettings>) => void;
  setSystemConfig: (s: Partial<SystemConfig>) => void;
  setLayout: (l: Partial<LayoutSettings>) => void;
  setLayoutPreset: (p: LayoutPreset) => void;
  addCustomTool: (tool: CustomTool) => void;
  removeCustomTool: (id: string) => void;
  updateCustomTool: (id: string, updates: Partial<CustomTool>) => void;
  setProfile: (p: Partial<ProfileSettings>) => void;
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
  layout: {
    preset: "default",
    leftPanelWidth: 320,
    rightPanelWidth: 280,
    compactMode: false,
    showMetricsBar: true,
  },
  customTools: [],
  profile: {
    displayName: "",
    avatar: "",
  },
};

const LAYOUT_PRESETS: Record<LayoutPreset, Partial<LayoutSettings>> = {
  default: { leftPanelWidth: 320, rightPanelWidth: 280, compactMode: false },
  compact: { leftPanelWidth: 240, rightPanelWidth: 220, compactMode: true },
  "wide-graph": { leftPanelWidth: 240, rightPanelWidth: 200, compactMode: false },
  "logs-focus": { leftPanelWidth: 260, rightPanelWidth: 360, compactMode: false },
};

export { LAYOUT_PRESETS };

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
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULTS,
        ...parsed,
        notifications: { ...DEFAULTS.notifications, ...parsed.notifications },
        system: { ...DEFAULTS.system, ...parsed.system },
        layout: { ...DEFAULTS.layout, ...parsed.layout },
        profile: { ...DEFAULTS.profile, ...parsed.profile },
        customTools: parsed.customTools || [],
      };
    }
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

  const setLayout = useCallback((partial: Partial<LayoutSettings>) => {
    setState((p) => ({ ...p, layout: { ...p.layout, ...partial } }));
  }, []);

  const setLayoutPreset = useCallback((preset: LayoutPreset) => {
    const presetValues = LAYOUT_PRESETS[preset];
    setState((p) => ({ ...p, layout: { ...p.layout, ...presetValues, preset } }));
  }, []);

  const addCustomTool = useCallback((tool: CustomTool) => {
    setState((p) => ({ ...p, customTools: [...p.customTools, tool] }));
  }, []);

  const removeCustomTool = useCallback((id: string) => {
    setState((p) => ({ ...p, customTools: p.customTools.filter((t) => t.id !== id) }));
  }, []);

  const updateCustomTool = useCallback((id: string, updates: Partial<CustomTool>) => {
    setState((p) => ({
      ...p,
      customTools: p.customTools.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  }, []);

  const setProfile = useCallback((partial: Partial<ProfileSettings>) => {
    setState((p) => ({ ...p, profile: { ...p.profile, ...partial } }));
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        ...state,
        setAccentColor, setFontSize, setNotifications, setSystemConfig,
        setLayout, setLayoutPreset, addCustomTool, removeCustomTool, updateCustomTool, setProfile,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
