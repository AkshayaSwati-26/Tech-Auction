/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Midnight Editorial Glass — see STYLE_GUIDE.md for the token table.
        void: "#05030D",
        midnight: "#05030D",
        panel: "#0E0B1C",
        live: "#A78BFA", // active / primary state (violet)
        violet: {
          DEFAULT: "#8B5CF6",
          glow: "#A78BFA",
        },
        mint: "#34D399",
        coral: "#FB7185",
        // Gold is money and rank 1 only. One value; the numbered keys are aliases.
        gold: {
          DEFAULT: "#E8C277",
          1: "#E8C277",
          2: "#E8C277",
          3: "#E8C277",
          4: "#E8C277",
          5: "#E8C277",
        },
        chrome: {
          1: "#FFFFFF",
          2: "#CFC6F0",
          3: "#B9AEDB",
          4: "#F8F5FF",
        },
        ink: "#F8F5FF",
        paper: "#F8F5FF",
        slate: {
          muted: "#B9AEDB",
        },
        faint: "#7F76A3",
      },
      fontFamily: {
        display: ["Sora", "ui-sans-serif", "system-ui"],
        sans: ["Sora", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        glow: "0 10px 30px -18px rgba(139, 92, 246, 0.45)",
      },
    },
  },
  plugins: [],
};
