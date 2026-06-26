import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { Stack, ListChecks, SealCheck, UsersThree, Plus, ArrowRight } from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { GlassButton } from "@/components/GlassButton";
import { LiquidTabs, type TabItem } from "@/components/LiquidTabs";
import { AuroraBackground } from "@/components/AuroraBackground";
import {
  fetchIssues,
  photoSrc,
  STATUS_LABEL,
  STATUS_VAR,
  ISSUE_LABEL,
  type StoredIssue,
  type IssueStatus,
} from "@/lib/issuesApi";

const FILTERS: TabItem[] = [
  { id: "all", label: "All", icon: <Stack size={16} weight="fill" /> },
  { id: "new", label: "New", icon: <Plus size={16} weight="bold" /> },
  { id: "progress", label: "Active", icon: <ListChecks size={16} weight="fill" /> },
  { id: "resolved", label: "Resolved", icon: <SealCheck size={16} weight="fill" /> },
];

function inFilter(s: IssueStatus, f: number): boolean {
  if (f === 0) return true;
  if (f === 1) return s === "reported";
  if (f === 2) return s === "acknowledged" || s === "in_progress";
  return s === "resolved";
}

export function IssuesView() {
  const reduce = useReducedMotion();
  const [issues, setIssues] = useState<StoredIssue[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    fetchIssues(ac.signal)
      .then(setIssues)
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => ac.abort();
  }, []);

  const shown = issues?.filter((i) => inFilter(i.status, filter)) ?? [];

  return (
    <div className="relative min-h-[100dvh] px-4 pb-20 pt-5 md:px-8">
      <AuroraBackground />

      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" aria-label="Home">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="hidden rounded-full px-4 py-2 text-[0.95rem] text-muted hover:text-ink sm:inline-flex">
            Dashboard
          </Link>
          <GlassButton to="/report" variant="act" className="!min-h-[44px] !px-5 !text-[0.95rem]">
            <Plus size={17} weight="bold" /> Report
          </GlassButton>
        </div>
      </header>

      <div className="mx-auto mt-8 max-w-6xl">
        <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold text-ink">
          Live issues · Ward 110
        </h1>
        <p className="mt-1.5 text-muted">Every report, routed and tracked to resolution.</p>

        <div className="mt-6">
          <LiquidTabs tabs={FILTERS} active={filter} onChange={setFilter} fill className="sm:inline-flex" />
        </div>

        {/* a Google Map renders here once VITE_MAPS_API_KEY is set (Docs/07 §4) */}

        {error && (
          <div className="glass glass-edge mt-8 rounded-[20px] p-6 text-muted">
            Couldn't load issues. Is the backend running? Try refreshing.
          </div>
        )}

        {!issues && !error && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="glass glass-edge h-64 animate-pulse rounded-[22px]" />
            ))}
          </div>
        )}

        {issues && shown.length === 0 && (
          <div className="glass glass-edge mt-8 rounded-[20px] p-8 text-center">
            <p className="font-display text-[1.2rem] text-ink">No issues here yet</p>
            <p className="mt-1 text-muted">Be the first — tap Report.</p>
          </div>
        )}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((i, idx) => (
            <motion.div
              key={i.id}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: Math.min(idx * 0.04, 0.3) }}
            >
              <Link
                to={`/issue/${i.id}`}
                className="liquid glass glass-edge group block overflow-hidden rounded-[22px]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-nude-200">
                  {photoSrc(i) && (
                    <img
                      src={photoSrc(i)}
                      alt={ISSUE_LABEL[i.issueType] ?? i.issueType}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <span
                    className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1
                               text-[11px] font-medium text-white backdrop-blur-sm"
                    style={{ background: STATUS_VAR[i.status] }}
                  >
                    {STATUS_LABEL[i.status]}
                  </span>
                  {i.affectedCount > 1 && (
                    <span className="glass glass-edge absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-ink">
                      <UsersThree size={13} weight="fill" /> {i.affectedCount}
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[1.1rem] font-medium text-ink">
                      {ISSUE_LABEL[i.issueType] ?? i.issueType}
                    </span>
                    <span className="font-mono text-[11px] text-faint">sev {i.severity}/5</span>
                  </div>
                  <p className="mt-1 text-[0.92rem] text-muted">{i.area}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-nude-200/60 pt-3">
                    <span className="font-mono text-[11px] text-muted">{i.trackingId}</span>
                    <span className="inline-flex items-center gap-1 text-[0.9rem] font-medium text-teal-deep">
                      View <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
