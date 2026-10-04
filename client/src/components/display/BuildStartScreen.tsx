import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Backdrop from "./ui/Backdrop";
import BoldIcon from "./ui/BoldIcon";
import TechIcon from "./ui/TechIcon";
import { EASE } from "../../lib/motion";
import type { BuildState, Lot } from "../../lib/types";

const U = (n: number) => `calc(var(--u) * ${n})`;
const R = 90;
const CIRC = 2 * Math.PI * R;
const STEP_MS = 800;

/** Server-corrected clock: every display counts from the same stored start time. */
function useServerNow(serverTime: string) {
  const offset = useMemo(() => Date.parse(serverTime) - Date.now(), [serverTime]);
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset), 100);
    return () => clearInterval(id);
  }, [offset]);
  return now;
}

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

function SideCards({ lots, side }: { lots: Lot[]; side: "left" | "right" }) {
  return (
    <>
      {lots.map((lot, i) => (
        <motion.div
          key={lot.id}
          className={`d-side-card d-side-card--${side}`}
          style={{ top: U(17 + i * 11), [side]: U(4.5 + (i % 2) * 3.2) }}
          initial={{ opacity: 0, x: side === "left" ? "-40%" : "40%" }}
          animate={{ opacity: 1, x: "0%" }}
          transition={{ delay: 2.1 + i * 0.14, duration: 0.9, ease: EASE }}
        >
          <div className="d-float" style={{ animationDelay: `${-i * 1.9}s` }}>
            <div className="d-side-card__body">
              {["tl", "tr", "bl", "br"].map((c) => (
                <span key={c} className={`d-tick d-tick--${c}`} />
              ))}
              <div className="d-side-card__icon">
                <BoldIcon iconKey={lot.motif} />
              </div>
              <p>{lot.name}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </>
  );
}

/** The launch moment after the auction. The timer is rendered only from the server's start time. */
export default function BuildStartScreen({ build, lots, eventName, serverTime }: { build: BuildState; lots: Lot[]; eventName: string; serverTime: string }) {
  const now = useServerNow(serverTime);
  const total = build.prepMinutes * 60_000;
  const start = build.startedAt ? Date.parse(build.startedAt) : null;
  const lead = start === null ? 0 : start - now;
  const counting = start !== null && lead > 0;
  const running = start !== null && lead <= 0;
  const elapsed = running ? now - start! : 0;
  const remaining = Math.max(0, total - elapsed);
  const fraction = remaining / total;
  const digit = counting ? Math.min(3, Math.ceil(lead / STEP_MS)) : null;
  const begin = running && elapsed < 900;
  const tone = !running ? "#E8C277" : remaining === 0 ? "#FB7185" : remaining <= 120_000 ? "#F59E0B" : "#E8C277";
  const nodeAngle = (fraction * 360 - 90) * (Math.PI / 180);

  const won = lots.filter((l) => l.quantity_remaining < l.quantity_total);
  const shown = (won.length >= 2 ? won : lots).slice(0, 6);
  const headline = running ? "Build. Solve." : build.text.headline;
  const hairline = { width: U(8) };

  return (
    <div className="d-screen" style={{ padding: 0 }}>
      <motion.div className="absolute inset-0" style={{ zIndex: -1 }} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, ease: EASE }}>
        <Backdrop x={50} y={52} planet={5} />
      </motion.div>

      <SideCards lots={shown.filter((_, i) => i % 2 === 0)} side="left" />
      <SideCards lots={shown.filter((_, i) => i % 2 === 1)} side="right" />

      <header className="absolute inset-x-0 text-center" style={{ top: U(3.6) }}>
        <motion.p
          className="d-label"
          style={{ letterSpacing: "0.3em", marginRight: "-0.3em" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7, ease: EASE }}
        >
          {build.text.kicker}
        </motion.p>
        <div style={{ overflow: "hidden", padding: "0.1em 0", marginTop: U(0.7) }}>
          <AnimatePresence mode="wait">
            <motion.h1
              key={headline}
              className="d-hero"
              style={{ fontSize: `clamp(20px, ${U(3.5)}, 170px)`, letterSpacing: "0.12em", marginRight: "-0.12em" }}
              initial={{ y: "110%", filter: "blur(10px)" }}
              animate={{ y: "0%", filter: "blur(0px)" }}
              exit={{ y: "-110%", opacity: 0 }}
              transition={{ delay: running ? 0 : 0.5, duration: 0.8, ease: EASE }}
            >
              {headline}
            </motion.h1>
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-center" style={{ marginTop: U(0.9), gap: U(1.6) }}>
          <motion.span className="d-hairline" style={{ ...hairline, transformOrigin: "right" }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1, duration: 0.8, ease: EASE }} />
          <motion.p className="d-mid" style={{ fontSize: U(1.2) }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.8, ease: EASE }}>
            {build.text.tagline}
          </motion.p>
          <motion.span
            className="d-hairline"
            style={{ ...hairline, transformOrigin: "left", background: "linear-gradient(90deg, rgba(167, 139, 250, 0.7), transparent)" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1, duration: 0.8, ease: EASE }}
          />
        </div>
        <motion.p className="d-label" style={{ marginTop: U(0.9) }} initial={{ opacity: 0, y: "40%" }} animate={{ opacity: 1, y: "0%" }} transition={{ delay: 1.4, duration: 0.8, ease: EASE }}>
          {build.text.message}
        </motion.p>
      </header>

      <div className="d-launch">
        <div className="d-launch__hero">
          <TechIcon iconKey="build-ring" assemble disc={false} light={false} sway={0.17} startAt={1.5} />
        </div>

        <motion.div className="d-timer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.9, ease: EASE }}>
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle cx={100} cy={100} r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2.5} />
            <circle
              cx={100}
              cy={100}
              r={R}
              fill="none"
              stroke={tone}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - fraction)}
              transform="rotate(-90 100 100)"
              opacity={running ? 1 : 0.45}
              style={{ transition: "stroke-dashoffset 0.2s linear, stroke 0.6s" }}
            />
            {/* Twist marker at the midpoint. */}
            <circle cx={100} cy={100 + R} r={4} fill="#A78BFA" stroke="#0b0620" strokeWidth={1.5} />
            {running && remaining > 0 && <circle cx={100 + R * Math.cos(nodeAngle)} cy={100 + R * Math.sin(nodeAngle)} r={3.2} fill="#fff3cf" />}
          </svg>

          <div className="d-timer__center">
            <AnimatePresence mode="popLayout">
              {digit !== null ? (
                <motion.span
                  key={`d${digit}`}
                  className="d-timer__count"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.4 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  {digit}
                </motion.span>
              ) : (
                <motion.span key="time" className="d-timer__time" style={{ color: running ? tone : undefined, opacity: running ? 1 : 0.55 }} initial={{ opacity: 0 }} animate={{ opacity: running ? 1 : 0.55 }}>
                  {mmss(remaining)}
                </motion.span>
              )}
            </AnimatePresence>
            <span className="d-timer__label">{begin ? "Begin" : running ? (remaining === 0 ? "Time is up" : "Remaining") : counting ? "Get ready" : "To prepare"}</span>
          </div>
          {begin && <span className="d-timer__pulse" />}
        </motion.div>
      </div>

      <motion.div className="d-build-chips" initial={{ opacity: 0, y: "40%" }} animate={{ opacity: 1, y: "0%" }} transition={{ delay: 2.3, duration: 0.8, ease: EASE }}>
        <span className="d-pill">{build.prepMinutes} min to prepare</span>
        <span className="d-pill">Use only what you acquired</span>
        <span className="d-pill">Pitch: {build.pitchSeconds} seconds each</span>
      </motion.div>

      <span className="d-podium" style={{ bottom: U(1.9) }} />
      <p className="d-telemetry" style={{ bottom: U(0.8) }}>
        {eventName} <i /> Build phase <i /> {running ? (remaining === 0 ? "Time is up" : "Timer running") : counting ? "Starting" : "Waiting to start"}
      </p>
    </div>
  );
}
