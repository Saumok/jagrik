import { useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { SHOWCASE } from "./showcasePanels";

// The hero's tilted liquid-glass pane (Docs/04 §4.2). A real pane of glass
// catching light, whose contents MORPH between the four capabilities as the
// liquid tabs change. Pointer parallax + entrance sheen. Transform/opacity only.
const EASE = [0.16, 1, 0.3, 1] as const;

export function HeroPanel({ active }: { active: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 110, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 110, damping: 18, mass: 0.6 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-2, -14]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [-6, 8]);
  const captionX = useTransform(sx, [-0.5, 0.5], [-12, 12]);
  const badgeX = useTransform(sx, [-0.5, 0.5], [-18, 18]);
  const badgeY = useTransform(sy, [-0.5, 0.5], [-10, 10]);

  function onMove(e: React.PointerEvent) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() {
    px.set(0);
    py.set(0);
  }

  const Active = SHOWCASE[active];

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative mx-auto h-[27rem] w-full max-w-[34rem] md:h-[31rem]"
      style={{ perspective: 1200 }}
    >
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: 90 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.7, ease: EASE }}
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.div
          style={{
            rotateY: reduce ? -8 : rotateY,
            rotateX: reduce ? 0 : rotateX,
            rotateZ: -2.5,
            transformStyle: "preserve-3d",
          }}
          className="relative h-full w-full"
        >
          {/* the glass pane */}
          <div className="liquid glass glass-edge absolute inset-x-2 inset-y-3 rounded-[28px]" />

          {/* one-time entrance sheen */}
          {!reduce && (
            <motion.div
              aria-hidden="true"
              initial={{ x: "-120%", opacity: 0 }}
              animate={{ x: "120%", opacity: [0, 0.7, 0] }}
              transition={{ delay: 1.0, duration: 1.1, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-y-3 left-2 right-2 rounded-[28px]"
              style={{
                background:
                  "linear-gradient(115deg, transparent 38%, rgba(255,255,255,.55) 50%, transparent 62%)",
              }}
            />
          )}

          {/* persistent floating live badge (top-left), parallax */}
          <motion.div
            style={{ x: badgeX, y: badgeY }}
            className="glass glass-edge absolute left-3 top-5 z-20 flex items-center gap-2 rounded-full px-3 py-1.5"
          >
            <span className="dot-live h-1.5 w-1.5 rounded-full bg-[var(--color-ok)]" />
            <span className="font-mono text-[10px] tracking-[0.12em] text-text/80">Ward 110 · live</span>
          </motion.div>

          {/* the morphing showcase card, centred */}
          <div className="absolute inset-0 grid place-items-center px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={Active.id}
                id={`panel-${Active.id}`}
                role="tabpanel"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.94, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.96, filter: "blur(6px)" }}
                transition={{ duration: 0.42, ease: EASE }}
                style={{ x: reduce ? 0 : captionX }}
              >
                <Active.render />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* caption that updates per tab (bottom) */}
          <div className="absolute inset-x-0 bottom-5 z-20 flex justify-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={Active.caption}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32 }}
                className="glass glass-edge rounded-full px-4 py-1.5 text-[12px] font-medium text-text"
              >
                {Active.caption}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
