import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "act";

const base =
  "liquid inline-flex items-center justify-center gap-2 font-display font-medium " +
  "min-h-[52px] px-7 rounded-full glass-edge select-none whitespace-nowrap " +
  "transition-shadow text-[1.0625rem]";

const variants: Record<Variant, string> = {
  // Teal glass — the locked accent, primary action.
  primary: "glass glass-teal text-teal-deep",
  // Plain light glass — quiet secondary.
  secondary: "glass text-text",
  // Marigold glass — reserved for the "report / act now" moment.
  act: "glass glass-marigold text-marigold-deep",
};

interface Props {
  children: ReactNode;
  to?: string;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  type?: "button" | "submit";
}

export function GlassButton({
  children,
  to,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
}: Props) {
  const cls = `${base} ${variants[variant]} ${className}`;
  const inner = (
    <motion.span
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
      className="contents"
    >
      {children}
    </motion.span>
  );

  if (to) {
    return (
      <Link to={to} className={cls} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick}>
      {inner}
    </button>
  );
}
