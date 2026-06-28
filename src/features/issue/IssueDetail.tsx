import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Buildings,
  DownloadSimple,
  MapPin,
  UsersThree,
  Warning,
  CheckCircle,
  XCircle,
  Camera,
  SealCheck,
  CircleNotch,
  Trash,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { AuroraBackground } from "@/components/AuroraBackground";
import { BackButton } from "@/components/BackButton";
import {
  fetchIssue,
  deleteIssue,
  photoSrc,
  STATUS_LABEL,
  STATUS_VAR,
  ISSUE_LABEL,
  type StoredIssue,
  type IssueStatus,
} from "@/lib/issuesApi";
import { verifyFix, type Verdict } from "@/lib/verifyApi";
import { getIdentity } from "@/lib/identity";

const FLOW: IssueStatus[] = ["reported", "acknowledged", "in_progress", "resolved"];

export function IssueDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<StoredIssue | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    setIssue(null);
    setError(false);
    fetchIssue(id, ac.signal)
      .then(setIssue)
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => ac.abort();
  }, [id]);

  return (
    <div className="relative min-h-[100dvh] px-4 pb-20 pt-5 md:px-8">
      <AuroraBackground />

      <header className="mx-auto flex max-w-4xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BackButton />
          <Link to="/" aria-label="Home" className="hidden sm:inline-flex">
            <Logo size={26} />
          </Link>
        </div>
        <Link
          to="/app"
          className="glass glass-edge inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.9rem] text-muted"
        >
          All issues
        </Link>
      </header>

      {error && (
        <div className="glass glass-edge mx-auto mt-10 max-w-4xl rounded-[20px] p-6 text-muted">
          Couldn't find that issue. <Link to="/app" className="text-teal-deep underline">Back to all issues</Link>.
        </div>
      )}

      {!issue && !error && (
        <div className="mx-auto mt-8 max-w-4xl">
          <div className="glass glass-edge h-72 animate-pulse rounded-[24px]" />
        </div>
      )}

      {issue && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-8 grid max-w-4xl gap-6 lg:grid-cols-[1.1fr_1fr]"
        >
          {/* left: photo + classification */}
          <div className="grid gap-6">
            <div className="glass glass-edge overflow-hidden rounded-[24px]">
              {photoSrc(issue) && (
                <img src={photoSrc(issue)} alt={ISSUE_LABEL[issue.issueType]} className="aspect-[16/10] w-full object-cover" />
              )}
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-[1.6rem] font-semibold text-ink">
                    {ISSUE_LABEL[issue.issueType] ?? issue.issueType}
                  </h1>
                  <span
                    className="ml-auto rounded-full px-3 py-1 text-[12px] font-medium text-white"
                    style={{ background: STATUS_VAR[issue.status] }}
                  >
                    {STATUS_LABEL[issue.status]}
                  </span>
                </div>
                <p className="mt-2 inline-flex items-center gap-1.5 text-muted">
                  <MapPin size={16} weight="fill" className="text-teal" /> {issue.area}
                  {issue.ward ? ` · Ward ${issue.ward}` : ""}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip>Severity {issue.severity}/5</Chip>
                  {issue.estimatedRepairCost && (
                    <Chip>
                      ₹{issue.estimatedRepairCost.minInr.toLocaleString("en-IN")}–
                      {issue.estimatedRepairCost.maxInr.toLocaleString("en-IN")}
                    </Chip>
                  )}
                  {issue.affectedCount > 1 && (
                    <Chip>
                      <UsersThree size={13} weight="fill" className="text-teal" /> {issue.affectedCount} affected
                    </Chip>
                  )}
                </div>

                {issue.riskContext && (
                  <p className="mt-4 inline-flex items-start gap-2 rounded-[14px] bg-[rgba(232,146,60,0.14)] px-3.5 py-2.5 text-[0.92rem] text-text">
                    <Warning size={17} weight="fill" className="mt-0.5 shrink-0 text-marigold-deep" />
                    {issue.riskContext}
                  </p>
                )}
              </div>
            </div>

            {issue.audioTranscript && (
              <div className="glass glass-edge rounded-[20px] px-5 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                  Reported in {issue.audioLang === "bn" ? "Bengali" : issue.audioLang === "hi" ? "Hindi" : "the citizen's words"}
                </div>
                <p lang={issue.audioLang ?? undefined} className="mt-1 text-[1.1rem] leading-relaxed text-ink">
                  {issue.audioTranscript}
                </p>
              </div>
            )}
          </div>

          {/* right: authority + timeline */}
          <div className="grid gap-6">
            <div className="glass glass-edge glass-teal rounded-[22px] p-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white/55 text-teal-deep">
                  <Buildings size={22} weight="fill" />
                </span>
                <div>
                  <div className="font-display text-[1.05rem] font-medium text-ink">{issue.routedDepartment}</div>
                  <div className="text-[12px] text-text/70">Priority {issue.priority.toUpperCase()} · {issue.trackingId}</div>
                </div>
              </div>
              {issue.complaintPdfId ? (
                <a
                  href={`/api/pdf/${issue.complaintPdfId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="glass glass-edge mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[0.92rem] text-teal-deep"
                >
                  <DownloadSimple size={16} weight="bold" /> Download the filed complaint
                </a>
              ) : (
                <p className="mt-3 text-[0.85rem] text-text/60">Complaint PDF available on live-filed reports.</p>
              )}
            </div>

            <VerifyCard issue={issue} onUpdate={setIssue} />

            <div className="glass glass-edge rounded-[22px] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Status timeline</div>
              <ol className="mt-4 grid gap-0">
                {FLOW.map((step, i) => {
                  const entry = issue.statusHistory.find((h) => h.status === step);
                  const reached = !!entry;
                  const isLast = i === FLOW.length - 1;
                  return (
                    <li key={step} className="relative flex gap-3 pb-6 last:pb-0">
                      {!isLast && (
                        <span
                          className="absolute left-[11px] top-6 bottom-0 w-px"
                          style={{ background: reached ? STATUS_VAR[step] : "var(--color-nude-300)" }}
                        />
                      )}
                      <span
                        className="z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full"
                        style={{ background: reached ? STATUS_VAR[step] : "var(--color-nude-200)" }}
                      >
                        {reached && <CheckCircle size={16} weight="fill" className="text-white" />}
                      </span>
                      <div className={reached ? "" : "opacity-45"}>
                        <div className="font-medium text-ink">{STATUS_LABEL[step]}</div>
                        {entry && (
                          <div className="text-[12px] text-muted">
                            {new Date(entry.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · by {entry.by}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {issue.reporterId && issue.reporterId === getIdentity().id && (
              <DeleteReport id={issue.id} onDeleted={() => navigate("/app")} />
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function DeleteReport({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setErr(null);
    try {
      await deleteIssue(id, getIdentity().id);
      onDeleted();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="glass glass-edge rounded-[22px] p-5">
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 text-[0.92rem] font-medium text-danger hover:opacity-80"
        >
          <Trash size={17} weight="bold" /> Delete this report
        </button>
      ) : (
        <div>
          <p className="text-[0.95rem] text-ink">Delete this report permanently? This can't be undone.</p>
          <div className="mt-3 flex items-center gap-2.5">
            <button
              onClick={remove}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-danger px-4 py-2.5 text-[0.9rem] font-medium text-white disabled:opacity-60"
            >
              {busy ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : <Trash size={16} weight="bold" />}
              {busy ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="glass glass-edge rounded-full px-4 py-2.5 text-[0.9rem] text-text"
            >
              Cancel
            </button>
          </div>
          {err && <p className="mt-2 text-[0.85rem] text-danger">{err}</p>}
        </div>
      )}
    </div>
  );
}

function VerifyCard({ issue, onUpdate }: { issue: StoredIssue; onUpdate: (i: StoredIssue) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(issue.verification ?? null);
  const [err, setErr] = useState(false);

  const resolved = issue.status === "resolved";

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setErr(false);
    try {
      const { verdict: v, issue: updated } = await verifyFix(issue.id, f);
      setVerdict(v);
      onUpdate(updated);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  // already resolved by AI → show the verified badge
  if (resolved && issue.verification) {
    return (
      <div className="glass glass-edge rounded-[22px] p-5">
        <div className="flex items-center gap-2 text-[var(--color-ok)]">
          <SealCheck size={20} weight="fill" />
          <span className="font-display font-medium text-ink">Verified fixed by AI</span>
        </div>
        {typeof issue.verification.confidence === "number" && (
          <span className="mt-1 inline-block text-[0.8rem] text-muted">
            {Math.round(issue.verification.confidence * 100)}% confidence
          </span>
        )}
        <p className="mt-2 text-[0.92rem] text-muted">{issue.verification.reason}</p>
        {(issue.photoUrl || issue.photoId) && (issue.afterPhotoId || issue.afterPhotoUrl) ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <figure>
              <img src={photoSrc(issue)} alt="Before the fix" className="aspect-[4/3] w-full rounded-[14px] object-cover" />
              <figcaption className="mt-1 text-center text-[11px] uppercase tracking-[0.14em] text-faint">Before</figcaption>
            </figure>
            <figure>
              <img
                src={issue.afterPhotoId ? `/api/photo/${issue.afterPhotoId}` : issue.afterPhotoUrl}
                alt="After the fix"
                className="aspect-[4/3] w-full rounded-[14px] object-cover"
              />
              <figcaption className="mt-1 text-center text-[11px] uppercase tracking-[0.14em] text-faint">After</figcaption>
            </figure>
          </div>
        ) : (
          (issue.afterPhotoId || issue.afterPhotoUrl) && (
            <img
              src={issue.afterPhotoId ? `/api/photo/${issue.afterPhotoId}` : issue.afterPhotoUrl}
              alt="After the fix"
              className="mt-3 aspect-[16/10] w-full rounded-[14px] object-cover"
            />
          )
        )}
      </div>
    );
  }

  return (
    <div className="glass glass-edge rounded-[22px] p-5">
      <div className="font-display text-[1.05rem] font-medium text-ink">Is this fixed?</div>
      <p className="mt-1 text-[0.92rem] text-muted">
        Upload an after-photo. Gemini compares it with the original and confirms the fix.
      </p>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />

      <AnimatePresence mode="wait">
        {busy ? (
          <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 flex items-center gap-2 text-muted">
            <CircleNotch size={18} weight="bold" className="animate-spin text-teal" /> Analysing before &amp; after…
          </motion.div>
        ) : verdict && !verdict.fixed ? (
          <motion.div key="no" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <div className="flex items-start gap-2 rounded-[14px] bg-[rgba(229,72,77,0.12)] px-3.5 py-2.5 text-[0.9rem] text-text">
              <XCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-danger" />
              <span>{verdict.reason || "The issue still looks present."}</span>
            </div>
            <button onClick={() => fileRef.current?.click()} className="glass glass-edge mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[0.92rem] text-text">
              <Camera size={16} weight="bold" /> Try another photo
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="cta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => fileRef.current?.click()}
            className="liquid glass glass-edge glass-teal mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[0.95rem] text-teal-deep"
          >
            <Camera size={17} weight="fill" /> Mark as fixed
          </motion.button>
        )}
      </AnimatePresence>

      {err && <p className="mt-3 text-[0.85rem] text-danger">Couldn't verify just now. Please try again.</p>}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="glass glass-edge inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.85rem] text-text">
      {children}
    </span>
  );
}
