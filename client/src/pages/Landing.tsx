import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Gavel, MonitorPlay } from "lucide-react";
import { EASE } from "../lib/motion";

export default function Landing() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-midnight px-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 55% at 50% 40%, rgba(27,15,61,0.55), transparent 70%)" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative z-10 text-center"
      >
        <p className="text-xs uppercase tracking-[0.4em] text-slate-muted">Bid. Build. Solve.</p>
        <h1 className="mt-5 text-3xl font-bold uppercase tracking-[0.06em] text-chrome-gradient sm:text-5xl" style={{ fontFamily: '"Michroma", "Sora", sans-serif' }}>Tech Auction</h1>
        <p className="mx-auto mt-5 max-w-md text-sm text-slate-muted">Live technology auction control system. Choose a screen to open.</p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link to="/display" className="flex min-h-[44px] items-center gap-2 rounded-xl bg-paper px-6 py-3 text-sm font-semibold text-midnight transition hover:brightness-95">
            <MonitorPlay size={18} />
            Open Audience Display
          </Link>
          <Link to="/admin" className="btn-violet flex min-h-[44px] items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold">
            <Gavel size={18} />
            Open Organizer Console
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
