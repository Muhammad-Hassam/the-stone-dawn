import { useEffect, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";

function getInitialTheme() {
  const stored = localStorage.getItem("pgc_theme");
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
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
      className="flex items-center justify-center w-10 h-10 rounded-full text-muted hover:text-ink hover:bg-surface transition-colors"
      title="Toggle theme"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <FiSun className="w-5 h-5" />
      ) : (
        <FiMoon className="w-5 h-5" />
      )}
    </button>
  );
}
