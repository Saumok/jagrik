import { useState } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  Stack,
  UsersThree,
  Trophy,
  Plus,
  DotsThreeOutline,
  ChartLineUp,
  FirstAid,
  UserCircle,
  House,
} from "@phosphor-icons/react";

// Mobile-only bottom navigation. The desktop header links are `hidden sm:*`, so
// on phones this liquid-glass tab bar is the primary way to reach every space.
// The centre Report action is raised and accented; a "More" sheet holds the
// lower-frequency destinations (Dashboard, Help, Profile, Home).
interface Tab {
  to: string;
  label: string;
  Icon: PhosphorIcon;
  primary?: boolean;
}

const TABS: Tab[] = [
  { to: "/app", label: "Issues", Icon: Stack },
  { to: "/community", label: "Community", Icon: UsersThree },
  { to: "/report", label: "Report", Icon: Plus, primary: true },
  { to: "/leaderboard", label: "Ranks", Icon: Trophy },
];

const MORE: { to: string; label: string; Icon: PhosphorIcon }[] = [
  { to: "/dashboard", label: "Dashboard", Icon: ChartLineUp },
  { to: "/resources", label: "Help & resources", Icon: FirstAid },
  { to: "/me", label: "Your profile", Icon: UserCircle },
  { to: "/", label: "Home", Icon: House },
];

export function BottomNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sm:hidden" aria-label="Primary">
      {/* expandable "More" sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="glass glass-edge fixed inset-x-3 z-50 grid grid-cols-2 gap-2 rounded-[22px] p-3 shadow-lg"
              style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}
            >
              {MORE.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-[58px] items-center gap-2.5 rounded-[16px] px-3.5 text-[0.92rem] font-medium ${
                      isActive ? "glass-teal text-teal-deep" : "bg-nude-150/70 text-text"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={20} weight={isActive ? "fill" : "regular"} /> {label}
                    </>
                  )}
                </NavLink>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* the bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="glass glass-edge mx-3 mb-3 flex items-stretch justify-around rounded-[22px] px-1.5 py-1.5 shadow-lg">
          {TABS.map(({ to, label, Icon, primary }) =>
            primary ? (
              <NavLink key={to} to={to} aria-label={label} className="-mt-5 flex flex-col items-center justify-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-teal text-white shadow-md shadow-teal/30 ring-4 ring-nude-100">
                  <Icon size={24} weight="bold" />
                </span>
              </NavLink>
            ) : (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex min-h-[48px] min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-[16px] px-1.5 py-1 text-[10.5px] font-medium transition-colors ${
                    isActive ? "text-teal-deep" : "text-muted"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={21} weight={isActive ? "fill" : "regular"} />
                    {label}
                  </>
                )}
              </NavLink>
            ),
          )}

          {/* More */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="More"
            aria-expanded={open}
            className={`flex min-h-[48px] min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-[16px] px-1.5 py-1 text-[10.5px] font-medium transition-colors ${
              open ? "text-teal-deep" : "text-muted"
            }`}
          >
            <DotsThreeOutline size={21} weight={open ? "fill" : "regular"} />
            More
          </button>
        </div>
      </div>
    </nav>
  );
}
