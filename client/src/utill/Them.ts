// utils/theme.ts
export function setTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  localStorage.setItem("theme", theme);
}

export function getPreferredTheme(): "light" | "dark" {
  const saved = localStorage.getItem("theme") as "light" | "dark" | null;
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}