import { motion, useReducedMotion } from "motion/react";

// Living luminous backdrop: a few large, soft, blurred colour blobs that drift
// slowly behind everything. GPU-friendly (transform/opacity only, no canvas).
// Sits on top of the static body gradient; collapses to static under reduced motion.
const BLOBS = [
  { c: "rgba(15,110,102,0.30)", size: 46, top: "-8%", left: "4%", dur: 26, path: [0, 40, -20, 0] },
  { c: "rgba(232,146,60,0.26)", size: 40, top: "8%", left: "70%", dur: 32, path: [0, -34, 24, 0] },
  { c: "rgba(220,198,179,0.55)", size: 52, top: "62%", left: "58%", dur: 30, path: [0, 28, -30, 0] },
  { c: "rgba(18,138,127,0.18)", size: 38, top: "70%", left: "-6%", dur: 36, path: [0, 30, 10, 0] },
];

export function AuroraBackground() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {BLOBS.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            top: b.top,
            left: b.left,
            width: `${b.size}vmax`,
            height: `${b.size}vmax`,
            background: `radial-gradient(circle at 50% 50%, ${b.c}, transparent 68%)`,
            filter: "blur(8px)",
          }}
          animate={
            reduce
              ? undefined
              : {
                  x: b.path.map((v) => v * 4),
                  y: b.path.map((v) => v * -2.4),
                  scale: [1, 1.08, 0.96, 1],
                }
          }
          transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
