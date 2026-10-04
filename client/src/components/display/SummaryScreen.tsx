import { motion } from "framer-motion";
import Backdrop from "./ui/Backdrop";
import CountUp from "../shared/CountUp";
import { EASE, DURATION } from "../../lib/motion";
import { formatRupees } from "../../lib/format";
import type { Lot, TeamWithWallet } from "../../lib/types";

const U = (n: number) => `calc(var(--u) * ${n})`;

/** Team spending in team-ID order. Deliberately not a ranking: remaining budget is not a result. */
export default function SummaryScreen({ lots, teams }: { lots: Lot[]; teams: TeamWithWallet[] }) {
  const soldUnits = lots.reduce((s, l) => s + (l.quantity_total - l.quantity_remaining), 0);
  const unsoldLots = lots.filter((l) => l.status === "unsold").length;
  const totalSpent = teams.reduce((s, t) => s + t.spent, 0);
  const maxSpent = Math.max(1, ...teams.map((t) => t.spent));
  const ordered = [...teams].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const n = ordered.length;
  const cols = n <= 8 ? 4 : n <= 15 ? 5 : n <= 21 ? 7 : n <= 32 ? 8 : 10;

  const stats = [
    { label: "Lots offered", value: lots.length },
    { label: "Units sold", value: soldUnits },
    { label: "Unsold lots", value: unsoldLots },
    { label: "Total spent", value: totalSpent, gold: true },
  ];

  return (
    <div className="d-screen flex flex-col">
      <Backdrop x={50} y={20} />

      <div className="flex items-end justify-between">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DURATION, ease: EASE }}>
          <p className="d-label">Auction complete</p>
          <h1 className="d-hero" style={{ fontSize: U(2.6), marginTop: U(0.8) }}>
            Summary
          </h1>
        </motion.div>
        <div className="flex" style={{ gap: U(3.5) }}>
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + i * 0.09, duration: DURATION, ease: EASE }}>
              <div className="d-label">{s.label}</div>
              <div className={`d-mid ${s.gold ? "d-gold" : "d-strong"}`} style={{ marginTop: U(0.3) }}>
                <CountUp value={s.value} format={s.gold ? formatRupees : undefined} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: "1fr", gap: U(1.1), marginTop: U(3.2), minHeight: 0 }}>
        {ordered.map((t, i) => (
          <motion.div
            key={t.id}
            className="d-card flex flex-col justify-between"
            style={{ padding: `${U(1.3)} ${U(1.4)}`, maxHeight: U(13) }}
            initial={{ opacity: 0, y: "20%" }}
            animate={{ opacity: 1, y: "0%" }}
            transition={{ delay: 0.35 + i * 0.03, duration: DURATION, ease: EASE }}
          >
            <div>
              <div className="flex items-baseline justify-between" style={{ gap: U(0.6) }}>
                <span className="d-mid d-strong">{t.id}</span>
                <span className="d-mid d-gold">
                  <CountUp value={t.spent} duration={800} delay={350 + i * 30} format={formatRupees} />
                </span>
              </div>
              <div className="d-label" style={{ marginTop: U(0.2), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.name}
              </div>
            </div>
            <div className="d-bar" style={{ marginTop: U(0.8) }}>
              <motion.div
                className="d-bar__fill"
                initial={{ width: 0 }}
                animate={{ width: `${(t.spent / maxSpent) * 100}%` }}
                transition={{ delay: 0.5 + i * 0.03, duration: 0.8, ease: EASE }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
