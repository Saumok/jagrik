import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  Trophy,
  SealCheck,
  Megaphone,
  ChatCircleText,
  CalendarCheck,
  PencilSimple,
  Check,
  Medal,
  Plus,
  ArrowLeft,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { GlassButton } from "@/components/GlassButton";
import { AuroraBackground } from "@/components/AuroraBackground";
import { BottomNav } from "@/components/BottomNav";
import { BackButton } from "@/components/BackButton";
import { getIdentity, setHandle, initials } from "@/lib/identity";
import { fetchCitizen, levelProgress, LEVEL_META, type CitizenView } from "@/lib/scoreApi";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Profile() {
  const reduce = useReducedMotion();
  const { id: routeId } = useParams();
  const me = useMemo(() => getIdentity(), []);
  const id = routeId ?? me.id;
  const isMe = id === me.id;

  const [citizen, setCitizen] = useState<CitizenView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [handle, setLocalHandle] = useState(me.handle);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetchCitizen(id, ac.signal)
      .then((c) => {
        setCitizen(c);
        if (c && isMe) setLocalHandle(c.handle);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    return () => ac.abort();
  }, [id, isMe]);

  function saveHandle() {
    const next = setHandle(handle);
    setLocalHandle(next.handle);
    setEditing(false);
  }

  // a brand-new "me" with no record yet → synthesise an empty view
  const view: CitizenView | null =
    citizen ??
    (isMe && loaded
      ? {
          id: me.id, handle: me.handle, score: 0, reports: 0, resolved: 0, posts: 0, comments: 0, events: 0,
          createdAt: Date.now(), updatedAt: Date.now(), level: "Citizen", nextLevelAt: 50, badges: [],
        }
      : null);

  const meta = view ? LEVEL_META[view.level] : undefined;
  const progress = view ? levelProgress(view.score, view.nextLevelAt) : 0;
  const displayHandle = isMe ? handle : view?.handle ?? "";

  return (
    <div className="relative min-h-[100dvh] px-4 pb-28 pt-5 md:px-8 md:pb-20">
      <AuroraBackground />
      <BottomNav />

      <header className="mx-auto flex max-w-2xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BackButton fallback="/leaderboard" />
          <Link to="/" aria-label="Home" className="hidden sm:inline-flex">
            <Logo />
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/leaderboard" className="hidden rounded-full px-4 py-2 text-[0.95rem] text-muted hover:text-ink sm:inline-flex">
            Leaderboard
          </Link>
          <GlassButton to="/report" variant="act" className="!min-h-[44px] !px-5 !text-[0.95rem]">
            <Plus size={17} weight="bold" /> Report
          </GlassButton>
        </div>
      </header>

      {!loaded && (
        <div className="mx-auto mt-10 max-w-2xl">
          <div className="glass glass-edge h-56 animate-pulse rounded-[26px]" />
        </div>
      )}

      {loaded && !view && (
        <div className="mx-auto mt-10 max-w-2xl">
          <Link to="/leaderboard" className="inline-flex items-center gap-2 text-muted hover:text-ink">
            <ArrowLeft size={16} weight="bold" /> Back to leaderboard
          </Link>
          <div className="glass glass-edge mt-4 rounded-[24px] p-10 text-center">
            <p className="font-display text-[1.3rem] text-ink">Citizen not found</p>
            <p className="mt-1 text-muted">They haven't earned any Civic Score yet.</p>
          </div>
        </div>
      )}

      {view && (
        <div className="mx-auto mt-8 max-w-2xl">
          {!isMe && (
            <Link to="/leaderboard" className="mb-4 inline-flex items-center gap-2 text-muted hover:text-ink">
              <ArrowLeft size={16} weight="bold" /> Leaderboard
            </Link>
          )}

          {/* hero card */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="glass glass-edge overflow-hidden rounded-[26px] p-6 md:p-8"
          >
            <div className="flex items-center gap-4">
              <span
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full font-display text-[1.4rem] font-bold text-white"
                style={{ background: meta?.tint ?? "var(--color-teal)" }}
              >
                {initials(displayHandle)}
              </span>
              <div className="min-w-0 flex-1">
                {isMe && editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={handle}
                      onChange={(e) => setLocalHandle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveHandle()}
                      className="min-w-0 flex-1 rounded-[12px] bg-nude-150/70 px-3 py-1.5 font-display text-[1.3rem] text-ink focus:outline-none"
                      autoFocus
                    />
                    <button onClick={saveHandle} className="grid h-9 w-9 shrink-0 place-items-center rounded-full glass-teal text-teal-deep">
                      <Check size={18} weight="bold" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="truncate font-display text-[1.5rem] font-semibold text-ink">{displayHandle}</h1>
                    {isMe && (
                      <button onClick={() => setEditing(true)} className="shrink-0 text-faint hover:text-teal-deep" aria-label="Edit name">
                        <PencilSimple size={16} weight="bold" />
                      </button>
                    )}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8rem] font-medium" style={{ background: `color-mix(in srgb, ${meta?.tint ?? "var(--color-teal)"} 16%, transparent)`, color: meta?.tint ?? "var(--color-teal-deep)" }}>
                    <Trophy size={12} weight="fill" /> {view.level}
                  </span>
                  {view.area && <span className="text-[0.85rem] text-muted">{view.area}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-[2rem] font-semibold leading-none text-ink">{view.score}</div>
                <div className="text-[11px] text-faint">Civic Score</div>
              </div>
            </div>

            {/* progress to next level */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-[0.82rem] text-muted">
                <span>{meta?.tag ?? ""}</span>
                <span>{view.nextLevelAt != null ? `${view.nextLevelAt - view.score} pts to next level` : "Top level reached"}</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-nude-200">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: meta?.tint ?? "var(--color-teal)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.8, ease: EASE }}
                />
              </div>
            </div>
          </motion.div>

          {/* stat grid */}
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Stat icon={<Plus size={18} weight="bold" />} value={view.reports} label="Reports" />
            <Stat icon={<SealCheck size={18} weight="fill" />} value={view.resolved} label="Resolved" />
            <Stat icon={<CalendarCheck size={18} weight="fill" />} value={view.events ?? 0} label="Events" />
            <Stat icon={<Megaphone size={18} weight="fill" />} value={view.posts} label="Posts" />
            <Stat icon={<ChatCircleText size={18} weight="fill" />} value={view.comments} label="Comments" />
          </div>

          {/* badges */}
          <div className="glass glass-edge mt-4 rounded-[22px] p-6">
            <h2 className="inline-flex items-center gap-2 font-display text-[1.15rem] font-medium text-ink">
              <Medal size={20} weight="fill" className="text-marigold-deep" /> Badges
            </h2>
            {view.badges.length === 0 ? (
              <p className="mt-2 text-[0.92rem] text-muted">
                {isMe ? "No badges yet. File your first report to earn one." : "No badges earned yet."}
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {view.badges.map((b) => (
                  <motion.span
                    key={b.id}
                    initial={reduce ? false : { opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="glass-teal inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.88rem] font-medium text-teal-deep"
                  >
                    <Medal size={14} weight="fill" /> {b.label}
                  </motion.span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="glass glass-edge rounded-[18px] p-4 text-center">
      <span className="mx-auto grid h-9 w-9 place-items-center rounded-full glass-teal text-teal-deep">{icon}</span>
      <div className="mt-2 font-display text-[1.5rem] font-semibold text-ink">{value}</div>
      <div className="text-[0.8rem] text-muted">{label}</div>
    </div>
  );
}
