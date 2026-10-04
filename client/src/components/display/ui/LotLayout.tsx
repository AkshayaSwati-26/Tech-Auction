import type { ReactNode } from "react";
import { motion } from "framer-motion";
import Backdrop from "./Backdrop";
import Pill from "./Pill";
import TechIcon from "./TechIcon";
import { getMotif } from "../../../lib/motifs";
import { EASE, DURATION, STAGGER } from "../../../lib/motion";
import { formatRupees } from "../../../lib/format";
import type { BidMode, Lot } from "../../../lib/types";

const pad = (n: number) => String(n).padStart(2, "0");
const U = (n: number) => `calc(var(--u) * ${n})`;

function Stat({ label, children, note, gold = false }: { label: string; children: ReactNode; note?: string; gold?: boolean }) {
  return (
    <div className="d-card" style={{ flex: 1, padding: `${U(1.2)} ${U(1.5)}` }}>
      <div className="d-label">{label}</div>
      <div className={`d-mid ${gold ? "d-gold" : "d-strong d-num"}`} style={{ marginTop: U(0.3) }}>
        {children}
      </div>
      {note && (
        <div className="d-label" style={{ marginTop: U(0.2), textTransform: "none", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
          {note}
        </div>
      )}
    </div>
  );
}

/** Largest title size (in stage units) at which the longest word still fits the text column. */
function fitName(name: string) {
  const tier = name.length <= 14 ? 5.7 : name.length <= 24 ? 4.6 : 3.8;
  const longestWord = Math.max(...name.split(/\s+/).map((w) => w.length));
  return Math.min(tier, 47 / (longestWord * 0.98));
}

/** Reveal and Live share one two-column composition: text on the left, the motif card on the right. */
export default function LotLayout({
  lot,
  mode,
  winners,
  bidMode,
  uniform,
}: {
  lot: Lot;
  mode: "reveal" | "live";
  winners: number;
  bidMode?: BidMode;
  uniform: boolean;
}) {
  const live = mode === "live";
  const nameSize = fitName(lot.name);
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: "30%", filter: "blur(8px)" },
    animate: { opacity: 1, y: "0%", filter: "blur(0px)" },
    transition: { delay, duration: DURATION, ease: EASE },
  });
  const slideUp = (i: number) => ({
    initial: { opacity: 0, y: "35%" },
    animate: { opacity: 1, y: "0%" },
    transition: { delay: 0.55 + i * STAGGER, duration: DURATION, ease: EASE },
  });
  const tracking = live && bidMode === "live_tracking" && !!lot.current_bid && !!lot.current_leading_team;

  return (
    <div className="d-screen grid items-center" style={{ gridTemplateColumns: "1.2fr 0.8fr", columnGap: U(6) }}>
      <Backdrop x={76} y={46} planet={6} ribbon={!live} />
      {!live && <span className="d-sweep" />}

      <div style={{ minWidth: 0 }}>
        {live && (
          <motion.div style={{ marginBottom: U(2) }} {...rise(0)}>
            <Pill dot>Auction live</Pill>
          </motion.div>
        )}
        <motion.p className="d-label" {...rise(0.1)}>
          {lot.category || getMotif(lot.motif).label}
        </motion.p>
        <motion.h1 className="d-hero" style={{ fontSize: U(nameSize), marginTop: U(1.2) }} {...rise(0.2)}>
          {lot.name}
        </motion.h1>
        <motion.span
          className="d-underline"
          style={{ marginTop: U(1.3), width: U(18), transformOrigin: "left" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.8, ease: EASE }}
        />

        {!live && lot.description && (
          <motion.p
            className="d-mid"
            style={{ marginTop: U(1.8), maxWidth: U(40), display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            {...rise(0.35)}
          >
            {lot.description}
          </motion.p>
        )}
        {!live && lot.limitation && (
          <motion.p className="d-label" style={{ marginTop: U(1.1), maxWidth: U(44) }} {...rise(0.42)}>
            <span style={{ color: "var(--violet-bright)" }}>Limitation:</span> {lot.limitation}
          </motion.p>
        )}

        <div className="flex" style={{ gap: U(1.2), marginTop: U(3), maxWidth: U(46) }}>
          <motion.div className="flex flex-1" {...slideUp(0)}>
            <Stat label="Starting bid" gold note={`rises in ${formatRupees(lot.min_increment)} steps`}>
              {formatRupees(lot.starting_bid)}
            </Stat>
          </motion.div>
          {tracking ? (
            <motion.div className="flex" style={{ flex: 2 }} {...slideUp(1)}>
              <Stat label={`Current leader · ${lot.current_leading_team}`} gold>
                {formatRupees(lot.current_bid ?? 0)}
              </Stat>
            </motion.div>
          ) : (
            <>
              <motion.div className="flex flex-1" {...slideUp(1)}>
                <Stat label="Slots" note="open">
                  {lot.quantity_remaining} of {lot.quantity_total}
                </Stat>
              </motion.div>
              <motion.div className="flex flex-1" {...slideUp(2)}>
                <Stat label="Winners" note={uniform ? "pay the same price" : "pay their own bid"}>
                  Top {winners}
                </Stat>
              </motion.div>
            </>
          )}
        </div>

        {live && (
          <motion.div className="flex" style={{ gap: U(1.2), marginTop: U(1.2), maxWidth: U(46) }} {...slideUp(3)}>
            {Array.from({ length: Math.min(winners, 3) }, (_, i) => (
              <div
                key={i}
                className="d-label flex items-center"
                style={{ flex: 1, gap: U(0.8), padding: `${U(0.9)} ${U(1.5)}`, border: "1px solid rgba(255,255,255,0.12)", borderRadius: U(1.25), whiteSpace: "nowrap" }}
              >
                <span className="d-num" style={{ color: "var(--text)" }}>
                  {pad(i + 1)}
                </span>
                Awaiting result
              </div>
            ))}
          </motion.div>
        )}
      </div>

      <motion.div
        className="justify-self-center"
        style={{ width: "100%", maxWidth: U(29) }}
        initial={{ opacity: 0, filter: "blur(10px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ delay: 0.25, duration: 0.8, ease: EASE }}
      >
        <div className="d-float relative">
          {["tl", "tr", "bl", "br"].map((c) => (
            <span key={c} className={`d-bracket d-bracket--${c}`} />
          ))}
          <div className={`d-card d-motif ${live ? "d-card--active" : ""}`} style={{ aspectRatio: "1" }}>
            <div className={`d-motif__glow ${live ? "d-breathe" : ""}`} />
            <svg viewBox="0 0 200 200" className={`d-hud ${live ? "d-hud--fast" : ""}`} fill="none">
              <circle className="d-hud__ring" cx="100" cy="100" r="92" stroke="rgba(196,170,255,0.4)" strokeWidth="0.6" strokeDasharray="2 5" />
              <g className="d-hud__arc">
                <path d="M100 14 A86 86 0 0 1 186 100" stroke="#E8C277" strokeWidth="0.7" strokeLinecap="round" opacity="0.8" />
                <circle cx="186" cy="100" r="2.2" fill="#E8C277" />
              </g>
            </svg>
            {!live && <span className="d-scan" />}
            <div className="d-tech-icon">
              <TechIcon iconKey={lot.motif} assemble={!live} />
            </div>
            <div className="d-motif__sheen" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
