import { useEffect, useState } from "react";
import { getPreferredTheme, setTheme } from "../../utill/Them";

export function ThemeToggle() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const preferred = getPreferredTheme();
    setTheme(preferred);
    setThemeState(preferred);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle theme"
      className={`relative w-16 h-8 rounded-full border border-white/40
                  glass transition-colors duration-300 ease-in-out
                  ${isDark ? "bg-slate-800/70" : "bg-sky-200/60"}`}
    >
      {/* Track icons */}
      <span className="absolute inset-0 flex items-center justify-between px-2 text-xs select-none pointer-events-none">
        <span className={isDark ? "opacity-40" : "opacity-100"}>☀️</span>
        <span className={isDark ? "opacity-100" : "opacity-40"}>🌙</span>
      </span>

      {/* Sliding knob */}
      <span
        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md
                    flex items-center justify-center text-xs
                    transform transition-transform duration-300 ease-in-out
                    ${isDark ? "translate-x-8" : "translate-x-0"}`}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}