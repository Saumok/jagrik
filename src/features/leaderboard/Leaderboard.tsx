import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { Trophy, MedalMilitary, MapPinLine, Plus, Crown, Sparkle } from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { GlassButton } from "@/components/GlassButton";
import { LiquidTabs, type TabItem } from "@/components/LiquidTabs";
import { AuroraBackground } from "@/components/AuroraBackground";
import { BottomNav } from "@/components/BottomNav";
import { BackButton } from "@/components/BackButton";
import { getIdentity, initials } from "@/lib/identity";
import { fetchLeaderboard, LEVEL_META, type Leaderboard as Board } from "@/lib/scoreApi";

const EASE = [0.16, 1, 0.3, 1] as const;

const TABS: TabItem[] = [
  { id: "citizens", label: "Citizens", icon: <Trophy size={16} weight="fill" /> },
  { id: "areas", label: "Neighbourhoods", icon: <MapPinLine size={16} weight="fill" /> },
];

const RANK_TINT = ["#c9852f", "#9aa0a6", "#b87333"]; // gold / silver / bronze

export function Leaderboard() {
  const reduce = useReducedMotion();
  const me = useMemo(() => getIdentity(), []);
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    fetchLeaderboard(ac.signal)
      .then(setBoard)
      .catch((e) => e.name !== "AbortError" && setError(true));
    return () => ac.abort();
  }, []);

  const myRank = board?.citizens.find((c) => c.id === me.id);

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
          <Link to="/me" className="hidden rounded-full px-4 py-2 text-[0.95rem] text-muted hover:text-ink sm:inline-flex">
            Profile
          </Link>
          <GlassButton to="/report" variant="act" className="!min-h-[44px] !px-5 !text-[0.95rem]">
            <Plus size={17} weight="bold" /> Report
          </GlassButton>
        </div>
      </header>

      <div className="mx-auto mt-8 max-w-3xl">
        <h1 className="inline-flex items-center gap-2.5 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold text-ink">
          <Trophy size={30} weight="fill" className="text-marigold-deep" /> Civic leaderboard
        </h1>
        <p className="mt-1.5 text-muted">Points for reporting, fixing and helping. Resolution counts the most.</p>

        {/* how points work */}
        <div className="glass glass-edge mt-5 flex flex-wrap gap-x-5 gap-y-1.5 rounded-[18px] px-5 py-3 text-[0.85rem] text-muted">
          <Pts n={10} label="report an issue" />
          <Pts n={50} label="get it fixed" />
          <Pts n={5} label="post in community" />
          <Pts n={2} label="comment / help" />
        </div>

        <div className="mt-6">
          <LiquidTabs tabs={TABS} active={tab} onChange={setTab} fill />
        </div>

        {error && <div className="glass glass-edge mt-6 rounded-[20px] p-6 text-muted">Couldn't load the leaderboard. Is the backend running?</div>}

        {!board && !error && (
          <div className="mt-6 grid gap-3">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="glass glass-edge h-16 animate-pulse rounded-[18px]" />)}
          </div>
        )}

        {board && tab === 0 && (
          <>
            {board.citizens.length === 0 ? (
              <Empty />
            ) : (
              <ol className="mt-6 grid gap-3">
                {board.citizens.map((c, idx) => {
                  const mine = c.id === me.id;
                  const meta = LEVEL_META[c.level];
                  return (
                    <motion.li
                      key={c.id}
                      initial={reduce ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: EASE, delay: Math.min(idx * 0.04, 0.3) }}
                    >
                      <Link
                        to={mine ? "/me" : `/citizen/${c.id}`}
                        className={`glass glass-edge flex items-center gap-3.5 rounded-[18px] px-4 py-3.5 ${mine ? "ring-2 ring-teal/40" : ""}`}
                      >
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[0.95rem] font-bold"
                          style={
                            c.rank <= 3
                              ? { background: RANK_TINT[c.rank - 1], color: "#fff" }
                              : { background: "var(--color-nude-200)", color: "var(--color-muted)" }
                          }
                        >
                          {c.rank <= 3 ? <Crown size={16} weight="fill" /> : c.rank}
                        </span>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-[0.85rem] font-semibold text-white" style={{ background: meta?.tint ?? "var(--color-teal)" }}>
                          {initials(c.handle)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-ink">{c.handle}{mine && <span className="text-muted"> (you)</span>}</span>
                          </div>
                          <div className="text-[12px] text-muted">{c.level}{c.area ? ` · ${c.area}` : ""}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-[1.15rem] font-semibold text-ink">{c.score}</div>
                          <div className="text-[11px] text-faint">pts</div>
                        </div>
                      </Link>
                    </motion.li>
                  );
                })}
              </ol>
            )}

            {myRank == null && board.citizens.length > 0 && (
              <div className="glass glass-edge mt-4 rounded-[18px] px-4 py-3.5 text-center text-[0.9rem] text-muted">
                You're not on the board yet — <Link to="/report" className="font-medium text-teal-deep">file a report</Link> to get on it.
              </div>
            )}
          </>
        )}

        {board && tab === 1 && (
          board.areas.length === 0 ? (
            <Empty />
          ) : (
            <ol className="mt-6 grid gap-3">
              {board.areas.map((a, idx) => {
                const max = board.areas[0].score || 1;
                return (
                  <motion.li
                    key={a.area}
                    initial={reduce ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE, delay: Math.min(idx * 0.04, 0.3) }}
                    className="glass glass-edge relative overflow-hidden rounded-[18px] px-4 py-3.5"
                  >
                    <motion.span
                      className="absolute inset-y-0 left-0 bg-teal/10"
                      initial={{ width: 0 }}
                      animate={{ width: `${(a.score / max) * 100}%` }}
                      transition={{ duration: 0.7, ease: EASE }}
                    />
                    <div className="relative flex items-center gap-3.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-nude-200 font-display text-[0.95rem] font-bold text-muted">
                        {idx + 1}
                      </span>
                      <MedalMilitary size={20} weight="fill" className="shrink-0 text-marigold-deep" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-ink">{a.area}</div>
                        <div className="text-[12px] text-muted">{a.citizens} active {a.citizens === 1 ? "citizen" : "citizens"}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-[1.15rem] font-semibold text-ink">{a.score}</div>
                        <div className="text-[11px] text-faint">pts</div>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          )
        )}
      </div>
    </div>
  );
}

function Pts({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-[0.8rem] font-semibold text-teal-deep">+{n}</span> {label}
    </span>
  );
}

function Empty() {
  return (
    <div className="glass glass-edge mt-6 rounded-[20px] p-8 text-center">
      <Sparkle size={26} weight="fill" className="mx-auto text-marigold" />
      <p className="mt-2 font-display text-[1.2rem] text-ink">No champions yet</p>
      <p className="mt-1 text-muted">Be the first — file a report and claim the top spot.</p>
      <GlassButton to="/report" variant="act" className="mt-4 !min-h-[44px]">
        <Plus size={17} weight="bold" /> File a report
      </GlassButton>
    </div>
  );
}
