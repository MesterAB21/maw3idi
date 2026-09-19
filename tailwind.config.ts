import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        "brand-deep": "#0F2A5C",
        "brand-primary": "#2563EB",
        "brand-primary-active": "#1D4ED8",
        "brand-sky": "#38BDF8",
        // Surfaces
        canvas: "#FFFFFF",
        "surface-soft": "#F8FAFC",
        "surface-card": "#F1F5F9",
        "surface-dark": "#0B1220",
        hairline: "#E2E8F0",
        // Text
        ink: "#0F172A",
        body: "#334155",
        "on-dark": "#F8FAFC",
        "on-dark-muted": "#94A3B8",
        // Functional statuses
        "status-pending": "#D97706",
        "status-pending-bg": "#FEF3C7",
        "status-confirmation-sent": "#2563EB",
        "status-confirmation-sent-bg": "#DBEAFE",
        "status-confirmed": "#16A34A",
        "status-confirmed-bg": "#DCFCE7",
        "status-need-call": "#EA580C",
        "status-need-call-bg": "#FFEDD5",
        "status-cancelled": "#DC2626",
        "status-cancelled-bg": "#FEE2E2",
        "status-completed": "#475569",
        "status-completed-bg": "#F1F5F9",
        "status-no-show": "#6B7280",
        "status-no-show-bg": "#F3F4F6",
        // Avatars / decorative accents
        "avatar-orange": "#FB923C",
        "avatar-pink": "#EC4899",
        "avatar-violet": "#8B5CF6",
        "avatar-emerald": "#34D399",
        "avatar-blue": "#60A5FA",
        // Functional accents
        danger: "#DC2626",
        success: "#16A34A",
        // shadcn/ui semantic mapping
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
          DEFAULT: "#64748B",
          foreground: "#0F172A",
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
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)",
        "brand-hero":
          "linear-gradient(140deg, #0B2557 0%, #1D4ED8 55%, #2563EB 100%)",
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)",
        modal:
          "0 8px 24px rgba(15,23,42,0.12), 0 24px 48px rgba(15,23,42,0.16)",
        "focus-ring": "0 0 0 3px rgba(37,99,235,0.15)",
      },
      fontSize: {
        "display-xl": ["60px", { lineHeight: "1.05", fontWeight: "700", letterSpacing: "-0.02em" }],
        "display-lg": ["44px", { lineHeight: "1.1", fontWeight: "700", letterSpacing: "-0.02em" }],
        "display-md": ["32px", { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.01em" }],
        "display-sm": ["26px", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.01em" }],
        "title-lg": ["22px", { lineHeight: "1.3", fontWeight: "600" }],
        "title-md": ["18px", { lineHeight: "1.4", fontWeight: "600" }],
        "title-sm": ["16px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-md": ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["13.5px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "0.04em" }],
        code: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        button: ["14px", { lineHeight: "1", fontWeight: "600" }],
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-plus-jakarta)", "var(--font-inter)", "system-ui", "sans-serif"],
        arabic: ["var(--font-ibm-arabic)", "var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
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
        "drawer-in": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-once": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
        "flash-blue": {
          from: { backgroundColor: "#EFF6FF" },
          to: { backgroundColor: "transparent" },
        },
        "bar-fill": {
          from: { width: "0%" },
          to: { width: "var(--bar-value)" },
        },
        "float-1": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(48px, -32px) scale(1.12)" },
        },
        "float-2": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(-40px, 28px) scale(1.15)" },
        },
        "float-3": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(24px, 36px) scale(0.92)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "drawer-in": "drawer-in 0.28s ease-out",
        "overlay-in": "overlay-in 0.28s ease-out",
        "slide-up": "slide-up 0.28s ease-out",
        "pulse-once": "pulse-once 0.4s ease-out",
        "flash-blue": "flash-blue 1.5s ease-out",
        "bar-fill": "bar-fill 0.6s ease-out",
        "float-1": "float-1 18s ease-in-out infinite",
        "float-2": "float-2 24s ease-in-out infinite",
        "float-3": "float-3 20s ease-in-out infinite",
        "float-slow": "float-slow 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 8s ease-in-out infinite",
      },
      transitionDuration: {
        DEFAULT: "150ms",
        menu: "200ms",
        drawer: "280ms",
      },
      transitionTimingFunction: {
        "in-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;