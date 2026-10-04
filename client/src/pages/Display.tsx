import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";
import { useEventStore } from "../store/eventStore";
import { getPublicSocket } from "../lib/socket";
import Backdrop from "../components/display/ui/Backdrop";
import OpeningScreen from "../components/display/OpeningScreen";
import ReadyScreen from "../components/display/ReadyScreen";
import RevealScreen from "../components/display/RevealScreen";
import LiveAuctionScreen from "../components/display/LiveAuctionScreen";
import SoldScreen from "../components/display/SoldScreen";
import UnsoldScreen from "../components/display/UnsoldScreen";
import SummaryScreen from "../components/display/SummaryScreen";
import EventFlowScreen from "../components/display/EventFlowScreen";
import BuildStartScreen from "../components/display/BuildStartScreen";
import { preloadTechIcons } from "../components/display/ui/TechIcon";
import { EASE } from "../lib/motion";

export default function Display() {
  const state = useEventStore((s) => s.state);
  const connected = useEventStore((s) => s.connected);
  const init = useEventStore((s) => s.init);
  const [pingFlash, setPingFlash] = useState(false);

  useEffect(() => {
    init("public");
    const socket = getPublicSocket();
    const onPing = () => {
      setPingFlash(true);
      setTimeout(() => setPingFlash(false), 2000);
    };
    socket.on("display:ping", onPing);
    return () => {
      socket.off("display:ping", onPing);
    };
  }, [init]);

  // The next lot's icon code is fetched before its reveal, not during it.
  useEffect(() => {
    preloadTechIcons();
  }, []);

  if (!state) {
    return (
      <div className="display-root">
        <div className="display-stage">
          <Backdrop />
          <div className="d-screen flex items-center justify-center">
            <p className="d-label">Connecting to event</p>
          </div>
        </div>
      </div>
    );
  }

  const { settings, lots, currentLot, lastResult, teams, flow, build } = state;
  const onFlow = settings.display_state === "event_flow";
  const ordered = [...lots].sort((a, b) => a.order_index - b.order_index);
  const closedCount = lots.filter((l) => l.quantity_remaining < l.quantity_total || l.status === "unsold").length;
  const nextLot = currentLot ?? ordered.find((l) => l.quantity_remaining > 0 && l.status !== "unsold") ?? null;
  const lotNumber = nextLot ? ordered.findIndex((l) => l.id === nextLot.id) + 1 : 0;
  const winnersFor = (remaining: number) => Math.max(1, Math.min(settings.winners_per_lot, remaining));
  const uniformFor = (lot: { pricing_mode: string | null }) => (lot.pricing_mode ?? settings.pricing_mode) === "UNIFORM_PRICE";

  const opening = <OpeningScreen settings={settings} />;
  let screen;
  switch (settings.display_state) {
    case "reveal":
      screen = currentLot ? (
        <RevealScreen lot={currentLot} winners={winnersFor(currentLot.quantity_remaining)} uniform={uniformFor(currentLot)} />
      ) : (
        opening
      );
      break;
    case "live":
      screen = currentLot ? (
        <LiveAuctionScreen
          lot={currentLot}
          bidMode={settings.bid_mode}
          winners={winnersFor(currentLot.quantity_remaining)}
          uniform={uniformFor(currentLot)}
        />
      ) : (
        opening
      );
      break;
    case "sold":
      screen = lastResult ? <SoldScreen result={lastResult} lot={lots.find((l) => l.id === lastResult.lot_id) ?? null} /> : opening;
      break;
    case "unsold":
      screen = <UnsoldScreen lot={currentLot} />;
      break;
    case "summary":
      screen = <SummaryScreen lots={lots} teams={teams} />;
      break;
    case "build_start":
      screen = <BuildStartScreen build={build} lots={lots} eventName={settings.event_name} serverTime={state.serverTime} />;
      break;
    case "event_flow":
      screen = <EventFlowScreen flow={flow} eventName={settings.event_name} />;
      break;
    case "ready":
      screen = <ReadyScreen lot={nextLot} lotNumber={lotNumber} totalLots={lots.length} closedCount={closedCount} />;
      break;
    default:
      screen = opening;
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="display-root">
        <div className="display-stage">
          <AnimatePresence>
            <motion.div
              key={settings.display_state + (onFlow ? `-${flow.replay}` : settings.display_state === "build_start" ? `-${build.replay}` : (currentLot?.id ?? "") + (lastResult?.id ?? ""))}
              // Event Flow arrives through a portal wipe and leaves with a depth zoom; the rest cross-fade.
              initial={onFlow ? { opacity: 1, clipPath: "circle(0% at 50% 62%)" } : { opacity: 0 }}
              animate={onFlow ? { opacity: 1, clipPath: "circle(150% at 50% 62%)" } : { opacity: 1 }}
              exit={onFlow ? { opacity: 0, scale: 0.9, filter: "blur(8px)" } : { opacity: 0 }}
              transition={{ duration: onFlow ? 0.8 : 0.6, ease: EASE }}
              className="absolute inset-0"
              style={{ background: "var(--bg)" }}
            >
              {screen}
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-x-0 z-50 flex justify-center" style={{ bottom: "calc(var(--u) * 1.6)" }}>
            {!connected && (
              <span className="d-pill" style={{ color: "#FB7185" }}>
                <WifiOff style={{ width: "1em", height: "1em" }} />
                Connection lost · showing last known state
              </span>
            )}
            <AnimatePresence>
              {connected && pingFlash && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="d-pill" style={{ color: "#34D399" }}>
                  <Wifi style={{ width: "1em", height: "1em" }} />
                  Connection OK
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
