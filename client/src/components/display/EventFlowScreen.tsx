import { motion } from "framer-motion";
import { Search, Gavel, Target, Wrench, Presentation, type LucideIcon } from "lucide-react";
import Backdrop from "./ui/Backdrop";
import TechIcon from "./ui/TechIcon";
import { EASE, POP_SPRING } from "../../lib/motion";
import type { FlowState } from "../../lib/types";

const U = (n: number) => `calc(var(--u) * ${n})`;
const pad = (n: number) => String(n).padStart(2, "0");

const ICONS: Array<{ key: string; small: LucideIcon }> = [
  { key: "flow-explore", small: Search },
  { key: "flow-bid", small: Gavel },
  { key: "flow-challenge", small: Target },
  { key: "flow-build", small: Wrench },
  { key: "flow-pitch", small: Presentation },
];

const CARDS_AT = 1.2;
const STAGGER = 0.12;

/** The run-of-show page after the title. The operator spotlights one card at a time from /admin. */
export default function EventFlowScreen({ flow, eventName }: { flow: FlowState; eventName: string }) {
  const active = flow.step;
  const hairline = { width: U(8) };

  return (
    <div className="d-screen flex flex-col items-center" style={{ paddingTop: U(3) }}>
      <Backdrop x={50} y={34} planet={6} />
      <span className="d-portal-ring" />

      <header className="text-center">
        <div style={{ overflow: "hidden", padding: "0.1em 0" }}>
          <motion.h1
            className="d-hero"
            style={{ fontSize: U(2.9), letterSpacing: "0.3em", marginRight: "-0.3em" }}
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ delay: 0.15, duration: 0.8, ease: EASE }}
          >
            Event flow
          </motion.h1>
        </div>
        <div className="flex items-center justify-center" style={{ marginTop: U(1.1), gap: U(1.6) }}>
          <motion.span className="d-hairline" style={{ ...hairline, transformOrigin: "right" }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.6, duration: 0.8, ease: EASE }} />
          <motion.p
            className="uppercase"
            style={{ fontSize: U(0.95), letterSpacing: "0.4em", marginRight: "-0.4em", color: "var(--secondary)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8, ease: EASE }}
          >
            Explore. Bid. Solve. Present.
          </motion.p>
          <motion.span
            className="d-hairline"
            style={{ ...hairline, transformOrigin: "left", background: "linear-gradient(90deg, rgba(167, 139, 250, 0.7), transparent)" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: EASE }}
          />
        </div>
      </header>

      <div className="d-flow" style={{ marginTop: U(4) }}>
        <motion.div className="d-flow__line" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.9, duration: 0.9, ease: EASE }}>
          <span className="d-flow__node" />
        </motion.div>

        {flow.steps.map((step, i) => {
          const n = i + 1;
          const at = CARDS_AT + i * STAGGER;
          const isActive = active === n;
          const dimmed = active !== 0 && !isActive;
          const Small = ICONS[i].small;
          return (
            <motion.div
              key={i}
              className="d-flow__slot"
              initial={{ opacity: 0, y: "14%", rotateX: 14 }}
              animate={{ opacity: 1, y: "0%", rotateX: 0 }}
              transition={{ delay: at, duration: 0.8, ease: EASE }}
            >
              <div className="d-float" style={{ animationDelay: `${-i * 1.4}s`, height: "100%" }}>
                <motion.div
                  className={`d-card d-flow-card ${isActive ? "d-flow-card--active" : ""}`}
                  animate={{ scale: isActive ? 1.06 : 1, filter: dimmed ? "brightness(0.7) blur(0.7px)" : "brightness(1) blur(0px)" }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  {["tl", "tr", "bl", "br"].map((c) => (
                    <span key={c} className={`d-tick d-tick--${c}`} />
                  ))}
                  <motion.div className="d-flow-badge" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...POP_SPRING, delay: at + 0.3 }}>
                    <span>{pad(n)}</span>
                  </motion.div>

                  <div className="d-medallion">
                    <span className="d-medallion__ring" />
                    <div className="d-medallion__icon">
                      <TechIcon iconKey={ICONS[i].key} assemble disc={false} active={isActive} startAt={at + 0.35} />
                    </div>
                  </div>

                  <motion.p
                    className="d-flow-kicker"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: at + 0.45, duration: 0.6, ease: EASE }}
                  >
                    {step.kicker}
                  </motion.p>
                  <div className="d-flow-heading">
                    <motion.h2 initial={{ y: "105%" }} animate={{ y: "0%" }} transition={{ delay: at + 0.6, duration: 0.7, ease: EASE }}>
                      {step.heading}
                    </motion.h2>
                  </div>
                  <motion.p
                    className="d-flow-text"
                    initial={{ opacity: 0, y: "12%" }}
                    animate={{ opacity: 1, y: "0%" }}
                    transition={{ delay: at + 0.8, duration: 0.7, ease: EASE }}
                  >
                    {step.text}
                  </motion.p>

                  <div className="d-flow-foot">
                    <span />
                    <Small style={{ width: U(1.1), height: U(1.1), color: "var(--gold)" }} strokeWidth={1.6} />
                    <span />
                  </div>
                </motion.div>
              </div>
              {n < flow.steps.length && (
                <svg className="d-flow__chevron" viewBox="0 0 10 16" style={{ animationDelay: `${i * 0.5}s` }}>
                  <path d="M2 2 L8 8 L2 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </motion.div>
          );
        })}
      </div>

      <span className="d-podium" />
      <p className="d-telemetry">
        {eventName} <i /> {active === 0 ? "Overview" : `Step ${pad(active)} / ${pad(flow.steps.length)}`}
      </p>
    </div>
  );
}
