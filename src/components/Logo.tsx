// Simple geometric brand mark (a single, intentional glyph — allowed by the
// taste skill). A location pin whose centre is an open eye: "aware citizen"
// (Jagruk + Nagrik). Teal, the locked accent.
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M16 3.2c-5.5 0-9.7 4.1-9.7 9.4 0 6.3 7.8 14.6 9.1 15.9.3.3.9.3 1.2 0 1.3-1.3 9.1-9.6 9.1-15.9 0-5.3-4.2-9.4-9.7-9.4Z"
          fill="var(--color-teal)"
        />
        <circle cx="16" cy="12.4" r="5.1" fill="var(--color-nude-50)" />
        <circle cx="16" cy="12.4" r="2.2" fill="var(--color-teal-deep)" />
      </svg>
      <span className="font-display font-semibold text-[1.35rem] tracking-tight text-ink">
        Jagrik
      </span>
    </span>
  );
}
