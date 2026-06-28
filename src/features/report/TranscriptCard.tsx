import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CircleNotch, PencilSimple, Translate, ArrowClockwise, Check } from "@phosphor-icons/react";
import { transcribeAudio, translateText, type Lang } from "@/lib/reportApi";

// Pre-file transcript verification. After recording we transcribe the audio so
// the citizen can read it back and fix any mistake, and offer a one-tap view in
// another language. The ORIGINAL (editable) text is what gets filed; the
// translations are for the citizen's reference only.

const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "bn", label: "বাংলা" },
];
const LANG_LABEL: Record<Lang, string> = { en: "English", hi: "Hindi", bn: "Bengali" };

interface Props {
  audioBlob?: Blob;
  initial?: string;
  onChange: (text: string) => void;
  onReRecord: () => void;
}

export function TranscriptCard({ audioBlob, initial, onChange, onReRecord }: Props) {
  const [text, setText] = useState(initial ?? "");
  const [lang, setLang] = useState<Lang | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<"orig" | Lang>("orig");
  const [translated, setTranslated] = useState<Partial<Record<Lang, string>>>({});
  const [translating, setTranslating] = useState<Lang | null>(null);
  const cache = useRef<Partial<Record<Lang, string>>>({});

  // Transcribe the recorded audio once (authoritative). Sample path uses `initial`.
  useEffect(() => {
    const ac = new AbortController();
    if (audioBlob) {
      setLoading(true);
      transcribeAudio(audioBlob, ac.signal)
        .then((r) => {
          const t = r.transcript || initial || "";
          setText(t);
          setLang(r.lang);
          onChange(t);
        })
        .catch(() => {
          setText(initial ?? "");
          onChange(initial ?? "");
        })
        .finally(() => setLoading(false));
    } else {
      setText(initial ?? "");
      onChange(initial ?? "");
    }
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  function edit(v: string) {
    setText(v);
    onChange(v);
    cache.current = {}; // original changed → invalidate translations
    setTranslated({});
    setView("orig");
  }

  async function showLang(code: Lang) {
    if (code === lang) {
      setView("orig");
      return;
    }
    if (cache.current[code]) {
      setTranslated((m) => ({ ...m, [code]: cache.current[code] }));
      setView(code);
      return;
    }
    setTranslating(code);
    try {
      const out = await translateText(text, code);
      cache.current[code] = out;
      setTranslated((m) => ({ ...m, [code]: out }));
      setView(code);
    } catch {
      /* keep original on failure */
    } finally {
      setTranslating(null);
    }
  }

  if (loading) {
    return (
      <div className="glass glass-edge mt-4 flex items-center gap-2.5 rounded-[18px] px-5 py-4 text-muted">
        <CircleNotch size={18} weight="bold" className="animate-spin text-teal" />
        Transcribing what you said…
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass glass-edge mt-4 rounded-[18px] px-5 py-4"
    >
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-faint">
          Check your words {lang && <span className="text-teal-deep">· heard {LANG_LABEL[lang]}</span>}
        </div>
        <button onClick={onReRecord} className="inline-flex items-center gap-1 text-[0.8rem] text-muted hover:text-ink">
          <ArrowClockwise size={13} weight="bold" /> Re-record
        </button>
      </div>

      {/* original (editable) or a translated preview */}
      {view === "orig" ? (
        editing ? (
          <textarea
            value={text}
            onChange={(e) => edit(e.target.value)}
            rows={3}
            autoFocus
            className="mt-2 w-full resize-none rounded-[14px] bg-nude-150/70 px-4 py-3 text-[1.05rem] leading-relaxed text-ink focus:outline-none"
          />
        ) : (
          <p lang={lang ?? undefined} className="mt-2 text-[1.1rem] leading-relaxed text-ink">
            {text || <span className="text-faint">No words detected — tap Re-record or type below.</span>}
          </p>
        )
      ) : (
        <div className="mt-2">
          <p lang={view} className="text-[1.1rem] leading-relaxed text-ink">
            {translated[view as Lang]}
          </p>
          <p className="mt-1.5 text-[0.78rem] text-faint">Translation for your reference — your original words are filed.</p>
        </div>
      )}

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => {
            setView("orig");
            setEditing((e) => !e);
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.82rem] font-medium ${
            editing ? "glass-teal text-teal-deep" : "bg-nude-200 text-muted hover:text-ink"
          }`}
        >
          {editing ? <Check size={13} weight="bold" /> : <PencilSimple size={13} weight="bold" />}
          {editing ? "Done" : "Edit"}
        </button>

        <span className="mx-1 inline-flex items-center gap-1 text-[0.78rem] text-faint">
          <Translate size={14} weight="bold" /> View in
        </span>

        {/* Original chip */}
        <button
          onClick={() => setView("orig")}
          className={`rounded-full px-3 py-1.5 text-[0.82rem] font-medium ${
            view === "orig" ? "glass-teal text-teal-deep" : "bg-nude-200 text-muted hover:text-ink"
          }`}
        >
          Original
        </button>

        {LANGS.filter((l) => l.code !== lang).map((l) => (
          <button
            key={l.code}
            onClick={() => showLang(l.code)}
            disabled={!text.trim() || translating === l.code}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[0.82rem] font-medium disabled:opacity-50 ${
              view === l.code ? "glass-teal text-teal-deep" : "bg-nude-200 text-muted hover:text-ink"
            }`}
          >
            {translating === l.code && <CircleNotch size={12} weight="bold" className="animate-spin" />}
            {l.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
