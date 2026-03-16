"use client";

import { useEffect, useState } from "react";
import useAnimeStore from "@/store/useAnimeStore";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useAnimeStore();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    // Remove all theme classes first
    root.classList.remove("dark", "warm");
    // Apply current theme
    if (theme === "dark") root.classList.add("dark");
    if (theme === "warm") root.classList.add("warm");
    // light = default, no class needed
  }, [theme, mounted]);

  if (!mounted) {
    return <div className="invisible">{children}</div>;
  }

  return (
    <div
      style={{
        backgroundColor: "var(--bg-base)",
        minHeight: "100vh",
        color: "var(--text-primary)",
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      {children}
    </div>
  );
}
