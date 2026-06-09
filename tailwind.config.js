/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy:  { 900: "#050d1a", 800: "#0a1628", 700: "#0e1f3d" },
      },
      fontFamily: {
        display: ["'Orbitron'", "sans-serif"],
        body:    ["'DM Sans'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 4s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        scan: { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100vh)" } },
        glow: { "0%": { boxShadow: "0 0 5px #00d4ff33" }, "100%": { boxShadow: "0 0 25px #00d4ff88" } },
      },
    },
  },
  plugins: [],
};
