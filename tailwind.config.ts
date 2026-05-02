import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'Pretendard Variable', '-apple-system', 'BlinkMacSystemFont', 'system-ui', '"Noto Sans KR"', 'sans-serif'],
        pretendard: ['Pretendard', 'Pretendard Variable', '-apple-system', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        h1: ['22px', { lineHeight: '1.4', fontWeight: '500' }],
        h2: ['18px', { lineHeight: '1.4', fontWeight: '500' }],
        h3: ['15px', { lineHeight: '1.45', fontWeight: '500' }],
        body: ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      colors: {
        border: "hsl(var(--border) / 0.12)",
        input: "hsl(var(--input) / 0.12)",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        /* Brand palette — the only allowed colors */
        brand: {
          lime: "hsl(var(--brand-lime))",
          sky: "hsl(var(--brand-sky))",
          coral: "hsl(var(--brand-coral))",
          cream: "hsl(var(--brand-cream))",
          lavender: "hsl(var(--brand-lavender))",
          navy: "hsl(var(--brand-navy))",
          forest: "hsl(var(--brand-forest))",
        },

        /* Semantic surfaces */
        page: "hsl(var(--background))",
        "bg-soft": "hsl(var(--bg-soft))",
        "bg-accent": "hsl(var(--bg-accent))",

        /* Text hierarchy */
        "text-primary": "hsl(var(--text-primary))",
        "text-secondary": "hsl(var(--text-secondary) / 0.7)",
        "text-tertiary": "hsl(var(--text-tertiary) / 0.5)",

        /* CTAs */
        cta: {
          DEFAULT: "hsl(var(--cta-primary))",
          foreground: "hsl(var(--cta-primary-foreground))",
          secondary: "hsl(var(--cta-secondary))",
          "secondary-foreground": "hsl(var(--cta-secondary-foreground))",
          soft: "hsl(var(--cta-soft))",
          "soft-foreground": "hsl(var(--cta-soft-foreground))",
        },

        /* Difficulty */
        difficulty: {
          "easy-bg": "hsl(var(--difficulty-easy-bg))",
          "easy-fg": "hsl(var(--difficulty-easy-fg))",
          "medium-bg": "hsl(var(--difficulty-medium-bg))",
          "medium-fg": "hsl(var(--difficulty-medium-fg))",
          "hard-bg": "hsl(var(--difficulty-hard-bg))",
          "hard-fg": "hsl(var(--difficulty-hard-fg))",
        },

        /* Badges */
        badge: {
          "100mt-bg": "hsl(var(--badge-100mt-bg))",
          "100mt-fg": "hsl(var(--badge-100mt-fg))",
          "forest100-bg": "hsl(var(--badge-forest100-bg))",
          "forest100-fg": "hsl(var(--badge-forest100-fg))",
          "park-bg": "hsl(var(--badge-nationalpark-bg))",
          "park-fg": "hsl(var(--badge-nationalpark-fg))",
          "popular-bg": "hsl(var(--badge-popular-bg))",
          "popular-fg": "hsl(var(--badge-popular-fg))",
          "completed-bg": "hsl(var(--badge-completed-bg))",
          "completed-fg": "hsl(var(--badge-completed-fg))",
        },

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
        nature: {
          50: "hsl(var(--nature-50))",
          100: "hsl(var(--nature-100))",
          200: "hsl(var(--nature-200))",
          500: "hsl(var(--nature-500))",
          600: "hsl(var(--nature-600))",
          700: "hsl(var(--nature-700))",
        },
        sky: {
          50: "hsl(var(--sky-50))",
          100: "hsl(var(--sky-100))",
          200: "hsl(var(--sky-200))",
          500: "hsl(var(--sky-500))",
          600: "hsl(var(--sky-600))",
        },
        earth: {
          50: "hsl(var(--earth-50))",
          100: "hsl(var(--earth-100))",
          200: "hsl(var(--earth-200))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        coral: {
          DEFAULT: "hsl(var(--coral))",
          light: "hsl(var(--coral-light))",
        },
        peach: {
          DEFAULT: "hsl(var(--peach))",
        },
        lavender: {
          DEFAULT: "hsl(var(--lavender))",
          light: "hsl(var(--lavender-light))",
        },
        mint: {
          DEFAULT: "hsl(var(--mint))",
          light: "hsl(var(--mint-light))",
        },
        "sky-hero": "hsl(var(--sky-hero))",
        "orange-accent": {
          DEFAULT: "hsl(var(--orange-accent))",
          light: "hsl(var(--orange-light))",
        },
        "purple-accent": {
          DEFAULT: "hsl(var(--purple-accent))",
          light: "hsl(var(--purple-light))",
        },
        info: "hsl(var(--info))",
      },
      borderRadius: {
        lg: "14px",   // card radius
        md: "10px",   // inner element radius
        sm: "8px",
        pill: "999px",
        card: "14px",
        inner: "10px",
        chip: "999px",
      },
      borderWidth: {
        hairline: "0.5px",
      },
      spacing: {
        card: "14px",       // card padding
        section: "20px",    // gap between sections
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
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
