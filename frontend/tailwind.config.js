/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--color-paper)",
        card: "var(--color-card)",
        ink: "var(--color-ink)",
        rule: "var(--color-rule)",
        redpen: "var(--color-redpen)",
        greenpen: "var(--color-greenpen)",
        brass: "var(--color-brass)",
        masthead: "var(--color-masthead)",
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        serif: ["'Source Serif 4'", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        ui: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
