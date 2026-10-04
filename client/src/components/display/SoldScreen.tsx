import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Backdrop from "./ui/Backdrop";
import CountUp from "../shared/CountUp";
import { EASE, POP_SPRING } from "../../lib/motion";
import { formatRupees } from "../../lib/format";
import type { Lot, LotResultView, WinnerView } from "../../lib/types";

const U = (n: number) => `calc(var(--u) * ${n})`;
const STAGGER = 0.12;
const FIRST_CARD_AT = 0.45;

/** Eight gold dust motes per card (at most 24 on screen). */
const DUST = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 + 0.3;
  return { dx: Math.cos(angle) * 7.5, dy: Math.sin(angle) * 6 };
});

function WinnerCard({ winner, index }: { winner: WinnerView; index: number }) {
  const delay = FIRST_CARD_AT + index * STAGGER;
  return (
    <motion.div
      className="relative"
      style={{ width: U(21), transformOrigin: "50% 100%" }}
      initial={{ opacity: 0, y: "30%", rotateX: 40 }}
      animate={{ opacity: 1, y: "0%", rotateX: 0 }}
      transition={{ ...POP_SPRING, delay }}
    >
      <span className="d-win-pulse" style={{ animationDelay: `${delay + 0.35}s` }} />
      {DUST.map((d, i) => (
        <span key={i} className="d-spark" style={{ "--dx": d.dx, "--dy": d.dy, "--delay": `${delay + 0.35}s` } as CSSProperties} />
      ))}
      <div className="d-float" style={{ animationDelay: `${-index * 2.3}s` }}>
        <div className="d-win-card">
          {["tl", "tr", "bl", "br"].map((c) => (
            <span key={c} className={`d-tick d-tick--${c}`} />
          ))}
          <span className="d-win-chip">
            <Check style={{ width: "1.1em", height: "1.1em" }} strokeWidth={3} />
            Sold
          </span>
          <div className="d-hero" style={{ fontSize: `clamp(20px, ${U(3.4)}, 160px)`, marginTop: U(1.3) }}>
            {winner.team_id}
          </div>
          <div className="d-label" style={{ marginTop: U(0.5), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {winner.team_name}
          </div>
          <div className="d-win-price" style={{ marginTop: U(1.5) }}>
            <CountUp value={winner.amount} delay={(delay + 0.3) * 1000} format={formatRupees} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Shown only once the backend has confirmed a result. Every winner gets the same gold card,
 * in the order the operator entered them: with one shared price there is no ranking to show.
 */
export default function SoldScreen({ result, lot }: { result: LotResultView; lot: Lot | null }) {
  const winners = result.winners;
  const samePrice = winners.every((w) => w.amount === winners[0].amount);
  const total = lot?.quantity_total ?? winners.length;
  const open = lot ? lot.quantity_remaining : 0;
  const afterCards = FIRST_CARD_AT + winners.length * STAGGER + 0.5;

  return (
    <div className="d-screen flex flex-col items-center justify-center text-center">
      <Backdrop x={50} y={52} planet={6} />
      <motion.div
        className="pointer-events-none absolute inset-0 z-30"
        style={{ background: "#F8F5FF" }}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.14, ease: "linear" }}
      />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.7, ease: EASE }}>
        <p className="d-label">Sold · {result.lot_name}</p>
        <p className="d-win-headline" style={{ marginTop: U(1) }}>
          {samePrice ? (
            <>
              {winners.length === 1 ? "Winner pays" : "All winners pay"} <span className="d-num">{formatRupees(winners[0].amount)}</span>
            </>
          ) : (
            "Each winner pays their own bid"
          )}
        </p>
      </motion.div>

      <div className="flex items-stretch justify-center text-left" style={{ gap: U(2), marginTop: U(3.6), perspective: U(90) }}>
        {winners.map((w, i) => (
          <WinnerCard key={w.sale_id} winner={w} index={i} />
        ))}
        {Array.from({ length: open }, (_, i) => (
          <motion.div
            key={`open-${i}`}
            className="d-open-slot"
            style={{ width: U(21) }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: afterCards, duration: 0.7, ease: EASE }}
          >
            Slot open
          </motion.div>
        ))}
      </div>

      <motion.p className="d-label" style={{ marginTop: U(3) }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: afterCards, duration: 0.7 }}>
        Slots left:{" "}
        <span className="d-num" style={{ color: "var(--text)" }}>
          {open} / {total}
        </span>
        {result.note ? ` · Also bid: ${result.note}` : ""}
      </motion.p>
    </div>
  );
}
