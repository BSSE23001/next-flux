import type { Config } from "tailwindcss";

const config: Config = {
  /**
   * DARK MODE CONFIGURATION
   * Using "class" mode instead of "media" allows manual theme toggle
   * Users can switch light/dark mode explicitly via next-themes
   * The .dark class is applied to the <html> element when dark mode is active
   */
  darkMode: ["class"],

  /**
   * CONTENT PATHS
   * Tells Tailwind where to scan for class names to include in final CSS
   * Includes Next.js pages, components, and app directory files
   * Ensures no classes are purged accidentally (Tailwind only includes used classes)
   */
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      /**
       * COLOR PALETTE
       * All colors use CSS custom properties (HSL values) defined in globals.css
       * This creates a unified color system that respects light/dark modes automatically
       *
       * WHY CSS CUSTOM PROPERTIES:
       * - Single source of truth for theming (defined once in globals.css)
       * - Support for runtime theme switching without recompiling CSS
       * - Easy to implement system-wide theme changes
       * - Works with next-themes for light/dark mode toggle
       *
       * WINDOWS 11 COLOR PALETTE:
       * - Primary: #0067c0 (Windows 11 Official Blue) / #4cc2ff (dark mode)
       * - Background: #f3f3f3 (light) / #0d0d0d (dark) - matches Windows 11 aesthetic
       * - Cards: Pure white (#ffffff) on light / #1a1a1a on dark
       */
      colors: {
        // Main background and text colors
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",

        // Card colors for elevated surfaces (posts, comments, profiles)
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },

        // Popover/tooltip/menu styles
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },

        // Primary accent - Windows 11 Blue for interactive elements
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },

        // Secondary accent for less prominent actions
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },

        // Muted colors for disabled/inactive states
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },

        // Accent colors for highlights and badges
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },

        // Destructive colors for delete/warning actions
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },

        // Border colors
        border: "hsl(var(--border) / <alpha-value>)",

        // Input field background
        input: "hsl(var(--input) / <alpha-value>)",

        // Focus ring color for keyboard navigation
        ring: "hsl(var(--ring) / <alpha-value>)",

        // Data visualization colors for charts and graphs
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
      },

      /**
       * BORDER RADIUS
       * Windows 11 uses consistent, moderate rounding (8px / 0.5rem)
       * Not extreme curves, not sharp corners - visually modern but not trendy
       *
       * Sizing:
       * - lg: Full 0.5rem (8px) - used for main surfaces
       * - md: Slightly smaller (6px) - used for secondary elements
       * - sm: Even smaller (4px) - used for small components
       */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      /**
       * ANIMATIONS & TRANSITIONS
       * Windows 11 uses subtle, swift animations
       * Emphasizes responsiveness and modern feel
       */
      animation: {
        // Smooth fade-in for content appearing
        "fade-in": "fadeIn 0.3s ease-in-out",
        // Scale animation for interactive feedback
        "scale-in": "scaleIn 0.2s ease-out",
      },

      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },

      /**
       * SPACING
       * Uses Tailwind's default spacing scale
       * No customization needed - consistency with standard Tailwind
       */

      /**
       * SHADOWS
       * Windows 11 uses subtle, directional shadows
       * Applied via Tailwind's default shadow utilities (shadow-sm, shadow-md, etc)
       */

      /**
       * TYPOGRAPHY
       * Inherits from system fonts defined in layout.tsx
       * Uses CSS custom properties for font families
       * Geist Sans (primary) and Geist Mono (monospace)
       */
    },
  },

  /**
   * PLUGINS
   * Adds additional utilities for animations
   * tailwindcss-animate provides @keyframes helpers
   */
  plugins: [require("tailwindcss-animate")],
};

export default config;
