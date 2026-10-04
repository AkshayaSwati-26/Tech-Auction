import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Backdrop from "./ui/Backdrop";
import Pill from "./ui/Pill";
import Gavel from "./ui/Gavel";
import { EASE } from "../../lib/motion";
import type { EventSettings } from "../../lib/types";

/** ~6s: glow fades in, title rises word by word, hairlines grow, pill fades in. Any key or click skips. */
export default function OpeningScreen({ settings }: { settings: EventSettings }) {
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    const skip = () => setSkipped(true);
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, []);

  const at = (delay: number, duration = 0.8) => (skipped ? { duration: 0 } : { delay, duration, ease: EASE });
  const name = (settings.event_name || "Tech Auction").trim();
  const words = name.split(/\s+/);
  const size = Math.min(6.2, 80 / (name.length * 1.02));
  const hairline = { width: "calc(var(--u) * 9)" };

  return (
    <div key={skipped ? "skipped" : "playing"} className="d-screen flex flex-col items-center justify-center text-center">
      <motion.div className="absolute inset-0" style={{ zIndex: -1 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={at(0, 1.2)}>
        <Backdrop x={50} y={40} planet={13} />
      </motion.div>

      <h1
        className="flex"
        style={{ fontSize: `calc(var(--u) * ${size})`, gap: "0.42em", whiteSpace: "nowrap", marginTop: "calc(var(--u) * -11)" }}
      >
        {words.map((word, i) => (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", padding: "0.08em 0" }}>
            <motion.span
              className={i === words.length - 1 && words.length > 1 ? "d-hero d-hero--violet" : "d-hero"}
              style={{ display: "inline-block" }}
              initial={{ y: "110%", opacity: 0, filter: "blur(14px)", letterSpacing: "0.3em" }}
              animate={{ y: "0%", opacity: 1, filter: "blur(0px)", letterSpacing: "0.06em" }}
              transition={at(1.2 + i * 0.4)}
            >
              {word}
            </motion.span>
          </span>
        ))}
      </h1>

      <div className="flex items-center" style={{ marginTop: "calc(var(--u) * 2.6)", gap: "calc(var(--u) * 1.8)" }}>
        <motion.span className="d-hairline" style={{ ...hairline, transformOrigin: "right" }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={at(2.8)} />
        <motion.p
          className="uppercase"
          style={{ fontSize: "calc(var(--u) * 1.15)", letterSpacing: "0.4em", marginRight: "-0.4em", color: "var(--secondary)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={at(3)}
        >
          {settings.tagline}
        </motion.p>
        <motion.span className="d-hairline" style={{ ...hairline, transformOrigin: "left", background: "linear-gradient(90deg, rgba(167, 139, 250, 0.7), transparent)" }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={at(2.8)} />
      </div>

      <motion.div style={{ marginTop: "calc(var(--u) * 4.2)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={at(4.4)}>
        <Pill dot>Auction begins shortly</Pill>
      </motion.div>

      <motion.div
        className="d-gavel"
        initial={{ opacity: 0, y: "14%", filter: "blur(10px)" }}
        animate={{ opacity: 1, y: "0%", filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.86 }}
        transition={skipped ? { duration: 0 } : { delay: 2.6, duration: 1.2, ease: EASE }}
      >
        <Gavel />
      </motion.div>
    </div>
  );
}
