import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  Phone,
  Siren,
  Buildings,
  MapPin,
  Plus,
  FirstAid,
  ShieldStar,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { GlassButton } from "@/components/GlassButton";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScoreChip } from "@/components/ScoreChip";
import { BottomNav } from "@/components/BottomNav";
import { BackButton } from "@/components/BackButton";
import { EMERGENCY, civicForCity, type Helpline, type CivicDirectory } from "./resourceData";

const EASE = [0.16, 1, 0.3, 1] as const;

function telHref(n: string) {
  return `tel:${n.replace(/[^0-9+]/g, "")}`;
}

function pretty(n: string) {
  // light grouping for readability without assuming a fixed format
  if (/^\d{3,4}$/.test(n)) return n; // short codes as-is
  return n;
}

export function Resources() {
  const reduce = useReducedMotion();
  const [civic, setCivic] = useState<CivicDirectory>(() => civicForCity(null));

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      async (p) => {
        try {
          const r = await fetch(`/api/geocode?lat=${p.coords.latitude}&lng=${p.coords.longitude}`);
          if (r.ok) {
            const d = (await r.json()) as { area: string | null };
            // the area string usually ends with the city; match loosely
            if (d.area) setCivic(civicForCity(d.area));
          }
        } catch {
          /* keep the national fallback */
        }
      },
      () => {},
      { timeout: 8000 },
    );
  }, []);

  return (
    <div className="relative min-h-[100dvh] px-4 pb-28 pt-5 md:px-8 md:pb-20">
      <AuroraBackground />
      <BottomNav />

      <header className="mx-auto flex max-w-3xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BackButton />
          <Link to="/" aria-label="Home" className="hidden sm:inline-flex">
            <Logo />
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/community" className="hidden rounded-full px-4 py-2 text-[0.95rem] text-muted hover:text-ink sm:inline-flex">
            Community
          </Link>
          <Link to="/leaderboard" className="hidden rounded-full px-4 py-2 text-[0.95rem] text-muted hover:text-ink sm:inline-flex">
            Leaderboard
          </Link>
          <ScoreChip />
          <GlassButton to="/report" variant="act" className="!min-h-[44px] !px-5 !text-[0.95rem]">
            <Plus size={17} weight="bold" /> Report
          </GlassButton>
        </div>
      </header>

      <div className="mx-auto mt-8 max-w-3xl">
        <h1 className="inline-flex items-center gap-2.5 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold text-ink">
          <FirstAid size={30} weight="fill" className="text-danger" /> Help & resources
        </h1>
        <p className="mt-1.5 text-muted">Every number that matters, one tap to call. Save this page.</p>

        {/* EMERGENCY */}
        <Section
          icon={<Siren size={20} weight="fill" className="text-danger" />}
          title="Emergency"
          subtitle="National lines · available 24×7"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {EMERGENCY.map((h, i) => (
              <CallCard key={h.number + h.label} h={h} i={i} reduce={!!reduce} tone="danger" />
            ))}
          </div>
        </Section>

        {/* CIVIC */}
        <Section
          icon={<Buildings size={20} weight="fill" className="text-teal-deep" />}
          title="Civic helplines"
          subtitle={
            civic.city ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} weight="fill" className="text-teal" /> {civic.body}
              </span>
            ) : (
              <span>National grievance lines · enable location for your city's body</span>
            )
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {civic.lines.map((h, i) => (
              <CallCard key={h.number + h.label} h={h} i={i} reduce={!!reduce} tone="teal" />
            ))}
          </div>
        </Section>

        {/* file-a-report nudge */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE }}
          className="glass-smoke mt-8 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <ShieldStar size={26} weight="fill" className="text-onink/80" />
            <div>
              <p className="font-display text-[1.1rem] font-medium text-onink">Not an emergency?</p>
              <p className="text-onink/70">File it with Jagrik — we draft and route the complaint for you.</p>
            </div>
          </div>
          <GlassButton to="/report" variant="act" className="!min-h-[44px] shrink-0">
            <Plus size={17} weight="bold" /> Report an issue
          </GlassButton>
        </motion.div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-full glass glass-edge">{icon}</span>
        <div>
          <h2 className="font-display text-[1.3rem] font-semibold text-ink">{title}</h2>
          <p className="text-[0.88rem] text-muted">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CallCard({ h, i, reduce, tone }: { h: Helpline; i: number; reduce: boolean; tone: "danger" | "teal" }) {
  const accent = tone === "danger" ? "var(--color-danger)" : "var(--color-teal-deep)";
  return (
    <motion.a
      href={telHref(h.number)}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: Math.min(i * 0.03, 0.25) }}
      className="liquid glass glass-edge group flex items-center gap-3.5 rounded-[18px] p-4"
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition-transform group-hover:scale-105"
        style={{ background: accent }}
      >
        <Phone size={19} weight="fill" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-ink">{h.label}</div>
        {h.note && <div className="truncate text-[0.82rem] text-muted">{h.note}</div>}
      </div>
      <div className="text-right">
        <div className="font-mono text-[1.05rem] font-semibold" style={{ color: accent }}>
          {pretty(h.number)}
        </div>
        <div className="text-[10.5px] uppercase tracking-[0.12em] text-faint">tap to call</div>
      </div>
    </motion.a>
  );
}
