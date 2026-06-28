import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Microphone, Waveform, ArrowClockwise } from "@phosphor-icons/react";
import { SAMPLE_BENGALI } from "@/data/agentPipeline";

// Real voice intake. Records actual audio via MediaRecorder and, where the
// browser supports it, transcribes live via the Web Speech API — so the citizen
// truly speaks, no typing, no English (Docs/03 §2). The audio blob is sent to
// the backend Classifier (Gemini multimodal) for the authoritative read.

export interface VoiceResult {
  transcript?: string;
  audioBlob?: Blob;
}

interface Props {
  onCaptured: (r: VoiceResult) => void;
  captured: VoiceResult | null;
}

type Phase = "idle" | "recording" | "denied";

// loose handle to the vendor-prefixed Web Speech API
function getSpeechRecognition(): any {
  const w = window as unknown as Record<string, unknown>;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceCapture({ onCaptured, captured }: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recogRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const stopTimer = useRef<number | null>(null);

  async function start() {
    if (captured) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      transcriptRef.current = "";

      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" })
          : undefined;
        onCaptured({ audioBlob: blob, transcript: transcriptRef.current || undefined });
        setPhase("idle");
      };
      rec.start();

      // live transcription (best-effort; Chrome/Edge)
      const SR = getSpeechRecognition();
      if (SR) {
        const r = new SR();
        r.lang = "bn-IN";
        r.continuous = true;
        r.interimResults = true;
        r.onresult = (ev: any) => {
          let t = "";
          for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
          transcriptRef.current = t.trim();
        };
        r.onerror = () => {};
        recogRef.current = r;
        try {
          r.start();
        } catch {
          /* already started */
        }
      }

      setPhase("recording");
      stopTimer.current = window.setTimeout(stop, 10000); // safety auto-stop
    } catch {
      setPhase("denied");
    }
  }

  function stop() {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    recogRef.current?.stop?.();
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
  }

  const recording = phase === "recording";

  if (phase === "denied") {
    return (
      <div className="glass glass-edge rounded-[22px] p-6">
        <p className="text-ink font-medium">Couldn't reach the microphone.</p>
        <p className="mt-1 text-[0.95rem] text-muted">
          Check the browser's mic permission, or use a sample to see the flow.
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setPhase("idle")}
            className="glass glass-edge inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.9rem] text-text"
          >
            <ArrowClockwise size={16} weight="bold" /> Try again
          </button>
          <button
            onClick={() => {
              setPhase("idle"); // leave the denied view so the transcript preview shows
              onCaptured({ transcript: SAMPLE_BENGALI });
            }}
            className="glass glass-edge glass-teal inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.9rem] text-teal-deep"
          >
            Use a sample
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <button
        type="button"
        onClick={recording ? stop : start}
        aria-label={recording ? "Stop recording" : "Tap to speak your report"}
        className="liquid glass glass-edge flex items-center gap-5 rounded-[22px] p-7 text-left"
        disabled={!!captured}
      >
        <span
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-full
            ${recording ? "bg-marigold text-white" : "glass-teal text-teal-deep"}`}
        >
          {recording ? <Waveform size={30} weight="bold" /> : <Microphone size={30} weight="fill" />}
        </span>
        <span className="grid gap-1">
          <span className="font-display text-[1.15rem] font-medium text-ink">
            {recording ? "Listening… tap to stop" : captured ? "Got it" : "Tap and speak"}
          </span>
          <span className="text-[0.95rem] text-muted">
            {recording ? "Speak naturally in Bengali, Hindi or English" : "No typing, no English needed"}
          </span>
        </span>

        {recording && (
          <span className="ml-auto flex h-9 items-end gap-1 pr-1" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 rounded-full bg-marigold"
                initial={{ height: 6 }}
                animate={reduce ? { height: 18 } : { height: [8, 30, 12, 26, 8] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
              />
            ))}
          </span>
        )}
      </button>
    </div>
  );
}
