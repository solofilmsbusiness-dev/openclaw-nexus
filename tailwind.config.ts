import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        display: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Inter", "sans-serif"],
        body: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        neon: {
          green: "hsl(var(--neon-green))",
          orange: "hsl(var(--neon-orange))",
          red: "hsl(var(--neon-red))",
          blue: "hsl(var(--neon-blue))",
          purple: "hsl(var(--neon-purple))",
          cyan: "hsl(var(--neon-cyan))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "drift": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "25%": { transform: "translate(2px, -1.5px)" },
          "50%": { transform: "translate(-1.5px, 2px)" },
          "75%": { transform: "translate(1.5px, 0.5px)" },
        },
        "core-pulse": {
          "0%, 100%": { transform: "scale(1)", filter: "brightness(1)" },
          "50%": { transform: "scale(1.03)", filter: "brightness(1.15)" },
        },
        "killPulse": {
          "0%": { opacity: "0.85" },
          "5%": { opacity: "0.3" },
          "8%": { opacity: "0.95" },
          "12%": { opacity: "0.5" },
          "15%": { opacity: "1" },
          "20%": { opacity: "0.7" },
          "23%": { opacity: "0.2" },
          "25%": { opacity: "0.9" },
          "35%": { opacity: "0.75" },
          "40%": { opacity: "0.4" },
          "42%": { opacity: "1" },
          "50%": { opacity: "0.8" },
          "55%": { opacity: "0.3" },
          "57%": { opacity: "0.95" },
          "65%": { opacity: "0.6" },
          "70%": { opacity: "0.85" },
          "75%": { opacity: "0.15" },
          "78%": { opacity: "0.9" },
          "85%": { opacity: "0.7" },
          "90%": { opacity: "0.5" },
          "93%": { opacity: "1" },
          "97%": { opacity: "0.6" },
          "100%": { opacity: "0.85" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "drift": "drift 8s ease-in-out infinite",
        "core-pulse": "core-pulse 4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
