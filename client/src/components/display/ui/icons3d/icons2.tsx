import { useEffect, useMemo, useRef, type ComponentType } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { Part, useIconStage, useSoftGlow } from "./stage";

type V3 = [number, number, number];

function useDisposable<T extends THREE.BufferGeometry>(make: () => T): T {
  const geometry = useMemo(make, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

/* ------------------------------------------------------------------ 7 mobile */
function Mobile() {
  const { glass, gold, glow } = useIconStage();
  const bell = useRef<THREE.Group>(null);
  const cards = useRef<Array<THREE.Group | null>>([]);
  const screenMat = useSoftGlow(0.22);
  const alerts: V3[] = [
    [0.62, 0.42, 0.42],
    [-0.66, -0.08, 0.62],
    [0.52, -0.6, 0.82],
  ];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (bell.current) bell.current.rotation.z = Math.sin(t * 3) * 0.22 * Math.max(0, Math.sin(t * 0.8));
    cards.current.forEach((g, i) => {
      if (!g) return;
      g.position.y = alerts[i][1] + Math.sin(t * 0.9 + i * 1.7) * 0.06;
      g.scale.setScalar(0.92 + 0.08 * Math.sin(t * 1.3 + i * 2.2));
    });
  });

  return (
    <>
      <Part from={[0, 1.6, 0]}>
        <RoundedBox args={[1.0, 1.9, 0.18]} radius={0.09} smoothness={5} material={glass} />
        <mesh position={[0, 0, 0.1]} material={screenMat}>
          <boxGeometry args={[0.8, 1.6, 0.01]} />
        </mesh>
        <mesh position={[0, -0.82, 0.1]} material={glow}>
          <boxGeometry args={[0.26, 0.035, 0.02]} />
        </mesh>
      </Part>
      <Part from={[0.9, 0.9, 0.6]} delay={0.15}>
        <group ref={bell} position={[0.5, 1.02, 0.2]}>
          <mesh material={gold}>
            <cylinderGeometry args={[0.07, 0.2, 0.26, 24]} />
          </mesh>
          <mesh position={[0, 0.16, 0]} material={gold}>
            <sphereGeometry args={[0.05, 12, 12]} />
          </mesh>
          <mesh position={[0, -0.17, 0]} material={gold}>
            <sphereGeometry args={[0.07, 12, 12]} />
          </mesh>
        </group>
      </Part>
      {alerts.map((p, i) => (
        <Part key={i} from={[p[0] * 0.9, 0, 1.2]} delay={0.25 + i * 0.1}>
          <group ref={(g) => (cards.current[i] = g)} position={p}>
            <RoundedBox args={[0.78, 0.3, 0.07]} radius={0.035} smoothness={4} material={glass} />
            <mesh position={[-0.24, 0, 0.045]} material={glow}>
              <sphereGeometry args={[0.055, 12, 12]} />
            </mesh>
            <mesh position={[0.1, 0, 0.045]} material={glow}>
              <boxGeometry args={[0.36, 0.045, 0.015]} />
            </mesh>
          </group>
        </Part>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ 8 signage */
function Signage() {
  const { glass, gold, glow } = useIconStage();
  const waves = useRef<Array<THREE.Mesh | null>>([]);
  const arrow = useRef<THREE.Group>(null);
  const waveMats = [useSoftGlow(0.6), useSoftGlow(0.6), useSoftGlow(0.6)];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    waves.current.forEach((m, i) => {
      if (!m) return;
      const p = (t * 0.4 + i / 3) % 1;
      m.scale.setScalar(0.55 + p * 0.9);
      m.position.x = 0.55 + p * 0.5;
      waveMats[i].opacity = 0.6 * (1 - p);
    });
    if (arrow.current) arrow.current.scale.setScalar(1 + 0.12 * Math.max(0, Math.sin(t * 2.4)));
  });

  return (
    <>
      <group position={[-0.2, 0.3, 0]} rotation={[0, 0, 0.22]}>
        <Part from={[-1.5, 0, 0]}>
          <mesh rotation={[0, 0, -Math.PI / 2]} material={glass}>
            <cylinderGeometry args={[0.66, 0.2, 1.1, 40]} />
          </mesh>
          <RoundedBox args={[0.36, 0.44, 0.44]} radius={0.1} smoothness={4} position={[-0.7, 0, 0]} material={glass} />
          <mesh position={[-0.62, -0.42, 0]} material={gold}>
            <cylinderGeometry args={[0.07, 0.07, 0.5, 16]} />
          </mesh>
        </Part>
        <Part from={[1.4, 0, 0]} delay={0.12}>
          <mesh position={[0.55, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={gold}>
            <torusGeometry args={[0.66, 0.07, 14, 56]} />
          </mesh>
          <mesh position={[0.3, 0, 0]} material={glow}>
            <sphereGeometry args={[0.13, 16, 16]} />
          </mesh>
        </Part>
        {[0, 1, 2].map((i) => (
          <mesh key={i} ref={(m) => (waves.current[i] = m)} position={[0.6, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={waveMats[i]}>
            <torusGeometry args={[0.5, 0.04, 8, 48]} />
          </mesh>
        ))}
      </group>
      <Part from={[0, -1.3, 0.8]} delay={0.25}>
        <group position={[0.35, -0.82, 0.55]}>
          <RoundedBox args={[0.95, 0.42, 0.09]} radius={0.045} smoothness={4} material={glass} />
          <group ref={arrow} position={[0, 0, 0.07]}>
            <mesh position={[-0.1, 0, 0]} material={gold}>
              <boxGeometry args={[0.42, 0.09, 0.05]} />
            </mesh>
            <mesh position={[0.22, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={gold}>
              <coneGeometry args={[0.14, 0.24, 3]} />
            </mesh>
          </group>
        </group>
      </Part>
    </>
  );
}

/* ------------------------------------------------------------------ 9 switching */
function Switching() {
  const { glass, gold, glow } = useIconStage();
  const lever = useRef<THREE.Group>(null);
  const contact = useRef<THREE.Mesh>(null);
  const gate = useRef<THREE.Group>(null);
  const lineMat = useSoftGlow(0.7, "#b9a3ff");

  useFrame(({ clock }) => {
    const k = 0.5 + 0.5 * Math.tanh(3 * Math.sin(clock.elapsedTime * 0.75));
    if (lever.current) lever.current.rotation.x = -0.6 + 1.2 * k;
    if (contact.current) contact.current.scale.x = Math.max(0.001, 1 - k);
    if (gate.current) gate.current.rotation.z = 0.15 + 1.05 * k;
  });

  return (
    <group position={[-0.42, 0, 0]}>
      <Part from={[0, 1.5, 0]}>
        <RoundedBox args={[1.15, 1.6, 0.6]} radius={0.16} smoothness={5} material={glass} />
        <mesh position={[0, 0.15, 0.31]} material={lineMat}>
          <boxGeometry args={[0.3, 0.75, 0.02]} />
        </mesh>
      </Part>
      <Part from={[0, 0, 1.5]} delay={0.12}>
        <group ref={lever} position={[0, 0.15, 0.34]}>
          <mesh position={[0, 0, 0.26]} rotation={[Math.PI / 2, 0, 0]} material={gold}>
            <cylinderGeometry args={[0.085, 0.085, 0.52, 20]} />
          </mesh>
          <mesh position={[0, 0, 0.56]} material={gold}>
            <sphereGeometry args={[0.15, 24, 24]} />
          </mesh>
        </group>
        <mesh position={[0, 0.15, 0.34]} rotation={[0, 0, Math.PI / 2]} material={gold}>
          <cylinderGeometry args={[0.11, 0.11, 0.34, 20]} />
        </mesh>
      </Part>
      <Part from={[0, -1.2, 0.6]} delay={0.2}>
        <mesh position={[-0.36, -0.55, 0.32]} material={glow}>
          <boxGeometry args={[0.22, 0.06, 0.03]} />
        </mesh>
        <mesh position={[0.36, -0.55, 0.32]} material={glow}>
          <boxGeometry args={[0.22, 0.06, 0.03]} />
        </mesh>
        <mesh ref={contact} position={[0, -0.55, 0.32]} material={glow}>
          <boxGeometry args={[0.5, 0.06, 0.03]} />
        </mesh>
      </Part>
      <Part from={[1.4, -0.4, 0]} delay={0.28}>
        <group position={[0.9, -0.78, 0.1]}>
          <mesh position={[0, 0.42, 0]} material={gold}>
            <cylinderGeometry args={[0.075, 0.075, 0.9, 16]} />
          </mesh>
          <group ref={gate} position={[0, 0.82, 0]}>
            <mesh position={[0.34, 0, 0]} material={glass}>
              <boxGeometry args={[0.72, 0.12, 0.12]} />
            </mesh>
            <mesh position={[0.7, 0, 0]} material={glow}>
              <sphereGeometry args={[0.07, 12, 12]} />
            </mesh>
          </group>
        </group>
      </Part>
    </group>
  );
}

/* ------------------------------------------------------------------ 10 battery */
function Battery() {
  const { glass, gold, glow } = useIconStage();
  const level = useRef<THREE.Mesh>(null);
  const bars = useRef<Array<THREE.Mesh | null>>([]);
  const levelMat = useSoftGlow(0.5, "#b9a3ff");
  const bolt = useDisposable(() => {
    const s = new THREE.Shape();
    s.moveTo(0.12, 0.42);
    s.lineTo(-0.2, -0.04);
    s.lineTo(0.0, -0.04);
    s.lineTo(-0.12, -0.42);
    s.lineTo(0.2, 0.06);
    s.lineTo(0.0, 0.06);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
  });
  const BAR_Y = [-0.62, -0.26, 0.1, 0.46];

  useFrame(({ clock }) => {
    const k = 0.2 + 0.75 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 0.55));
    if (level.current) {
      level.current.scale.y = k;
      level.current.position.y = -0.82 + (1.55 * k) / 2;
    }
    bars.current.forEach((m, i) => {
      if (m) m.visible = k > 0.18 + i * 0.22;
    });
  });

  return (
    <>
      <Part from={[0, 1.5, 0]}>
        <mesh material={glass}>
          <capsuleGeometry args={[0.6, 0.85, 12, 40]} />
        </mesh>
      </Part>
      <Part from={[0, 1.8, 0]} delay={0.12}>
        <mesh position={[0, 1.08, 0]} material={gold}>
          <cylinderGeometry args={[0.24, 0.24, 0.18, 32]} />
        </mesh>
        <mesh position={[0, 0.94, 0]} rotation={[Math.PI / 2, 0, 0]} material={gold}>
          <torusGeometry args={[0.4, 0.05, 12, 48]} />
        </mesh>
      </Part>
      <Part from={[0, -1.4, 0]} delay={0.2}>
        <mesh ref={level} material={levelMat}>
          <cylinderGeometry args={[0.4, 0.4, 1.55, 32]} />
        </mesh>
        {BAR_Y.map((y, i) => (
          <mesh key={i} ref={(m) => (bars.current[i] = m)} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow}>
            <torusGeometry args={[0.47, 0.035, 8, 48]} />
          </mesh>
        ))}
      </Part>
      <Part from={[0, 0, 1.5]} delay={0.3}>
        <mesh geometry={bolt} position={[0, 0.02, 0.62]} material={gold} />
      </Part>
    </>
  );
}

/* ------------------------------------------------------------------ 11 dashboard */
function Dashboard() {
  const { glass, gold, glow } = useIconStage();
  const bars = useRef<Array<THREE.Mesh | null>>([]);
  const needle = useRef<THREE.Group>(null);
  const kpi = useRef<THREE.Mesh>(null);
  const barMat = useSoftGlow(0.95, "#ffffff");
  const line = useDisposable(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.68, 0.02, 0),
      new THREE.Vector3(-0.3, 0.18, 0),
      new THREE.Vector3(0.05, 0.08, 0),
      new THREE.Vector3(0.38, 0.3, 0),
      new THREE.Vector3(0.68, 0.36, 0),
    ]);
    return new THREE.TubeGeometry(curve, 48, 0.04, 8, false);
  });
  const total = line.index ? line.index.count : 0;
  const BARS = [0.28, 0.46, 0.36, 0.58];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const draw = Math.min(1, Math.max(0, (t - 0.9) / 1.2));
    line.setDrawRange(0, Math.floor((total * draw) / 3) * 3);
    bars.current.forEach((m, i) => {
      if (!m) return;
      const h = BARS[i] * Math.min(1, Math.max(0.02, (t - 0.7 - i * 0.12) / 0.6)) * (1 + 0.08 * Math.sin(t * 1.4 + i));
      m.scale.y = h;
      m.position.y = -0.4 + h / 2;
    });
    if (needle.current) needle.current.rotation.z = Math.sin(t * 0.8) * 1.1;
    if (kpi.current) kpi.current.scale.setScalar(1 + 0.18 * Math.sin(t * 2));
  });

  return (
    <>
      <Part from={[0, 1.5, 0]}>
        <group position={[-0.05, 0.38, 0]} rotation={[-0.12, 0.12, 0]}>
          <RoundedBox args={[1.9, 1.15, 0.1]} radius={0.05} smoothness={5} material={glass} />
          <group position={[0, 0, 0.07]}>
            {BARS.map((_, i) => (
              <mesh key={i} ref={(m) => (bars.current[i] = m)} position={[-0.66 + i * 0.2, -0.3, 0]} material={barMat}>
                <boxGeometry args={[0.13, 1, 0.04]} />
              </mesh>
            ))}
            <mesh geometry={line} position={[0.1, 0, 0.02]} material={gold} />
          </group>
        </group>
      </Part>
      <Part from={[1.3, -1.0, 0.8]} delay={0.15}>
        <group position={[0.82, -0.62, 0.42]} rotation={[-0.1, -0.2, 0]}>
          <RoundedBox args={[0.9, 0.62, 0.08]} radius={0.04} smoothness={4} material={glass} />
          <group position={[0, -0.14, 0.06]}>
            <mesh material={gold}>
              <torusGeometry args={[0.26, 0.045, 10, 40, Math.PI]} />
            </mesh>
            <group ref={needle}>
              <mesh position={[0, 0.11, 0]} material={barMat}>
                <boxGeometry args={[0.05, 0.22, 0.03]} />
              </mesh>
            </group>
          </group>
        </group>
      </Part>
      <Part from={[-1.3, -1.0, 0.8]} delay={0.25}>
        <group position={[-0.85, -0.66, 0.36]} rotation={[-0.1, 0.25, 0]}>
          <RoundedBox args={[0.8, 0.54, 0.08]} radius={0.04} smoothness={4} material={glass} />
          <mesh ref={kpi} position={[-0.2, 0.02, 0.07]} material={gold}>
            <sphereGeometry args={[0.1, 20, 20]} />
          </mesh>
          <mesh position={[0.14, 0.08, 0.06]} material={glow}>
            <boxGeometry args={[0.3, 0.05, 0.02]} />
          </mesh>
          <mesh position={[0.1, -0.08, 0.06]} material={glow}>
            <boxGeometry args={[0.22, 0.05, 0.02]} />
          </mesh>
        </group>
      </Part>
    </>
  );
}

