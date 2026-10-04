import { motion } from "framer-motion";
import Backdrop from "./ui/Backdrop";
import GlassOrb from "./ui/GlassOrb";
import { EASE, DURATION } from "../../lib/motion";
import type { Lot } from "../../lib/types";

const pad = (n: number) => String(n).padStart(2, "0");
const U = (n: number) => `calc(var(--u) * ${n})`;

export default function ReadyScreen({
  lot,
  lotNumber,
  totalLots,
  closedCount,
}: {
  lot: Lot | null;
  lotNumber: number;
  totalLots: number;
  closedCount: number;
}) {
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: "30%", filter: "blur(8px)" },
    animate: { opacity: 1, y: "0%", filter: "blur(0px)" },
    transition: { delay, duration: DURATION, ease: EASE },
  });

  return (
    <div className="d-screen flex flex-col justify-center">
      <Backdrop x={74} y={46} planet={7} ribbon />

      <div style={{ maxWidth: U(52) }}>
        <motion.p className="d-label" {...rise(0.1)}>
          {lot ? "Next up" : "Auction"}
        </motion.p>
        {lot ? (
          <>
            <motion.p className="d-hero d-num" style={{ fontSize: U(7.6), marginTop: U(1.2) }} {...rise(0.2)}>
              {pad(lotNumber)}
              <span style={{ opacity: 0.45 }}> / {pad(totalLots)}</span>
            </motion.p>
            <motion.h1 className="d-hero" style={{ fontSize: U(2), marginTop: U(1.6) }} {...rise(0.3)}>
              {lot.name}
            </motion.h1>
          </>
        ) : (
          <motion.h1 className="d-hero" style={{ fontSize: U(3.8), marginTop: U(1.2) }} {...rise(0.2)}>
            All lots closed
          </motion.h1>
        )}
      </div>

      <motion.div
        className="absolute"
        style={{ right: U(10), top: "50%", width: U(26), marginTop: U(-13) }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
      >
        <GlassOrb />
      </motion.div>

      <div className="d-progress absolute" style={{ left: U(6), right: U(6), bottom: U(5) }}>
        {Array.from({ length: totalLots }, (_, i) => (
          <span
            key={i}
            className={`d-progress__seg ${i < closedCount ? "d-progress__seg--done" : ""} ${lot && i === lotNumber - 1 ? "d-progress__seg--current" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
