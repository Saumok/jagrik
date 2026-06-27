import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  MicrophoneStage,
  Path,
  PaperPlaneTilt,
  TrendUp,
  Lightning,
  SealCheck,
  Buildings,
  Eye,
  WhatsappLogo,
  Translate,
  MapPinArea,
  ArrowRight,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { GlassButton } from "@/components/GlassButton";
import { LiquidTabs, type TabItem } from "@/components/LiquidTabs";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Magnetic, CountUp } from "@/components/motionPrimitives";
import { HeroPanel } from "./HeroPanel";
import { MiniWarRoom } from "./miniCards";

const EASE = [0.16, 1, 0.3, 1] as const;
const AUTO_MS = 4200;

const HERO_TABS: TabItem[] = [
  { id: "see-say", label: "Capture", icon: <MicrophoneStage size={17} weight="fill" /> },
  { id: "route", label: "Route", icon: <Path size={17} weight="fill" /> },
  { id: "dispatch", label: "File", icon: <PaperPlaneTilt size={17} weight="fill" /> },
  { id: "predict", label: "Predict", icon: <TrendUp size={17} weight="bold" /> },
];

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const tick = useRef<number | null>(null);

  // auto-advance the showcase; pause on hover/focus so a judge can dwell.
  useEffect(() => {
    if (reduce || paused) return;
    tick.current = window.setTimeout(
      () => setActive((a) => (a + 1) % HERO_TABS.length),
      AUTO_MS,
    );
    return () => {
      if (tick.current) clearTimeout(tick.current);
    };
  }, [active, paused, reduce]);

  function select(i: number) {
    // clear any pending auto-advance immediately so a manual pick can't be
    // overridden by a timer firing in the same frame.
    if (tick.current) clearTimeout(tick.current);
    setActive(i);
  }

  return (
    <div className="relative overflow-x-clip">
      <AuroraBackground />

      {/* ---- NAV ---- */}
      <nav className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-4 md:px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <a href="#how" className="hidden rounded-full px-4 py-2 text-[0.95rem] text-muted hover:text-ink sm:inline-flex">
            How it works
          </a>
          <Link to="/app" className="hidden rounded-full px-4 py-2 text-[0.95rem] text-muted hover:text-ink sm:inline-flex">
            Live issues
          </Link>
          <Link to="/community" className="hidden rounded-full px-4 py-2 text-[0.95rem] text-muted hover:text-ink sm:inline-flex">
            Community
          </Link>
          <Link to="/dashboard" className="hidden rounded-full px-4 py-2 text-[0.95rem] text-muted hover:text-ink sm:inline-flex">
            Dashboard
          </Link>
          <GlassButton to="/report" variant="primary" className="!min-h-[44px] !px-5 !text-[0.95rem]">
            Report a problem
          </GlassButton>
        </div>
      </nav>

      {/* ---- HERO (interactive, tab-driven) ---- */}
      <header className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 md:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-8 lg:pt-14">
        <div>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            className="font-display text-[clamp(2.75rem,8vw,4.5rem)] font-semibold leading-[1.0] tracking-tight text-ink"
          >
            See it. Say it.
            <br />
            <span className="text-teal">Solved.</span>
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.22 }}
            className="mt-5 max-w-[42ch] text-[1.15rem] leading-relaxed text-muted"
          >
            A photo or a spoken word becomes a filed, tracked, AI-verified civic complaint.
            Automatically.
          </motion.p>

          {/* the liquid-glass tabs — the signature control driving the panel.
              Interacting with the tabs does NOT pause auto-advance; only dwelling
              on the panel itself does (so the showcase keeps cycling after a click). */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.32 }}
            className="mt-7"
          >
            <LiquidTabs
              tabs={HERO_TABS}
              active={active}
              onChange={select}
              autoMs={reduce ? undefined : AUTO_MS}
              paused={paused}
              fill
            />
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.42 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <GlassButton to="/report" variant="act">
                Report a problem <ArrowRight size={18} weight="bold" />
              </GlassButton>
            </Magnetic>
            <GlassButton to="/report" variant="secondary">
              Watch the agents work
            </GlassButton>
          </motion.div>
        </div>

        <div
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
        >
          <HeroPanel active={active} />
        </div>
      </header>

      {/* ---- HOW IT WORKS (connected stepper) ---- */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <Reveal>
          <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold text-ink">
            From a glance to a filed complaint
          </h2>
        </Reveal>

        <div className="relative mt-12 grid gap-8 md:grid-cols-3">
          <span className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-teal/30 to-transparent md:block" />
          {[
            { icon: MicrophoneStage, t: "Show it or say it", d: "Snap a photo, or speak in Bengali, Hindi or English. No typing, no forms." },
            { icon: Lightning, t: "The agents act", d: "They classify it, find the right KMC office, draft a formal complaint and send a real email." },
            { icon: SealCheck, t: "Track and verify", d: "Follow a live status timeline. Upload an after-photo and the AI confirms the fix." },
          ].map((s, i) => (
            <Reveal key={s.t} delay={i * 0.1} className="relative">
              <div className="glass glass-edge grid h-14 w-14 place-items-center rounded-full text-teal-deep">
                <s.icon size={26} weight="fill" />
              </div>
              <h3 className="mt-5 font-display text-[1.3rem] font-medium text-ink">{s.t}</h3>
              <p className="mt-2 max-w-[34ch] text-muted">{s.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---- WHY DIFFERENT (asymmetric bento) ---- */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <Reveal>
          <h2 className="max-w-[18ch] font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold text-ink">
            Most civic apps report. Jagrik acts.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div className="glass glass-edge flex h-full flex-col justify-between gap-8 rounded-[22px] p-7 md:flex-row md:items-center">
              <div className="max-w-[34ch]">
                <h3 className="font-display text-[1.5rem] font-medium text-ink">
                  It files a real complaint, not a ticket into the void
                </h3>
                <p className="mt-3 text-muted">
                  A real email lands in the department inbox with a formal PDF and your photo
                  attached. Then it schedules its own follow-up.
                </p>
                <div className="mt-5 flex items-baseline gap-2">
                  <CountUp to={12} className="font-display text-[2.25rem] font-semibold text-teal" />
                  <span className="text-muted">citizens already merged into one live ticket</span>
                </div>
              </div>
              <div className="shrink-0">
                <MiniWarRoom />
              </div>
            </div>
          </Reveal>

          <div className="grid gap-5">
            <Reveal delay={0.08}>
              <div className="glass glass-edge glass-teal h-full rounded-[22px] p-6">
                <Buildings size={28} weight="fill" className="text-teal-deep" />
                <h3 className="mt-4 font-display text-[1.2rem] font-medium text-ink">
                  Knows the real KMC structure
                </h3>
                <p className="mt-2 text-[0.95rem] text-text/80">
                  Routes drainage, roads, lighting and waste to the correct borough department.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="glass glass-edge h-full rounded-[22px] p-6">
                <Eye size={28} weight="fill" className="text-marigold-deep" />
                <h3 className="mt-4 font-display text-[1.2rem] font-medium text-ink">
                  AI verifies the fix
                </h3>
                <p className="mt-2 text-[0.95rem] text-muted">
                  A before-and-after photo check flips an issue to resolved. The loop actually closes.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- ROADMAP (horizontal scroll-snap) ---- */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <Reveal>
          <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold text-ink">
            Where it goes next
          </h2>
          <p className="mt-2 max-w-[46ch] text-muted">
            The same agent, meeting citizens where they already are.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none]">
            {[
              { icon: WhatsappLogo, t: "On WhatsApp", d: "Report straight from the app 500 million Indians already use." },
              { icon: Translate, t: "More languages", d: "Every major Indian language, spoken or typed." },
              { icon: MapPinArea, t: "More cities", d: "The routing brain, retrained for each municipal body." },
              { icon: Buildings, t: "Authority dashboards", d: "Give departments a live, accountable queue." },
            ].map((c) => (
              <div key={c.t} className="glass glass-edge w-[16rem] shrink-0 snap-start rounded-[22px] p-6">
                <c.icon size={28} weight="fill" className="text-teal" />
                <h3 className="mt-4 font-display text-[1.2rem] font-medium text-ink">{c.t}</h3>
                <p className="mt-2 text-[0.95rem] text-muted">{c.d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ---- FINAL CTA ---- */}
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-10 md:px-8">
        <Reveal>
          <div className="glass glass-edge relative overflow-hidden rounded-[28px] px-6 py-16 text-center">
            <h2 className="font-display text-[clamp(2rem,5vw,3rem)] font-semibold leading-tight text-ink">
              See a problem? File it in seconds.
            </h2>
            <p className="mx-auto mt-3 max-w-[40ch] text-[1.1rem] text-muted">
              Point your camera or just speak. Jagrik does the rest.
            </p>
            <div className="mt-8 flex justify-center">
              <Magnetic>
                <GlassButton to="/report" variant="act">
                  Report a problem <ArrowRight size={18} weight="bold" />
                </GlassButton>
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---- FOOTER ---- */}
      <footer className="mx-auto max-w-6xl px-4 pb-10 md:px-8">
        <div className="flex flex-col items-center justify-between gap-4 border-t border-nude-200/70 pt-8 sm:flex-row">
          <Logo size={24} />
          <p className="text-[0.9rem] text-faint">A citizen civic agent, built for Kolkata.</p>
        </div>
      </footer>
    </div>
  );
}
