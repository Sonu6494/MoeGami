"use client";

import useAnimeStore from "@/store/useAnimeStore";

const THEMES = ["dark", "warm", "light"] as const;
type Theme = (typeof THEMES)[number];

const THEME_ICONS: Record<Theme, { icon: string; label: string }> = {
  dark: { icon: "🌙", label: "Dark" },
  warm: { icon: "🔥", label: "Warm" },
  light: { icon: "☀️", label: "Light" },
};

export default function ThemeToggle() {
  const { theme, setTheme } = useAnimeStore();

  const cycleTheme = () => {
    const currentIndex = THEMES.indexOf(theme as Theme);
    const nextTheme = THEMES[(currentIndex + 1) % THEMES.length];
    setTheme(nextTheme);
  };

  const current = THEME_ICONS[theme as Theme] ?? THEME_ICONS.dark;

  return (
    <button
      onClick={cycleTheme}
      className="group relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/5 transition-all hover:border-[var(--accent)] hover:bg-white/10"
      style={{
        backgroundColor: "var(--bg-elevated)",
        borderColor: "var(--border)",
      }}
      aria-label={`Current theme: ${current.label}. Click to change.`}
      title={current.label}
    >
      <span className="text-base transition-transform duration-200 group-hover:scale-110">
        {current.icon}
      </span>
    </button>
  );
}
