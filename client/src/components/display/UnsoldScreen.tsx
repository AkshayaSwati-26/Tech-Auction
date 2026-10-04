import { motion } from "framer-motion";
import Backdrop from "./ui/Backdrop";
import { EASE, DURATION } from "../../lib/motion";
import type { Lot } from "../../lib/types";

const U = (n: number) => `calc(var(--u) * ${n})`;

export default function UnsoldScreen({ lot }: { lot: Lot | null }) {
  return (
    <div className="d-screen flex items-center justify-center">
      <Backdrop dim planet={6} />
      <motion.div
        className="d-card text-center"
        style={{ padding: `${U(4)} ${U(6)}`, maxWidth: U(60) }}
        initial={{ opacity: 0, y: "12%" }}
        animate={{ opacity: 1, y: "0%" }}
        transition={{ duration: DURATION, ease: EASE }}
      >
        {lot && <p className="d-label">{lot.name}</p>}
        <h1 className="d-hero" style={{ fontSize: U(3.8), marginTop: U(1) }}>
          No sale
        </h1>
        <p className="d-mid" style={{ marginTop: U(1.2) }}>
          Lot remains available
        </p>
      </motion.div>
    </div>
  );
}
