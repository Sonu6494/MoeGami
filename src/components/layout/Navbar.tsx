"use client";

import { useState } from "react";
import useAnimeStore from "@/store/useAnimeStore";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { username, platform, setUsername, setFranchiseGroups, setSequelAlerts } = useAnimeStore();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

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
          
          {/* Platform Indicator */}
          <span
            style={{
              fontSize: "10px",
              fontWeight: "700",
              padding: "2px 8px",
              borderRadius: "8px",
              backgroundColor: platform === "MAL" ? "#2E51A2" : "var(--accent)",
              color: "#fff",
              letterSpacing: "0.5px",
            }}
          >
            {platform === "MAL" ? "MAL" : "AL"}
          </span>

          <div style={{ position: "relative" }}>
            <div
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px 6px 8px",
                borderRadius: "20px",
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
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
                {username ? username.charAt(0).toUpperCase() : "U"}
              </div>
              <span
                className="hidden sm:inline"
                style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}
              >
                {username || "User"}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transform: showDropdown ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                  color: "var(--text-secondary)",
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "8px",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "6px",
                    minWidth: "160px",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 100,
                  }}
                >
                  <button
                    onClick={() => {
                      setUsername("");
                      setFranchiseGroups([]);
                      setSequelAlerts([]);
                      setShowDropdown(false);
                      router.push("/");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#FF6161",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "rgba(255,97,97,0.1)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span>🚪</span> Disconnect
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
