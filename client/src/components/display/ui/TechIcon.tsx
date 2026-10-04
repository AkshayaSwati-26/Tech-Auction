import { Component, lazy, Suspense, type ReactNode } from "react";
import BoldIcon from "./BoldIcon";
import { useQualityStore } from "../../../store/qualityStore";

const loadIcon3D = () => import("./icons3d/Icon3D");
const Icon3D = lazy(loadIcon3D);

/** Icons that exist in 3D. Any other key uses the bold 2D version on every tier. */
const KEYS_3D = new Set(["sensors", "cameras", "drone", "prediction", "edge", "network", "mobile", "signage", "switching", "battery", "dashboard", "shield", "flow-explore", "flow-bid", "flow-challenge", "flow-build", "flow-pitch", "build-ring"]);

/** Warm the 3D chunk ahead of the next reveal (called while a lot is live or ready). */
export function preloadTechIcons() {
  void loadIcon3D();
}

class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** High: 3D glass with transmission. Medium: 3D with fake glass. Low or no WebGL: bold 2D. */
export default function TechIcon({
  iconKey,
  assemble,
  disc,
  active,
  startAt,
  light,
  sway,
}: {
  iconKey: string;
  assemble: boolean;
  /** false when the icon sits in a medallion instead of on its glass disc. */
  disc?: boolean;
  active?: boolean;
  startAt?: number;
  light?: boolean;
  sway?: number;
}) {
  const quality = useQualityStore((s) => s.quality);
  const flat = <BoldIcon iconKey={iconKey} />;
  if (quality === "low" || !KEYS_3D.has(iconKey)) return flat;
  return (
    <Boundary fallback={flat}>
      <Suspense fallback={null}>
        <Icon3D iconKey={iconKey} tier={quality} assemble={assemble} disc={disc} active={active} startAt={startAt} light={light} sway={sway} />
      </Suspense>
    </Boundary>
  );
}
