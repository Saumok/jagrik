import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  FileText,
  UsersThree,
  SealCheck,
  Clock,
  Fire,
  Sparkle,
  Buildings,
  Plus,
  ArrowLeft,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { GlassButton } from "@/components/GlassButton";
import { AuroraBackground } from "@/components/AuroraBackground";
import { CountUp } from "@/components/motionPrimitives";
import { fetchDashboard, type DashboardData } from "@/lib/dashboardApi";
import { Donut, BarList, TrendArea, typeMeta } from "./charts";

const EASE = [0.16, 1, 0.3, 1] as const;

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetchDashboard(ac.signal)
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => ac.abort();
  }, []);

  return (
    <div className="relative min-h-[100dvh] px-4 pb-20 pt-5 md:px-8">
      <AuroraBackground />

      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" aria-label="Home">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/app" className="glass glass-edge inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.9rem] text-muted">
            <ArrowLeft size={16} weight="bold" /> Issues
          </Link>
          <GlassButton to="/report" variant="act" className="!min-h-[44px] !px-5 !text-[0.95rem]">
            <Plus size={17} weight="bold" /> Report
          </GlassButton>
        </div>
      </header>

      <div className="mx-auto mt-8 max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold text-ink">
              Ward intelligence
            </h1>
            <p className="mt-1.5 text-muted">Where problems cluster, and what's coming next.</p>
          </div>
          {data?.generatedByGemini && (
            <span className="glass glass-edge inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.82rem] text-teal-deep">
              <Sparkle size={14} weight="fill" /> Predictions by Gemini
            </span>
          )}
        </div>

        {error && (
          <div className="glass glass-edge mt-8 rounded-[20px] p-6 text-muted">
            Couldn't load the dashboard. Is the backend running?
          </div>
        )}

        {!data && !error && (
          <div className="mt-8 grid gap-5">
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <div key={i} className="glass glass-edge h-28 animate-pulse rounded-[22px]" />)}
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="glass glass-edge h-80 animate-pulse rounded-[22px] lg:col-span-2" />
              <div className="glass glass-edge h-80 animate-pulse rounded-[22px]" />
            </div>
          </div>
        )}

        {data && (
          <>
            {/* stat tiles */}
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile icon={FileText} label="Total reports" value={data.stats.total} tint="var(--color-teal)" />
              <StatTile icon={UsersThree} label="Citizens affected" value={data.stats.totalAffected} tint="var(--color-marigold-deep)" />
              <StatTile icon={SealCheck} label="Resolution rate" value={Math.round(data.stats.resolutionRate * 100)} suffix="%" tint="var(--color-status-resolved)" />
              <StatTile icon={Clock} label="Avg resolution" value={Math.round(data.stats.avgResolutionDays)} suffix=" days" tint="var(--color-status-progress)" />
            </div>

            {/* row: hotspots + resolution */}
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <Reveal className="lg:col-span-2">
                <section className="glass glass-edge h-full rounded-[24px] p-6">
                  <div className="flex items-center gap-2">
                    <Fire size={20} weight="fill" className="text-marigold-deep" />
                    <h2 className="font-display text-[1.3rem] font-medium text-ink">Predicted hotspots</h2>
                  </div>
                  <div className="mt-5 grid gap-4">
                    {data.hotspots.map((h, i) => {
                      const m = typeMeta(h.issueType);
                      const Icon = m.icon;
                      return (
                        <motion.div
                          key={h.area}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
                          className="flex gap-4 rounded-[18px] bg-nude-150/60 p-4"
                        >
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${m.color} 18%, transparent)`, color: m.color }}>
                            <Icon size={22} weight="fill" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-display text-[1.05rem] font-medium text-ink">{h.area}</span>
                              <span className="shrink-0 font-mono text-[11px] text-muted">{m.label}</span>
                            </div>
                            <p className="mt-1 text-[0.92rem] leading-snug text-text/80">{h.prediction}</p>
                            <div className="mt-2.5 flex items-center gap-3">
                              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-nude-300/50">
                                <motion.span
                                  className="absolute inset-y-0 left-0 rounded-full"
                                  style={{ background: m.color }}
                                  initial={{ width: 0 }}
                                  whileInView={{ width: `${(h.unresolved / Math.max(1, h.count)) * 100}%` }}
                                  viewport={{ once: true }}
                                  transition={{ duration: 0.8, ease: EASE, delay: 0.2 + i * 0.08 }}
                                />
                              </span>
                              <span className="shrink-0 font-mono text-[11px] text-muted">
                                {h.unresolved}/{h.count} unresolved · 90d
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              </Reveal>

              <Reveal delay={0.1}>
                <section className="glass glass-edge flex h-full flex-col rounded-[24px] p-6">
                  <h2 className="font-display text-[1.3rem] font-medium text-ink">Resolution</h2>
                  <div className="mt-5">
                    <Donut rate={data.stats.resolutionRate} resolved={data.stats.resolved} open={data.stats.open} />
                  </div>
                  {data.slowestDept && (
                    <div className="mt-auto pt-5">
                      <div className="rounded-[16px] bg-nude-150/60 p-4">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                          <Buildings size={13} weight="fill" /> Most backlogged
                        </div>
                        <div className="mt-1 text-[0.95rem] font-medium text-ink">{data.slowestDept.name}</div>
                        <div className="text-[0.85rem] text-muted">{data.slowestDept.openCount} open complaints</div>
                      </div>
                    </div>
                  )}
                </section>
              </Reveal>
            </div>

            {/* row: trend + by type */}
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <Reveal className="lg:col-span-2">
                <section className="glass glass-edge h-full rounded-[24px] p-6">
                  <h2 className="font-display text-[1.3rem] font-medium text-ink">Reports over 8 weeks</h2>
                  <div className="mt-5">
                    <TrendArea data={data.trend} />
                  </div>
                </section>
              </Reveal>

              <Reveal delay={0.1}>
                <section className="glass glass-edge h-full rounded-[24px] p-6">
                  <h2 className="font-display text-[1.3rem] font-medium text-ink">By type</h2>
                  <div className="mt-5">
                    <BarList items={data.byType} />
                  </div>
                </section>
              </Reveal>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  suffix,
  tint,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  suffix?: string;
  tint: string;
}) {
  return (
    <div className="glass glass-edge rounded-[22px] p-5">
      <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${tint} 16%, transparent)`, color: tint }}>
        <Icon size={18} weight="fill" />
      </span>
      <div className="mt-3 font-display text-[2rem] font-semibold leading-none text-ink">
        <CountUp to={value} />
        {suffix && <span className="text-[1.1rem] font-medium text-muted">{suffix}</span>}
      </div>
      <div className="mt-1.5 text-[0.9rem] text-muted">{label}</div>
    </div>
  );
}
