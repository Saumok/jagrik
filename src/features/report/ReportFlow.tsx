import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Camera,
  Microphone,
  MapPin,
  DownloadSimple,
  MapTrifold,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { GlassButton } from "@/components/GlassButton";
import { LiquidTabs, type TabItem } from "@/components/LiquidTabs";
import { WarRoom } from "./WarRoom";
import { VoiceCapture, type VoiceResult } from "./VoiceCapture";
import { TranscriptCard } from "./TranscriptCard";
import { streamReport, type ResultView, type ScoreEvent } from "@/lib/reportApi";
import { buildRun, playRun, SAMPLE_BENGALI } from "@/data/agentPipeline";
import { getIdentity, setHandle } from "@/lib/identity";
import type { AgentStep, Issue } from "@/data/types";

type Mode = "voice" | "photo";
type Phase = "intake" | "running" | "done";

const MODE_TABS: TabItem[] = [
  { id: "voice", label: "Speak", icon: <Microphone size={17} weight="fill" /> },
  { id: "photo", label: "Photo", icon: <Camera size={17} weight="fill" /> },
];

// map the local simulator's Issue → the same view the live API returns
function issueToView(i: Issue): ResultView {
  return {
    id: i.id,
    trackingId: i.trackingId,
    routedDepartment: i.routedDepartment,
    priority: i.priority,
    estimatedRepairCost: i.estimatedRepairCost,
    audioTranscript: i.audioTranscript,
    audioLang: i.audioLang ?? null,
    emailDispatched: false,
    mode: { gemini: false, email: false },
  };
}