/* ------------------------------------------------------------------ 12 shield */
const HEX: V3[] = [
  [-0.36, 0.52, 0],
  [0, 0.52, 0],
  [0.36, 0.52, 0],
  [-0.54, 0.2, 0],
  [0.54, 0.2, 0],
  [-0.36, -0.42, 0],
  [0.36, -0.42, 0],
  [0, -0.72, 0],
];

function Shield() {
  const { glass, gold, glow } = useIconStage();
  const scan = useRef<THREE.Mesh>(null);
  const cells = useRef<Array<THREE.Mesh | null>>([]);
  const ripple = useRef<THREE.Mesh>(null);
  const cellMat = useSoftGlow(0.5, "#b9a3ff");
  const rippleMat = useSoftGlow(0);
  const body = useDisposable(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 1.12);
    s.lineTo(0.9, 0.8);
    s.lineTo(0.9, 0.1);
    s.bezierCurveTo(0.9, -0.55, 0.45, -0.95, 0, -1.18);
    s.bezierCurveTo(-0.45, -0.95, -0.9, -0.55, -0.9, 0.1);
    s.lineTo(-0.9, 0.8);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 5, curveSegments: 24 });
    g.translate(0, 0, -0.11);
    return g;
  });

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (scan.current) {
      const p = (t * 0.32) % 1;
      const y = 0.95 - p * 1.9;
      scan.current.position.y = y;
      scan.current.scale.x = y > 0.1 ? 1 : Math.max(0.15, 1 + (y - 0.1) / 1.25);
    }
    cells.current.forEach((m, i) => {
      if (m) m.scale.setScalar(0.65 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.6 + i * 1.3)));
    });
    if (ripple.current) {
      const p = (t * 0.35) % 1;
      const on = p < 0.5;
      ripple.current.visible = on;
      if (on) {
        ripple.current.scale.setScalar(0.4 + p * 2.2);
        rippleMat.opacity = 0.6 * (1 - p * 2);
      }
    }
  });

  return (
    <>
      <Part from={[0, 1.5, 0]}>
        <mesh geometry={body} material={glass} />
      </Part>
      <Part from={[0, 0, -1.2]} delay={0.1}>
        {HEX.map((p, i) => (
          <mesh key={i} ref={(m) => (cells.current[i] = m)} position={[p[0], p[1], 0.215]} rotation={[Math.PI / 2, 0, 0]} material={cellMat}>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 6]} />
          </mesh>
        ))}
        <mesh ref={scan} position={[0, 0.9, 0.24]} material={glow}>
          <boxGeometry args={[1.6, 0.045, 0.03]} />
        </mesh>
      </Part>
      <Part from={[0, 0, 1.6]} delay={0.2}>
        <group position={[0, -0.02, 0.3]}>
          <RoundedBox args={[0.58, 0.46, 0.2]} radius={0.08} smoothness={4} position={[0, -0.12, 0]} material={gold} />
          <mesh position={[0, 0.12, 0]} material={gold}>
            <torusGeometry args={[0.17, 0.055, 12, 32, Math.PI]} />
          </mesh>
          <mesh position={[0, -0.12, 0.11]} material={glass}>
            <sphereGeometry args={[0.07, 14, 14]} />
          </mesh>
        </group>
      </Part>
      <mesh ref={ripple} position={[0.72, 0.62, 0.3]} material={rippleMat} visible={false}>
        <torusGeometry args={[0.2, 0.03, 8, 40]} />
      </mesh>
    </>
  );
}

export const ICONS_3D_B: Record<string, ComponentType> = {
  mobile: Mobile,
  signage: Signage,
  switching: Switching,
  battery: Battery,
  dashboard: Dashboard,
  shield: Shield,
};
