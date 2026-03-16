"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAnimeStore } from "@/store/useAnimeStore";
import ThemeToggle from "@/components/ui/ThemeToggle";

function HomeNavbar() {
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
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 24px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo — left */}
        <div
          style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
          onClick={() => router.push("/")}
        >
          {/* Small icon: purple circle with M */}
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "14px",
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: "0.5px",
            }}
          >
            MG
          </div>
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "22px",
              letterSpacing: "2px",
              color: "var(--text-primary)",
            }}
          >
            MOE<span style={{ color: "var(--accent)" }}>GAMI</span>
          </span>
        </div>

        {/* Center nav links — hidden on mobile */}
        <div className="hidden md:flex" style={{ gap: "32px" }}>
          {["Features", "How It Works", "About"].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
              className="transition-colors hover:text-[var(--text-primary)]"
              style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "var(--text-secondary)",
                textDecoration: "none",
              }}
            >
              {link}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <ThemeToggle />

          {/* GitHub icon button */}
          <a
            href="https://github.com"
            target="_blank"
            className="hidden sm:flex transition-all hover:border-[var(--accent)]"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              textDecoration: "none",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>

          {username ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
              }}
            >
              My Library →
            </button>
          ) : (
            <button
              onClick={() => document.getElementById("hero-input")?.focus()}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
              }}
            >
              Launch App →
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function HeroMockupCard({
  title,
  progress,
  badge,
  rotation,
  delay,
  color = "var(--accent)",
}: {
  title: string;
  progress: number;
  badge?: string;
  rotation: string;
  delay: string;
  color?: string;
}) {
  return (
    <div
      className={`absolute hidden h-48 w-36 animate-float flex-col justify-between rounded-2xl border p-4 backdrop-blur-xl md:flex pointer-events-none scale-75 lg:scale-100 opacity-40`}
      style={
        {
          "--rotation": rotation,
          animationDelay: delay,
          top: "45%",
          left: rotation.startsWith("-") ? "15%" : "75%",
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-md)",
        } as React.CSSProperties
      }
    >
      <div className="flex flex-col gap-2">
        <div className="h-20 w-full rounded-lg bg-[var(--accent-light)]" />
        <div className="h-3 w-3/4 rounded bg-[var(--border)]" />
        <div className="h-2 w-1/2 rounded bg-[var(--border)]" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-secondary)]">{progress}%</span>
          {badge && (
            <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[8px] font-bold text-[var(--accent)]">
              {badge}
            </span>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}


function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/8 bg-[var(--bg-surface)] p-6 transition-all hover:border-[var(--accent)]/40 hover:bg-white/5"
         style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="mb-4 text-3xl">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{desc}</p>
    </div>
  );
}

function StepItem({
  number,
  icon,
  title,
  desc,
}: {
  number: string;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="z-10 mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-light)] text-2xl text-[var(--accent)] shadow-sm">
        {icon}
      </div>
      <h4 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">{title}</h4>
      <p className="max-w-[240px] text-sm text-[var(--text-secondary)]">{desc}</p>
    </div>
  );
}

