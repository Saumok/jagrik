import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";

// Goes to the previous page in history; if the user landed here directly (no
// history to pop), falls back to `fallback` (default: the issues list).
export function BackButton({ fallback = "/app", className = "", label = "Back" }: { fallback?: string; className?: string; label?: string }) {
  const navigate = useNavigate();

  function goBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      className={`glass glass-edge inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.9rem] text-muted transition-colors hover:text-ink ${className}`}
    >
      <ArrowLeft size={16} weight="bold" /> {label}
    </button>
  );
}
