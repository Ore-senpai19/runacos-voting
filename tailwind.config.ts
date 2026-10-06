import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F5EF",
        ink: "#151A2D",
        "ink-soft": "#4B5169",
        gold: "#C9A227",
        "gold-dark": "#9A7C1B",
        confirm: "#2E6B3E",
        danger: "#B3261E",
        line: "#DED8C6",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        sm: "2px",
      },
    },
  },
  plugins: [],
};
export default config;
