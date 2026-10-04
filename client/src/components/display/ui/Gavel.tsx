import { Component, lazy, Suspense, type ReactNode } from "react";
import { useQualityStore } from "../../../store/qualityStore";

const Gavel3D = lazy(() => import("./gavel3d/Gavel3D"));

class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Bold 2D gavel for the Low tier and when WebGL is unavailable. */
function GavelSvg() {
  return (
    <svg viewBox="0 0 340 215" className="d-gavel-svg" aria-hidden="true">
      <ellipse cx={170} cy={128} rx={150} ry={38} fill="none" stroke="#E8C277" strokeWidth={1} opacity={0.7} />
      <ellipse cx={170} cy={128} rx={164} ry={46} fill="none" stroke="#b9a3ff" strokeWidth={1} strokeDasharray="5 7" opacity={0.4} />
      <ellipse cx={120} cy={190} rx={62} ry={13} fill="rgba(139, 92, 246, 0.42)" stroke="#E8C277" strokeWidth={3} />
      <g transform="translate(250 152) rotate(25)">
        <rect x={-145} y={-6.5} width={150} height={13} rx={6.5} fill="#1c1136" stroke="#3a2a66" strokeWidth={2} />
        <rect x={-34} y={-8.5} width={7} height={17} rx={2} fill="#E8C277" />
        <rect x={-170} y={-46} width={50} height={92} rx={12} fill="rgba(139, 92, 246, 0.5)" stroke="#d6c8ff" strokeWidth={5} />
        <rect x={-173} y={-31} width={56} height={11} rx={3} fill="#E8C277" />
        <rect x={-173} y={20} width={56} height={11} rx={3} fill="#E8C277" />
        <path d="M-145 -14 V14 M-145 0 H-132" stroke="#efe8ff" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      </g>
    </svg>
  );
}

export default function Gavel() {
  const quality = useQualityStore((s) => s.quality);
  const flat = <GavelSvg />;
  if (quality === "low") return flat;
  return (
    <Boundary fallback={flat}>
      <Suspense fallback={null}>
        <Gavel3D tier={quality} />
      </Suspense>
    </Boundary>
  );
}
