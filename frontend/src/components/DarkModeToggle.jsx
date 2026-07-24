import { useEffect, useState } from "react";

function getInitialTheme() {
  const stored = localStorage.getItem("pgc_theme");
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function DarkModeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("pgc_theme", theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      className="font-ui text-[10px] tracking-[0.15em] uppercase font-semibold px-3 py-1.5 border border-ink/30 rounded-sm text-ink/60 hover:text-ink hover:border-ink transition-colors"
      title="Toggle day/night edition"
    >
      {theme === "dark" ? "Night Edition" : "Day Edition"}
    </button>
  );
}
