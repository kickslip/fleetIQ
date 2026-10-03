"use client"

import { useEffect, useRef } from "react"
import { Icon } from "@iconify/react"

export default function NotionAIPage() {
  const liquidButtonsRef = useRef<HTMLElement[]>([])

  useEffect(() => {
    if ("startViewTransition" in document) {
      document.documentElement.classList.add("supports-view-transitions")
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            ;(entry.target as HTMLElement).classList.add("active")
          }
        })
      },
      { threshold: 0.1 }
    )

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el))

    const buttons = Array.from(
      document.querySelectorAll<HTMLElement>(".liquid-btn")
    )

    liquidButtonsRef.current = buttons

    const cleanupFns: Array<() => void> = []

    buttons.forEach((button) => {
      const handleMove = (e: MouseEvent) => {
        const rect = button.getBoundingClientRect()
        const x = e.clientX - rect.left - rect.width / 2
        const y = e.clientY - rect.top - rect.height / 2

        button.style.transform = `
          translate(${x * 0.08}px, ${y * 0.08}px)
          scale(1.04)
        `
      }

      const handleLeave = () => {
        button.style.transform = ""
      }

      button.addEventListener("mousemove", handleMove)
      button.addEventListener("mouseleave", handleLeave)

      cleanupFns.push(() => {
        button.removeEventListener("mousemove", handleMove)
        button.removeEventListener("mouseleave", handleLeave)
      })
    })

    document.documentElement.animate(
      {
        opacity: [0, 1],
        transform: ["translateY(10px)", "translateY(0px)"],
      },
      {
        duration: 1200,
        easing: "cubic-bezier(.16,1,.3,1)",
      }
    )

    return () => {
      observer.disconnect()
      cleanupFns.forEach((fn) => fn())
    }
  }, [])

  return (
    <div className="bg-[oklch(9%_.012_250)] text-text antialiased overflow-x-hidden relative">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        :root {
          color-scheme: dark;
          scroll-behavior: smooth;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          overflow-x: hidden;
          background:
            radial-gradient(circle at top right, oklch(26% .08 250 / .25), transparent 24%),
            radial-gradient(circle at bottom left, oklch(28% .08 200 / .18), transparent 28%),
            oklch(9% .012 250);
          color: white;
          font-family: Inter, ui-sans-serif, system-ui;
        }

        body::before {
          content: "";
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
          background-size: 120px 120px;
          mask-image: radial-gradient(circle at center, black 20%, transparent 80%);
          pointer-events: none;
          opacity: .4;
        }

        .glass {
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
          border: 1px solid rgba(255,255,255,.08);
          backdrop-filter: blur(26px) saturate(180%);
          -webkit-backdrop-filter: blur(26px) saturate(180%);
          box-shadow:
            0 1px 0 rgba(255,255,255,.05) inset,
            0 -1px 0 rgba(255,255,255,.02) inset,
            0 30px 90px rgba(0,0,0,.45);
        }

        .glass::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              130deg,
              transparent 20%,
              rgba(255,255,255,.14),
              transparent 80%
            );
          transform: translateX(-120%);
          animation: shine 10s linear infinite;
        }

        @keyframes shine {
          to {
            transform: translateX(120%);
          }
        }

        .noise::after {
          content: "";
          position: absolute;
          inset: 0;
          opacity: .05;
          background-image: radial-gradient(circle, white 1px, transparent 1px);
          background-size: 14px 14px;
          pointer-events: none;
        }

        .orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(90px);
          pointer-events: none;
          mix-blend-mode: plus-lighter;
        }

        .portal {
          transform-style: preserve-3d;
          animation: portalFloat 12s ease-in-out infinite;
        }

        @keyframes portalFloat {
          0%,100% {
            transform: translateY(0px) rotate(-6deg);
          }

          50% {
            transform: translateY(-22px) rotate(-3deg);
          }
        }

        .kinetic {
          background:
            linear-gradient(
              90deg,
              rgba(255,255,255,.5),
              white,
              rgba(255,255,255,.5)
            );
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          animation: shimmer 5s linear infinite;
        }

        @keyframes shimmer {
          to {
            background-position: 200% center;
          }
        }

        .liquid-btn {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          transition: transform .4s cubic-bezier(.16,1,.3,1), opacity .3s ease;
        }

        .liquid-btn::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at top left, rgba(255,255,255,.35), transparent 35%),
            linear-gradient(135deg, rgba(255,255,255,.18), rgba(255,255,255,.02));
          mix-blend-mode: overlay;
        }

        .tilt {
          transition: transform .5s cubic-bezier(.16,1,.3,1), box-shadow .5s cubic-bezier(.16,1,.3,1);
        }

        .tilt:hover {
          transform:
            perspective(1200px)
            rotateX(5deg)
            rotateY(-5deg)
            translateY(-10px);
        }

        .reveal {
          opacity: 0;
          transform: translateY(50px) scale(.98);
          filter: blur(12px);
          transition:
            opacity 1s cubic-bezier(.16,1,.3,1),
            transform 1s cubic-bezier(.16,1,.3,1),
            filter 1s cubic-bezier(.16,1,.3,1);
          transition-timeline: view();
          transition-range: entry 10% cover 32%;
        }

        .reveal.active {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }

        .mask-video {
          mask-image: radial-gradient(circle at 70% 50%, black 40%, transparent 88%);
          -webkit-mask-image: radial-gradient(circle at 70% 50%, black 40%, transparent 88%);
        }

        .floating-card {
          animation: drift 8s ease-in-out infinite;
        }

        @keyframes drift {
          0%,100% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-14px);
          }
        }

        .border-flow {
          position: relative;
        }

        .border-flow::after {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(130deg, rgba(255,255,255,.14), transparent, rgba(255,255,255,.05));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        ::selection {
          background: rgba(110,140,255,.35);
          color: white;
        }
      `}</style>

      <div className="orb bg-primary/30 w-[500px] h-[500px] top-[-200px] right-[-100px]" />
      <div className="orb bg-cyan/20 w-[400px] h-[400px] bottom-[-160px] left-[-80px]" />

      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-8 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="glass border-flow rounded-[2rem] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl glass flex items-center justify-center">
                <Icon icon="solar:notes-bold-duotone" className="text-2xl text-primary" />
              </div>

              <div>
                <p className="font-semibold tracking-tight">Notion AI</p>
                <p className="text-xs text-muted">
                  Unified intelligence for modern workspaces
                </p>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-2">
              <a href="#workspace" className="px-4 py-2 rounded-full text-sm text-muted hover:text-white transition">
                Workspace
              </a>
              <a href="#intelligence" className="px-4 py-2 rounded-full text-sm text-muted hover:text-white transition">
                Intelligence
              </a>
              <a href="#system" className="px-4 py-2 rounded-full text-sm text-muted hover:text-white transition">
                System
              </a>
            </nav>

            <button className="liquid-btn glass border-flow rounded-full px-6 py-3 text-sm font-medium hover:scale-105 transition">
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="min-h-screen relative flex items-center px-5 md:px-8 overflow-hidden">
          <div className="max-w-7xl mx-auto w-full grid xl:grid-cols-[.8fr_1.2fr] gap-20 items-center">
            <div className="relative z-10 pt-32">
              <div className="glass inline-flex items-center gap-3 px-4 py-2 rounded-full mb-8 border-flow">
                <div className="w-2 h-2 rounded-full bg-cyan" />
                <span className="text-sm text-muted">
                  AI-powered collaborative systems
                </span>
              </div>

              <h1 className="text-[3.5rem] sm:text-[5rem] lg:text-[7rem] leading-[.9] tracking-[-.08em] font-semibold max-w-4xl">
                Ideas move <span className="kinetic">faster</span> when knowledge flows.
              </h1>

              <p className="mt-8 max-w-xl text-lg text-muted leading-relaxed">
                An immersive workspace built around adaptive thinking, realtime collaboration and sensory interface systems engineered for modern product teams.
              </p>

              <div className="mt-12 flex flex-wrap gap-4">
                <button className="liquid-btn glass border-flow rounded-full px-7 py-4 font-medium hover:scale-105 transition">
                  Explore Workspace
                </button>

                <button className="rounded-full px-7 py-4 border border-white/10 bg-white/[.03] hover:bg-white/[.06] transition">
                  Watch Demo
                </button>
              </div>

              <div className="mt-20 grid sm:grid-cols-3 gap-5">
                <div className="glass border-flow rounded-[2rem] p-5">
                  <p className="text-4xl font-semibold tracking-tight">120+</p>
                  <p className="text-sm text-muted mt-2">
                    integrated knowledge systems
                  </p>
                </div>

                <div className="glass border-flow rounded-[2rem] p-5">
                  <p className="text-4xl font-semibold tracking-tight">14ms</p>
                  <p className="text-sm text-muted mt-2">
                    realtime sync response
                  </p>
                </div>

                <div className="glass border-flow rounded-[2rem] p-5">
                  <p className="text-4xl font-semibold tracking-tight">AI</p>
                  <p className="text-sm text-muted mt-2">
                    contextual semantic memory
                  </p>
                </div>
              </div>
            </div>

            <div className="relative hidden xl:block min-h-[860px]">
              <div className="portal absolute right-[-80px] top-20 w-[760px] h-[760px]">
                <div className="absolute top-[-40px] left-[-60px] glass border-flow rounded-[2rem] p-5 z-30 floating-card">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-white/[.05] flex items-center justify-center">
                      <Icon icon="solar:widget-bold-duotone" className="text-3xl text-cyan" />
                    </div>

                    <div>
                      <p className="text-sm text-muted">Neural Workspace</p>
                      <p className="text-2xl font-semibold">
                        +38% focus efficiency
                      </p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-10 left-[-100px] w-[260px] glass border-flow rounded-[2rem] p-6 z-30">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-muted">Knowledge Mapping</p>
                    <div className="w-3 h-3 rounded-full bg-cyan animate-pulse" />
                  </div>

                  <div className="space-y-4">
                    <div className="h-3 rounded-full bg-white/[.06] overflow-hidden">
                      <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-primary to-cyan" />
                    </div>

                    <div className="h-3 rounded-full bg-white/[.06] overflow-hidden">
                      <div className="h-full w-[74%] rounded-full bg-gradient-to-r from-pink to-primary" />
                    </div>

                    <div className="h-3 rounded-full bg-white/[.06] overflow-hidden">
                      <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-cyan to-white" />
                    </div>
                  </div>
                </div>

                <div className="glass border-flow noise rounded-[4rem] overflow-hidden absolute inset-0 shadow-liquid">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[.08] via-transparent to-transparent z-10" />

                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover opacity-90 mask-video"
                  >
                    <source src="/video.mp4" type="video/mp4" />
                  </video>

                  <div className="absolute inset-0 bg-gradient-to-l from-black via-black/10 to-transparent" />

                  <div className="absolute top-10 right-10 z-20">
                    <div className="glass rounded-full px-5 py-3 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-xs tracking-wide text-muted">
                        Adaptive intelligence layer
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="workspace" className="relative py-40 px-5 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-20 reveal">
              <p className="uppercase tracking-[.25em] text-xs text-muted mb-5">
                Spatial Collaboration
              </p>

              <h2 className="text-5xl md:text-7xl tracking-[-.07em] leading-none font-semibold max-w-5xl">
                Information shaped as a living system.
              </h2>
            </div>

            <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-7">
              <div className="glass border-flow rounded-[3rem] p-8 md:p-10 tilt reveal">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <p className="text-sm text-muted">Workspace Fabric</p>
                    <h3 className="text-3xl font-semibold mt-2">
                      Contextual operational memory
                    </h3>
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-white/[.04] flex items-center justify-center">
                    <Icon icon="solar:layers-bold-duotone" className="text-3xl text-primary" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="rounded-[2rem] bg-white/[.03] border border-white/[.06] p-6">
                    <p className="text-muted text-sm">Semantic indexing</p>
                    <p className="mt-4 text-4xl tracking-tight font-semibold">
                      8.4x
                    </p>
                    <p className="mt-3 text-sm text-muted leading-relaxed">
                      Faster retrieval across distributed collaborative systems.
                    </p>
                  </div>

                  <div className="rounded-[2rem] bg-white/[.03] border border-white/[.06] p-6">
                    <p className="text-muted text-sm">Neural organization</p>
                    <p className="mt-4 text-4xl tracking-tight font-semibold">
                      92%
                    </p>
                    <p className="mt-3 text-sm text-muted leading-relaxed">
                      Automated workspace structure prediction accuracy.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-7">
                <div className="glass border-flow rounded-[2.5rem] p-8 reveal">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-muted text-sm">Live Collaboration</p>
                      <h4 className="mt-3 text-2xl font-semibold">
                        Multi-user sensory editing
                      </h4>
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-white/[.04] flex items-center justify-center">
                      <Icon icon="solar:users-group-rounded-bold-duotone" className="text-2xl text-cyan" />
                    </div>
                  </div>

                  <p className="mt-6 text-muted leading-relaxed">
                    Dynamic editing environments powered by adaptive synchronization and AI contextual awareness.
                  </p>
                </div>

                <div className="glass border-flow rounded-[2.5rem] p-8 reveal">
                  <div className="flex items-center justify-between mb-8">
                    <p className="text-muted text-sm">Team Productivity</p>
                    <p className="text-sm text-cyan">+24% monthly</p>
                  </div>

                  <div className="h-44 flex items-end gap-3">
                    <div className="w-full rounded-t-[1.5rem] bg-white/[.06] h-[30%]" />
                    <div className="w-full rounded-t-[1.5rem] bg-white/[.08] h-[55%]" />
                    <div className="w-full rounded-t-[1.5rem] bg-white/[.1] h-[76%]" />
                    <div className="w-full rounded-t-[1.5rem] bg-gradient-to-t from-primary/70 to-cyan/70 h-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="intelligence" className="relative py-36 px-5 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="reveal">
                <p className="uppercase tracking-[.25em] text-xs text-muted mb-5">
                  Native Intelligence
                </p>

                <h2 className="text-5xl md:text-6xl tracking-[-.07em] leading-[.95] font-semibold">
                  Systems designed around cognition.
                </h2>

                <p className="mt-8 max-w-xl text-muted leading-relaxed text-lg">
                  Every interaction responds with fluidity, contextual adaptation and material depth engineered for premium human-computer workflows.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 reveal">
                <div className="glass border-flow rounded-[2rem] p-7">
                  <div className="w-14 h-14 rounded-2xl bg-white/[.05] flex items-center justify-center mb-8">
                    <Icon icon="logos:javascript" className="text-3xl" />
                  </div>

                  <h4 className="text-2xl font-semibold">Native Motion</h4>

                  <p className="mt-4 text-muted text-sm leading-relaxed">
                    Scroll-linked interaction systems built without animation libraries.
                  </p>
                </div>

                <div className="glass border-flow rounded-[2rem] p-7">
                  <div className="w-14 h-14 rounded-2xl bg-white/[.05] flex items-center justify-center mb-8">
                    <Icon icon="logos:tailwindcss-icon" className="text-3xl" />
                  </div>

                  <h4 className="text-2xl font-semibold">Container Logic</h4>

                  <p className="mt-4 text-muted text-sm leading-relaxed">
                    Responsive architecture driven through intrinsic container systems.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="system" className="relative py-40 px-5 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="glass border-flow rounded-[3rem] p-8 md:p-14 overflow-hidden relative">
              <div className="absolute top-[-100px] left-[-60px] w-[320px] h-[320px] rounded-full bg-primary/10 blur-[120px]" />

              <div className="grid lg:grid-cols-[1fr_.8fr] gap-12 items-center relative z-10">
                <div>
                  <p className="uppercase tracking-[.25em] text-xs text-muted mb-5">
                    Intelligent Workspace
                  </p>

                  <h2 className="text-5xl md:text-7xl tracking-[-.07em] leading-none font-semibold max-w-3xl">
                    Design interfaces people can feel.
                  </h2>

                  <p className="mt-8 text-lg text-muted max-w-xl leading-relaxed">
                    Light diffusion, sensory depth and adaptive movement combine into a liquid interface architecture optimized for focus.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="glass rounded-[2rem] p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted">AI Writing Layer</p>
                        <h4 className="text-2xl font-semibold mt-2">
                          Generative workflow orchestration
                        </h4>
                      </div>

                      <Icon icon="solar:pen-new-square-bold-duotone" className="text-4xl text-cyan" />
                    </div>
                  </div>

                  <div className="glass rounded-[2rem] p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted">Workspace Graph</p>
                        <h4 className="text-2xl font-semibold mt-2">
                          Connected operational memory
                        </h4>
                      </div>

                      <Icon icon="solar:share-circle-bold-duotone" className="text-4xl text-pink" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-5 md:px-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="glass border-flow rounded-[2rem] px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/[.05] flex items-center justify-center">
                <Icon icon="solar:notes-bold-duotone" className="text-2xl text-primary" />
              </div>

              <div>
                <p className="font-medium">Notion AI</p>
                <p className="text-xs text-muted">
                  Connected systems for intelligent teams
                </p>
              </div>
            </div>

            <p className="text-sm text-muted">
              © 2026 Notion AI — Adaptive collaboration architecture.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}