export function ReportFlow() {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>("voice");
  const [voice, setVoice] = useState<VoiceResult | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("intake");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [result, setResult] = useState<ResultView | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [score, setScore] = useState<ScoreEvent | null>(null);
  const [name, setName] = useState(() => getIdentity().handle);
  const [voiceText, setVoiceText] = useState("");
  const [liveMode, setLiveMode] = useState(false); // default to safe Test mode
  const fileRef = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);

  // device location → reverse-geocoded area name (never blocks reporting; Docs/03 §3)
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      async (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCoords(c);
        try {
          const r = await fetch(`/api/geocode?lat=${c.lat}&lng=${c.lng}`);
          if (r.ok) {
            const d = (await r.json()) as { area: string | null };
            if (d.area) setArea(d.area);
          }
        } catch {
          /* keep coords-only */
        }
      },
      () => {},
      { timeout: 8000, enableHighAccuracy: true },
    );
    return () => abort.current?.abort();
  }, []);

  const namedOk = name.trim().length >= 2;
  const captureOk = mode === "voice" ? !!voice && !!voiceText.trim() : !!photoFile;
  const ready = namedOk && captureOk;

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoUrl(URL.createObjectURL(f));
  }

  function reRecord() {
    setVoice(null);
    setVoiceText("");
  }

  async function fileReport() {
    if (!ready) return;
    setHandle(name.trim()); // remember the citizen's chosen name
    setSteps([]);
    setResult(null);
    setScore(null);
    setPhase("running");
    abort.current = new AbortController();
    const me = getIdentity();

    try {
      await streamReport(
        {
          source: mode,
          transcript: mode === "voice" ? voiceText.trim() || voice?.transcript : undefined,
          audioBlob: mode === "voice" ? voice?.audioBlob : undefined,
          imageFile: mode === "photo" ? photoFile ?? undefined : undefined,
          area: area ?? undefined,
          lat: coords?.lat,
          lng: coords?.lng,
          reporterId: me.id,
          reporterHandle: name.trim(),
          liveMode,
        },
        { onSteps: setSteps, onResult: setResult, onScore: setScore },
        abort.current.signal,
      );
      setPhase("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      // backend unreachable → fall back to the local simulator so the demo never breaks
      console.warn("[report] live API unavailable, using local simulator:", err);
      const run = buildRun(
        mode === "voice"
          ? { source: "voice", transcript: voice?.transcript ?? SAMPLE_BENGALI, transcriptLang: "bn" }
          : { source: "photo" },
      );
      setResult(issueToView(run.result));
      try {
        await playRun(run.steps, setSteps, { instant: !!reduce, signal: abort.current.signal });
        setPhase("done");
      } catch {
        /* aborted */
      }
    }
  }

  return (
    <main className="min-h-[100dvh] px-4 pb-16 pt-5 md:px-8">
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" aria-label="Back to home">
          <Logo size={26} />
        </Link>
        <Link
          to="/"
          className="glass glass-edge inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.9rem] text-muted"
        >
          <ArrowLeft size={16} weight="bold" /> Exit
        </Link>
      </header>

      <div className="mx-auto mt-8 grid max-w-5xl gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        {/* LEFT: intake / result */}
        <div>
          <AnimatePresence mode="wait">
            {phase === "intake" && (
              <motion.div
                key="intake"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="font-display text-[2rem] font-semibold leading-tight text-ink">
                  Report a problem
                </h1>
                <p className="mt-1.5 max-w-[40ch] text-muted">
                  Show it or say it. Jagrik writes the complaint, finds the right office and
                  files it for you.
                </p>

                <div className="glass glass-edge mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.9rem] text-text">
                  <MapPin size={16} weight="fill" className="text-teal" />
                  {area ?? (coords ? "Locating your area…" : "Turn on location to pin this report")}
                  {area && <span className="text-faint">· located</span>}
                </div>

                {/* Your name — taken once, then remembered. No random handles. */}
                <div className="mt-5">
                  <label htmlFor="reporter-name" className="mb-1.5 block text-[0.85rem] font-medium text-muted">
                    Your name
                  </label>
                  <input
                    id="reporter-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ananya Sen"
                    autoComplete="name"
                    className="w-full rounded-[14px] border border-nude-200 bg-white/60 px-4 py-3 text-[1rem] text-ink placeholder:text-faint focus:border-teal/50 focus:outline-none"
                  />
                  <p className="mt-1 text-[0.78rem] text-faint">
                    Shown on your report and the community — so neighbours know who's acting.
                  </p>
                </div>

                <LiquidTabs
                  tabs={MODE_TABS}
                  active={mode === "voice" ? 0 : 1}
                  onChange={(i) => setMode(i === 0 ? "voice" : "photo")}
                  layoutKey="report-mode-pill"
                  className="mt-5"
                />

                <div className="mt-5">
                  {mode === "voice" ? (
                    <>
                      <VoiceCapture onCaptured={setVoice} captured={voice} />
                      {voice && (
                        <TranscriptCard
                          audioBlob={voice.audioBlob}
                          initial={voice.transcript}
                          onChange={setVoiceText}
                          onReRecord={reRecord}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={onPickPhoto}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="liquid glass glass-edge block w-full overflow-hidden rounded-[22px] p-0"
                      >
                        {photoUrl ? (
                          <img src={photoUrl} alt="Reported issue" className="aspect-[3/2] w-full object-cover" />
                        ) : (
                          <span className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-3 text-muted">
                            <span className="grid h-16 w-16 place-items-center rounded-full glass-teal text-teal-deep">
                              <Camera size={30} weight="fill" />
                            </span>
                            <span className="font-display text-[1.1rem] text-ink">Tap to capture</span>
                            <span className="text-[0.9rem]">or upload a photo of the issue</span>
                          </span>
                        )}
                      </button>
                    </>
                  )}
                </div>

                {/* Test vs Live: where the complaint email actually goes. */}
                <div className="mt-6 glass glass-edge rounded-[16px] p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[0.92rem] font-medium text-ink">
                        {liveMode ? "Live — send to the real authority" : "Test mode — send to your inbox"}
                      </div>
                      <div className="text-[0.8rem] text-muted">
                        {liveMode
                          ? "The complaint is emailed to the routed municipal department."
                          : "Safe to demo: routing is shown, but the email goes to your inbox."}
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={liveMode}
                      onClick={() => setLiveMode((v) => !v)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${liveMode ? "bg-teal" : "bg-nude-300"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${liveMode ? "translate-x-[22px]" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <GlassButton
                    variant="act"
                    onClick={fileReport}
                    className={ready ? "" : "pointer-events-none opacity-50"}
                  >
                    File this report
                  </GlassButton>
                </div>
              </motion.div>
            )}

            {phase !== "intake" && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="grid gap-5"
              >
                {result ? (
                  <ResultCard result={result} settled={phase === "done"} score={score} />
                ) : (
                  <div className="glass glass-edge rounded-[22px] p-6 text-muted">Filing your report…</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: the war-room */}
        <div className="lg:sticky lg:top-6">
          <AnimatePresence>
            {phase === "intake" ? (
              <motion.div
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-smoke grid place-items-center p-10 text-center"
              >
                <div className="max-w-[30ch]">
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-onink/60">
                    Action in motion
                  </span>
                  <p className="mt-3 text-onink/80">
                    When you file, watch Jagrik understand, route, draft and dispatch your
                    complaint — live, step by step.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="warroom"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <WarRoom steps={steps} running={phase === "running"} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

function ResultCard({ result, settled, score }: { result: ResultView; settled: boolean; score: ScoreEvent | null }) {
  const demo = !result.mode.gemini || !result.mode.email;
  return (
    <div className="glass glass-edge rounded-[22px] p-6">
      <div className="flex items-center gap-2 text-[var(--color-ok)]">
        <ShieldCheck size={20} weight="fill" />
        <span className="font-display font-medium text-ink">{settled ? "Filed and tracked" : "Filing…"}</span>
        {settled && demo && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-nude-150 px-2.5 py-1 text-[10px] font-medium text-muted">
            <Sparkle size={11} weight="fill" /> demo mode
          </span>
        )}
      </div>

      <AnimatePresence>
        {settled && score && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className={`mt-4 flex items-center gap-3 rounded-[16px] px-4 py-3 ${score.duplicate ? "bg-nude-150" : "glass-teal"}`}
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[1.05rem] font-semibold ${score.duplicate ? "bg-nude-300 text-muted" : "bg-white/40 text-teal-deep"}`}>
              {score.duplicate ? "0" : `+${score.points}`}
            </span>
            <div className="leading-tight">
              <p className="font-display text-[1rem] font-medium text-ink">
                {score.duplicate ? "Already reported — no extra points" : `Civic Score +${score.points}`}
              </p>
              <p className="text-[0.85rem] text-muted">
                {score.duplicate ? "You've flagged this spot before. " : `${score.citizen.score} pts · ${score.citizen.level} · `}
                <Link to="/leaderboard" className="text-teal-deep underline-offset-2 hover:underline">
                  see the leaderboard
                </Link>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 grid gap-3">
        <Row label="Tracking ID" value={result.trackingId} mono />
        <Row label="Routed to" value={result.routedDepartment} />
        <Row label="Priority" value={result.priority.toUpperCase()} />
        <Row
          label="Est. repair"
          value={
            result.estimatedRepairCost
              ? `₹${result.estimatedRepairCost.minInr.toLocaleString("en-IN")}–${result.estimatedRepairCost.maxInr.toLocaleString("en-IN")}`
              : "—"
          }
        />
      </div>

      {result.audioTranscript && (
        <div className="mt-4 rounded-[16px] bg-nude-150/70 px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Your words</div>
          <p lang={result.audioLang ?? undefined} className="mt-1 leading-relaxed text-ink">
            {result.audioTranscript}
          </p>
        </div>
      )}

      <AnimatePresence>
        {settled && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex flex-wrap gap-3"
          >
            {result.complaintPdfId && (
              <a
                href={`/api/pdf/${result.complaintPdfId}`}
                target="_blank"
                rel="noreferrer"
                className="glass glass-edge inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[0.95rem] text-teal-deep"
              >
                <DownloadSimple size={17} weight="bold" /> Download PDF
              </a>
            )}
            <Link
              to={`/issue/${result.id}`}
              className="glass glass-edge inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[0.95rem] text-text"
            >
              <MapTrifold size={17} weight="bold" /> View details
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-nude-200/60 pb-2.5 last:border-0">
      <span className="text-[0.9rem] text-muted">{label}</span>
      <span className={`text-right text-ink ${mono ? "font-mono text-[0.95rem]" : "font-medium"}`}>{value}</span>
    </div>
  );
}
