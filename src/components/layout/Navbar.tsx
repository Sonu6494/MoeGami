"use client";

import useAnimeStore from "@/store/useAnimeStore";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { username } = useAnimeStore();
  const router = useRouter();

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: "64px",
        backgroundColor: "var(--bg-nav)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 24px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: back + logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button
            onClick={() => router.push("/")}
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            ← <span className="hidden sm:inline">Back</span>
          </button>
          <div
            style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
            onClick={() => router.push("/")}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "7px",
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "12px",
                fontWeight: "bold",
                fontFamily: "'Bebas Neue', sans-serif",
              }}
            >
              MG
            </div>
            <span
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "20px",
                letterSpacing: "2px",
                color: "var(--text-primary)",
              }}
            >
              MOE<span style={{ color: "var(--accent)" }}>GAMI</span>
            </span>
          </div>
        </div>

        {/* Right: theme + user */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ThemeToggle />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px 6px 8px",
              borderRadius: "20px",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              {username?.charAt(0).toUpperCase()}
            </div>
            <span
              className="hidden sm:inline"
              style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}
            >
              {username}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
