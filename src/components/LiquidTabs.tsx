import { motion } from "motion/react";
import type { ReactNode } from "react";

// Liquid-glass segmented tabs. Adapted from a Magic (21st.dev) base into our
// nude/teal token system: a frosted track with a glass pill that MORPHS between
// tabs via a shared-element layout animation (layoutId + spring). The core
// navigation control of the hero and report intake.

export interface TabItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface Props {
  tabs: TabItem[];
  active: number;
  onChange: (i: number) => void;
  /** when set, the active tab shows a CSS-animated ring over this many ms */
  autoMs?: number;
  paused?: boolean;
  variant?: "glass" | "smoke";
  /** stretch full-width and distribute tabs equally on mobile (fits narrow screens) */
  fill?: boolean;
  className?: string;
  layoutKey?: string;
}

export function LiquidTabs({
  tabs,
  active,
  onChange,
  autoMs,
  paused,
  variant = "glass",
  fill = false,
  className = "",
  layoutKey = "liquid-tab-pill",
}: Props) {
  const smoke = variant === "smoke";

  function onKey(e: React.KeyboardEvent, i: number) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onChange((i + 1) % tabs.length);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onChange((i - 1 + tabs.length) % tabs.length);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Showcase"
      className={`relative flex items-center gap-1 rounded-full p-1.5
        ${fill ? "w-full sm:w-auto" : "inline-flex"}
        ${smoke ? "glass-smoke" : "glass glass-edge"} ${className}`}
    >
      {tabs.map((tab, i) => {
        const isActive = i === active;
        const activeText = smoke ? "text-onink" : "text-teal-deep";
        const idleText = smoke
          ? "text-onink/55 hover:text-onink/80"
          : "text-muted hover:text-ink";
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full
              px-3 py-2.5 text-[0.85rem] font-medium transition-colors duration-300 outline-none
              sm:gap-2 sm:px-4 sm:text-[0.95rem]
              ${fill ? "min-w-0 flex-1 sm:flex-none" : ""}
              ${isActive ? activeText : idleText}`}
          >
            {isActive && (
              <motion.span
                layoutId={layoutKey}
                className={`absolute inset-0 rounded-full ${smoke ? "bg-[rgba(232,146,60,0.22)]" : "glass-teal glass-edge"}`}
                transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
              >
                {/* CSS-driven auto-advance ring (no per-frame React renders) */}
                {autoMs !== undefined && (
                  <span className="absolute inset-x-3 bottom-1 h-[2px] overflow-hidden rounded-full bg-teal/15">
                    <span
                      className="block h-full w-full origin-left rounded-full bg-teal"
                      style={{
                        animation: `progress-grow ${autoMs}ms linear forwards`,
                        animationPlayState: paused ? "paused" : "running",
                      }}
                    />
                  </span>
                )}
              </motion.span>
            )}
            <span className="relative z-10 flex items-center">{tab.icon}</span>
            <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
