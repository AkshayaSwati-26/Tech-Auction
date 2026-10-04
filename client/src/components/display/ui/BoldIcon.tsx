import type { ReactNode } from "react";

const GOLD = "#E8C277";
const g = { stroke: GOLD, fill: "none" };
const gf = { stroke: "none", fill: GOLD };
const lit = { stroke: "none", fill: "#efe8ff" };

/** Bold 2D versions of the technology icons: thick strokes, violet fill, one gold accent.
    Used on Medium/Low tiers, when WebGL is unavailable, and at small sizes. */
const ART: Record<string, ReactNode> = {
  sensors: (
    <>
      <path d="M52 150 Q100 176 148 150" opacity={0.45} />
      <path d="M36 158 Q100 196 164 158" opacity={0.22} />
      <rect x={68} y={38} width={64} height={104} rx={32} />
      <ellipse cx={100} cy={92} rx={39} ry={11} {...g} />
      <circle cx={100} cy={66} r={9} {...lit} />
      <circle cx={34} cy={96} r={11} />
      <circle cx={166} cy={72} r={11} />
      <circle cx={158} cy={130} r={9} />
    </>
  ),
  cameras: (
    <>
      <rect x={52} y={48} width={44} height={22} rx={8} />
      <rect x={30} y={62} width={140} height={92} rx={20} />
      <circle cx={94} cy={108} r={32} {...g} />
      <circle cx={94} cy={108} r={15} {...lit} />
      <circle cx={148} cy={82} r={6} {...lit} />
      <path d="M150 122 h14 v14" opacity={0.6} />
    </>
  ),
  drone: (
    <>
      <path d="M78 100 L46 72 M122 100 L154 72 M80 112 L48 134 M120 112 L152 134" {...g} />
      <ellipse cx={46} cy={66} rx={26} ry={8} />
      <ellipse cx={154} cy={66} rx={26} ry={8} />
      <ellipse cx={48} cy={130} rx={24} ry={7} opacity={0.7} />
      <ellipse cx={152} cy={130} rx={24} ry={7} opacity={0.7} />
      <rect x={70} y={86} width={60} height={36} rx={14} />
      <circle cx={100} cy={104} r={7} {...lit} />
      <path d="M84 134 L68 176 H132 L116 134" opacity={0.3} />
    </>
  ),
  prediction: (
    <>
      <path d="M44 62 L100 44 M44 62 L100 88 M44 110 L100 88 M44 110 L100 132 M100 44 L156 70 M100 88 L156 70 M100 88 L156 116 M100 132 L156 116" opacity={0.55} strokeWidth={5} />
      {[
        [44, 62],
        [44, 110],
        [100, 44],
        [100, 88],
        [100, 132],
        [156, 70],
        [156, 116],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={13} />
      ))}
      <circle cx={100} cy={88} r={6} {...lit} />
      <path d="M34 172 Q84 172 112 156 T160 138" {...g} />
      <path d="M148 132 L166 136 L156 152 Z" {...gf} />
    </>
  ),
  edge: (
    <>
      <circle cx={100} cy={100} r={84} opacity={0.4} strokeDasharray="10 12" />
      <path d="M78 54 V38 M100 54 V38 M122 54 V38 M78 146 V162 M100 146 V162 M122 146 V162 M54 78 H38 M54 100 H38 M54 122 H38 M146 78 H162 M146 100 H162 M146 122 H162" {...g} />
      <rect x={54} y={54} width={92} height={92} rx={16} />
      <rect x={80} y={80} width={40} height={40} rx={8} {...lit} />
    </>
  ),
  network: (
    <>
      <path d="M100 100 L100 36 M100 100 L164 100 M100 100 L100 164 M100 100 L36 100" opacity={0.55} strokeWidth={5} />
      <path d="M100 36 A64 64 0 0 1 164 100 M164 100 A64 64 0 0 1 100 164 M100 164 A64 64 0 0 1 36 100 M36 100 A64 64 0 0 1 100 36" opacity={0.4} strokeWidth={4} />
      <circle cx={100} cy={100} r={25} />
      <circle cx={100} cy={100} r={9} {...lit} />
      {[
        [100, 36],
        [164, 100],
        [100, 164],
        [36, 100],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={14} />
      ))}
      <circle cx={100} cy={66} r={5} {...gf} />
      <circle cx={134} cy={100} r={5} {...gf} />
    </>
  ),
  mobile: (
    <>
      <rect x={62} y={28} width={72} height={144} rx={16} />
      <path d="M88 156 H108" />
      <rect x={104} y={78} width={66} height={28} rx={9} />
      <rect x={28} y={112} width={66} height={28} rx={9} />
      <circle cx={118} cy={92} r={5} {...lit} />
      <circle cx={42} cy={126} r={5} {...lit} />
      <circle cx={138} cy={42} r={15} {...gf} />
    </>
  ),
  signage: (
    <>
      <rect x={26} y={82} width={22} height={36} rx={7} />
      <path d="M48 82 L116 48 V152 L48 118 Z" />
      <path d="M134 78 Q150 100 134 122" opacity={0.75} />
      <path d="M150 62 Q178 100 150 138" opacity={0.4} />
      <path d="M56 170 H112 M100 158 L114 170 L100 182" {...g} />
    </>
  ),
  switching: (
    <>
      <rect x={36} y={36} width={84} height={128} rx={16} />
      <path d="M52 134 H66 M90 134 H104" />
      <path d="M78 108 L98 68" {...g} strokeWidth={10} />
      <circle cx={100} cy={64} r={9} {...gf} />
      <path d="M154 166 V104" {...g} />
      <path d="M154 104 L120 76" />
      <circle cx={118} cy={74} r={5} {...lit} />
    </>
  ),
  battery: (
    <>
      <rect x={84} y={24} width={32} height={16} rx={5} {...gf} />
      <rect x={60} y={40} width={80} height={134} rx={20} />
      <rect x={76} y={140} width={48} height={14} rx={5} {...lit} />
      <rect x={76} y={118} width={48} height={14} rx={5} {...lit} opacity={0.6} />
      <path d="M108 56 L86 96 H102 L94 122 L118 82 H102 Z" {...gf} />
    </>
  ),
  dashboard: (
    <>
      <rect x={24} y={36} width={124} height={84} rx={12} />
      <path d="M44 104 V86 M62 104 V72 M80 104 V80" strokeWidth={9} />
      <path d="M92 94 L108 76 L120 84 L136 58" {...g} />
      <rect x={112} y={110} width={66} height={50} rx={10} />
      <path d="M128 146 A17 17 0 0 1 162 146" {...g} />
      <rect x={26} y={132} width={66} height={42} rx={10} />
      <circle cx={46} cy={153} r={7} {...gf} />
      <path d="M62 153 H78" />
    </>
  ),
  shield: (
    <>
      <path d="M100 26 L162 50 V98 C162 140 132 162 100 176 C68 162 38 140 38 98 V50 Z" />
      <path d="M56 72 H144" opacity={0.5} strokeWidth={4} />
      <path d="M86 100 V88 A14 14 0 0 1 114 88 V100" {...g} />
      <rect x={78} y={100} width={44} height={34} rx={8} {...gf} />
    </>
  ),
  "flow-explore": (
    <>
      <rect x={30} y={84} width={44} height={66} rx={8} transform="rotate(-14 52 117)" />
      <rect x={78} y={78} width={44} height={66} rx={8} />
      <rect x={126} y={84} width={44} height={66} rx={8} transform="rotate(14 148 117)" />
      <circle cx={100} cy={84} r={34} {...g} />
      <path d="M124 110 L150 138" {...g} strokeWidth={10} />
      <circle cx={100} cy={84} r={8} {...lit} />
    </>
  ),
  "flow-bid": (
    <>
      <ellipse cx={74} cy={160} rx={46} ry={11} />
      <path d="M150 150 L92 96" strokeWidth={9} />
      <rect x={52} y={52} width={46} height={66} rx={12} transform="rotate(-42 75 85)" />
      <path d="M52 78 L84 50 M68 108 L102 78" {...g} />
      <circle cx={156} cy={66} r={24} />
      <path d="M156 90 V128" {...g} />
    </>
  ),
  "flow-challenge": (
    <>
      <circle cx={100} cy={100} r={78} opacity={0.35} strokeWidth={4} />
      <circle cx={100} cy={100} r={56} />
      <path d="M100 68 V108" {...g} strokeWidth={12} />
      <circle cx={100} cy={130} r={8} {...gf} />
      <path d="M150 34 A82 82 0 0 1 180 78" strokeWidth={5} opacity={0.8} />
    </>
  ),
  "flow-build": (
    <>
      <circle cx={78} cy={84} r={40} strokeDasharray="16 9" strokeWidth={12} opacity={0.8} />
      <circle cx={78} cy={84} r={30} />
      <circle cx={78} cy={84} r={11} {...g} />
      <circle cx={136} cy={136} r={30} strokeDasharray="13 8" strokeWidth={11} opacity={0.8} />
      <circle cx={136} cy={136} r={21} />
      <path d="M48 158 L150 62" {...g} strokeWidth={11} />
      <circle cx={154} cy={58} r={10} {...g} />
    </>
  ),
  "flow-pitch": (
    <>
      <rect x={42} y={34} width={116} height={76} rx={10} />
      <path d="M64 96 V84 M86 96 V72 M108 96 V62 M130 96 V50" strokeWidth={10} stroke="#efe8ff" />
      <path d="M78 176 L88 128 H112 L122 176 Z" />
      <path d="M76 126 H124" {...g} strokeWidth={9} />
      <path d="M168 22 L172 34 L184 38 L172 42 L168 54 L164 42 L152 38 L164 34 Z" {...gf} />
    </>
  ),
  "build-ring": (
    <>
      <circle cx={100} cy={84} r={71} strokeWidth={11} />
      <circle cx={100} cy={84} r={80} {...g} strokeWidth={2} opacity={0.7} />
      <path d="M88 -12 H112 M90 -10 L100 2 L110 -10 M90 14 L100 2 L110 14 M88 16 H112" {...g} strokeWidth={4} />
    </>
  ),
  generic: (
    <>
      <path d="M82 60 V44 M118 60 V44 M82 140 V156 M118 140 V156 M60 82 H44 M60 118 H44 M140 82 H156 M140 118 H156" {...g} />
      <rect x={60} y={60} width={80} height={80} rx={16} />
      <rect x={84} y={84} width={32} height={32} rx={7} {...lit} />
    </>
  ),
};

export default function BoldIcon({ iconKey, className = "" }: { iconKey: string; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={`d-bold-icon ${className}`} aria-hidden="true">
      <g fill="rgba(139, 92, 246, 0.42)" stroke="#d6c8ff" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
        {ART[iconKey] ?? ART.generic}
      </g>
    </svg>
  );
}