export default function LandingPage() {
  const [input, setInput] = useState("");
  const setUsername = useAnimeStore((s) => s.setUsername);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setUsername(trimmed);
    router.push("/dashboard");
  }

  return (
    <div style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)", minHeight: "100vh" }} className="font-sans selection:bg-[var(--accent)]/30">
      <HomeNavbar />

      {/* HERO SECTION */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-16">
        {/* Animated Grid Pattern */}
        <div 
          className="absolute inset-0 animate-grid-pulse select-none pointer-events-none opacity-[0.03]" 
          style={{ 
            backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
            backgroundSize: `40px 40px`
          }} 
        />
        
        {/* Radial Glows */}
        <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]/15 blur-[120px]" />
        
        {/* Decorative Floating Cards */}
        <HeroMockupCard 
          title="Attack on Titan" 
          progress={100} 
          badge="★ FULL" 
          rotation="-6deg" 
          delay="0s" 
          color="#4CAF50"
        />
        <div className="hidden md:block">
          <HeroMockupCard 
            title="One Piece" 
            progress={95} 
            rotation="3deg" 
            delay="1s"
          />
        </div>
        <HeroMockupCard 
          title="Fate/stay night" 
          progress={78} 
          rotation="-2deg" 
          delay="2s" 
          color="var(--accent-warm)"
        />

        <div className="relative z-10 w-full max-w-5xl text-center">
          <div className="animate-fade-up flex justify-center opacity-0 [animation-delay:0ms]">
            <span className="inline-block rounded-full border px-4 py-1 text-[10px] font-medium tracking-[0.2em] text-[var(--text-secondary)] bg-[var(--bg-elevated)]"
                  style={{ borderColor: 'var(--border)' }}>
              ✦ FREE & OPEN SOURCE
            </span>
          </div>

          <h1 className="font-display mt-8 flex flex-col text-5xl sm:text-7xl md:text-[8rem] lg:text-[10rem] leading-[0.9]">
            <span className="animate-fade-up text-[var(--text-primary)] opacity-0 [animation-delay:100ms]">
              YOUR ANIME LIBRARY
            </span>
            <span className="animate-fade-up bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] bg-clip-text text-transparent opacity-0 [animation-delay:200ms]">
              FINALLY ORGANISED
            </span>
          </h1>

          <p className="animate-fade-up mx-auto mt-8 max-w-xl text-sm sm:text-base md:text-lg text-[var(--text-secondary)] opacity-0 [animation-delay:300ms]">
            Group hundreds of anime entries into clean franchise timelines.
            Track your main story progress. Never lose track of what's next.
          </p>

          <form 
            onSubmit={handleSubmit} 
            className="animate-fade-up mt-12 opacity-0 [animation-delay:400ms]"
          >
            <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded-full border bg-[var(--bg-surface)] p-2 pl-6 transition-all focus-within:border-[var(--accent)]"
                 style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                A
              </div>
              <input
                id="hero-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your AniList username"
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-[var(--accent)] px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-[var(--accent-hover)] active:scale-95 cursor-pointer"
              >
                → ORGANISE
              </button>
            </div>
            <p className="mt-6 text-[10px] font-medium tracking-widest text-[var(--text-secondary)] opacity-60">
              SUPPORTS ANILIST &bull; MAL COMING SOON &bull; NO ACCOUNT NEEDED
            </p>
          </form>
        </div>
      </section>

      {/* STATS SECTION */}
      <section
        style={{
          padding: "48px 24px",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "32px",
          }}
        >
          {[
            { value: "288+", label: "Franchise Groups" },
            { value: "100%", label: "Progress Tracking" },
            { value: "CN", label: "Donghua Support" },
            { value: "2", label: "Platforms (soon)" },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: "center", flex: "1", minWidth: "120px" }}>
              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "48px",
                  lineHeight: "1",
                  color: "var(--accent)",
                  marginBottom: "8px",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display mb-4 text-5xl text-[var(--text-primary)] md:text-6xl">
            EVERYTHING YOU NEED
          </h2>
          <p className="mb-16 text-[var(--text-secondary)]">Built for the serious anime watcher</p>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard 
              icon="🗂️"
              title="Smart Franchise Grouping"
              desc="Attack on Titan Season 1, 2, 3 and Final Season all grouped under one card automatically."
            />
            <FeatureCard 
              icon="📊"
              title="Main Timeline Progress"
              desc="See exactly what % of the core story you've completed. OVAs and side stories tracked separately."
            />
            <FeatureCard 
              icon="🇨🇳"
              title="Donghua Support"
              desc="Perfect World, Soul Land and other Chinese anime handled correctly with episode-based tracking."
            />
            <FeatureCard 
              icon="🌓"
              title="Light & Dark Theme"
              desc="Switch between dark cinematic mode and clean light mode. Your eyes, your choice."
            />
            <FeatureCard 
              icon="📺"
              title="Side Story Classification"
              desc="Prequels, OVAs and spin-offs shown separately with relation badges. Never confuse extras with main story again."
            />
            <FeatureCard 
              icon="🔍"
              title="Instant Search & Filter"
              desc="Search any franchise, filter by completion status. Find anything in your 700+ entry library instantly."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="bg-white/[0.02] px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-20 text-center text-5xl text-[var(--text-primary)] md:text-6xl">
            HOW IT WORKS
          </h2>
          <div className="grid gap-16 md:grid-cols-3">
            <StepItem 
              number="01"
              icon="🔗"
              title="Connect Your List"
              desc="Enter your AniList or MAL username. No login required for public lists."
            />
            <StepItem 
              number="02"
              icon="🤖"
              title="AI Grouping"
              desc="Our algorithm groups all related entries using relation graphs, just like Chiaki.site but with progress tracking."
            />
            <StepItem 
              number="03"
              icon="📈"
              title="Track Progress"
              desc="See your completion % for every franchise. Know exactly what to watch next."
            />
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="relative overflow-hidden border-y border-white/10 py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent-warm)]/10" />
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <h2 className="font-display mb-10 text-6xl text-[var(--text-primary)] md:text-8xl">
            READY TO ORGANISE?
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded-full border bg-[var(--bg-surface)] p-2 pl-6 transition-all focus-within:border-[var(--accent)]"
                 style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)' }}>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                A
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your AniList username"
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-[var(--accent)] px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-[var(--accent-hover)] active:scale-95 cursor-pointer"
              >
                → ORGANISE
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[var(--bg-surface)] px-6 py-12 md:px-12 border-t border-white/5">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-1 font-display text-xl">
              <span className="text-[var(--text-primary)] font-bold">MOE</span>
              <span className="text-[var(--accent)] font-bold">GAMI</span>
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-[#666666]">
              Made for anime fans
            </p>
          </div>
          <p className="text-center text-[10px] uppercase tracking-widest text-[#666666] md:text-right">
            Built with AniList API &bull; Not affiliated with AniList or MAL
          </p>
        </div>
      </footer>
    </div>
  );
}
