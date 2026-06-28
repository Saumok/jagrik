import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "@phosphor-icons/react";
import { getIdentity } from "@/lib/identity";
import { fetchCitizen } from "@/lib/scoreApi";

// Small nav chip showing the signed-in citizen's Civic Score. Links to /me.
// Silent when there's nothing to show yet (score 0 / backend down) so it never
// clutters the nav for a brand-new visitor.
export function ScoreChip({ className = "" }: { className?: string }) {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    const me = getIdentity();
    fetchCitizen(me.id, ac.signal)
      .then((c) => setScore(c?.score ?? null))
      .catch(() => {});
    return () => ac.abort();
  }, []);

  if (score == null || score <= 0) return null;

  return (
    <Link
      to="/me"
      className={`glass glass-edge inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.9rem] font-medium text-teal-deep ${className}`}
      aria-label="Your Civic Score"
    >
      <Trophy size={15} weight="fill" /> {score}
    </Link>
  );
}
