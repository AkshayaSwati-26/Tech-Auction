import { useMemo, type CSSProperties } from "react";

/** Deterministic pseudo-random so stars stay put between renders and screens. */
function rand(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function starShadows(count: number, seed: number) {
  return Array.from({ length: count }, (_, i) => {
    const x = (rand(seed + i * 3.1) * 100).toFixed(2);
    const y = (rand(seed + i * 7.7) * 56.25).toFixed(2);
    const alpha = (0.35 + rand(seed + i * 1.3) * 0.65).toFixed(2);
    return `calc(var(--u) * ${x}) calc(var(--u) * ${y}) 0 0 rgba(233, 225, 255, ${alpha})`;
  }).join(", ");
}

const STAR_LAYERS = [
  { count: 70, seed: 11, size: 0.07, duration: 5 },
  { count: 55, seed: 47, size: 0.1, duration: 7 },
  { count: 26, seed: 83, size: 0.15, duration: 9 },
];

/**
 * The shared /display space scene: violet nebula glow, three twinkling star layers, an optional
 * glowing planet horizon and neon light ribbon, a faint dot grid and a vignette. CSS/SVG only.
 */
export default function Backdrop({
  x = 50,
  y = 50,
  dim = false,
  planet = false,
  ribbon = false,
}: {
  x?: number;
  y?: number;
  dim?: boolean;
  /** How far the planet horizon rises from the bottom edge, in stage units. */
  planet?: number | false;
  ribbon?: boolean;
}) {
  const stars = useMemo(() => STAR_LAYERS.map((l) => ({ ...l, shadow: starShadows(l.count, l.seed) })), []);

  return (
    <div className={`d-backdrop ${dim ? "d-backdrop--dim" : ""}`} aria-hidden="true">
      <div className="d-backdrop__glow" style={{ "--gx": `${x}%`, "--gy": `${y}%` } as CSSProperties} />
      <div className="d-backdrop__glow d-backdrop__glow--magenta" style={{ "--gx": `${100 - x * 0.2}%`, "--gy": `${y + 34}%` } as CSSProperties} />

      {stars.map((l) => (
        <span
          key={l.seed}
          className="d-stars"
          style={{
            width: `max(1px, calc(var(--u) * ${l.size}))`,
            height: `max(1px, calc(var(--u) * ${l.size}))`,
            boxShadow: l.shadow,
            animationDuration: `${l.duration}s`,
          }}
        />
      ))}

      {ribbon && (
        <svg className="d-ribbon" viewBox="0 0 600 340" preserveAspectRatio="none">
          <defs>
            <linearGradient id="d-ribbon-a" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#4f46e5" stopOpacity="0" />
              <stop offset="0.35" stopColor="#8b5cf6" />
              <stop offset="0.7" stopColor="#e879f9" />
              <stop offset="1" stopColor="#60a5fa" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#d-ribbon-a)" strokeLinecap="round">
            <path className="d-ribbon__band" strokeWidth="26" d="M40 60 C180 -30 300 190 430 90 S600 40 640 150" />
            <path className="d-ribbon__band d-ribbon__band--thin" strokeWidth="10" d="M20 110 C170 20 320 230 450 130 S590 90 640 200" />
            <path className="d-ribbon__trail" strokeWidth="2" d="M40 60 C180 -30 300 190 430 90 S600 40 640 150" />
            <path className="d-ribbon__trail d-ribbon__trail--slow" strokeWidth="1.5" d="M20 110 C170 20 320 230 450 130 S590 90 640 200" />
          </g>
        </svg>
      )}

      {planet !== false && (
        <div className="d-planet" style={{ "--rise": planet } as CSSProperties}>
          <div className="d-planet__surface" />
        </div>
      )}

      <div className="d-backdrop__grid" />
      <div className="d-backdrop__vignette" />
    </div>
  );
}
