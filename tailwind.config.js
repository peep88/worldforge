/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // WorldForge design tokens — dark parchment fantasy aesthetic
        forge: {
          bg:        "#0f0e0c",   // near-black warm
          surface:   "#1a1814",   // card surfaces
          elevated:  "#221f1a",   // modals, dropdowns
          border:    "#2e2a24",   // subtle borders
          muted:     "#3d3730",   // disabled, inactive
          text:      "#e8dcc8",   // primary text (warm cream)
          subtle:    "#9a8f7e",   // secondary text
          accent:    "#c4933f",   // gold accent (links, highlights)
          accentHover: "#d4a84f",
          danger:    "#c0392b",
          success:   "#4a8c5c",
        }
      },
      fontFamily: {
        display: ["'Cinzel'", "Georgia", "serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "5px",
        lg: "8px",
      },
      boxShadow: {
        forge: "0 2px 8px rgba(0,0,0,0.6)",
        forgeHover: "0 4px 16px rgba(0,0,0,0.8)",
      }
    },
  },
  plugins: [],
};
