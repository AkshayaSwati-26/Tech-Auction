import { useMemo, useRef, type ComponentType } from "react";
import { useFrame } from "@react-three/fiber";
import { Instance, Instances, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { Link, Part, useIconStage, useSoftGlow } from "./stage";

const TAU = Math.PI * 2;
type V3 = [number, number, number];

/* ------------------------------------------------------------------ 1 sensors */
function Sensors() {
  const { glass, gold, glow } = useIconStage();
  const ripples = useRef<Array<THREE.Mesh | null>>([]);
  const blinks = useRef<Array<THREE.Mesh | null>>([]);
  const rippleMats = [useSoftGlow(0.5), useSoftGlow(0.5), useSoftGlow(0.5)];
  const nodes: V3[] = [
    [1.12, 0.35, 0.2],
    [-0.95, -0.15, 0.62],
    [-0.3, 0.75, -0.95],
  ];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ripples.current.forEach((m, i) => {
      if (!m) return;
      const p = (t * 0.32 + i / 3) % 1;
      m.scale.setScalar(0.6 + p * 1.05);
      rippleMats[i].opacity = 0.55 * (1 - p);
    });
    blinks.current.forEach((m, i) => {
      if (m) m.scale.setScalar(0.7 + 0.5 * Math.max(0, Math.sin(t * 2.2 + i * 2.1)));
    });
  });

  return (
    <>
      <Part from={[0, 1.6, 0]}>
        <mesh material={glass}>
          <capsuleGeometry args={[0.52, 0.55, 12, 32]} />
        </mesh>
        <mesh material={glow}>
          <sphereGeometry args={[0.2, 24, 24]} />
        </mesh>
      </Part>
      <Part from={[0, -1.4, 0]} delay={0.1}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={gold}>
          <torusGeometry args={[0.56, 0.085, 16, 64]} />
        </mesh>
      </Part>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => (ripples.current[i] = m)} position={[0, -0.95, 0]} rotation={[Math.PI / 2, 0, 0]} material={rippleMats[i]}>
          <torusGeometry args={[1, 0.035, 8, 64]} />
        </mesh>
      ))}
      {nodes.map((p, i) => (
        <Part key={i} from={[p[0] * 0.9, p[1] * 0.9, p[2] * 0.9]} delay={0.2 + i * 0.08}>
          <group position={p}>
            <mesh material={glass}>
              <sphereGeometry args={[0.17, 24, 24]} />
            </mesh>
            <mesh ref={(m) => (blinks.current[i] = m)} material={glow}>
              <sphereGeometry args={[0.07, 12, 12]} />
            </mesh>
          </group>
        </Part>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ 2 cameras */
function Cameras() {
  const { glass, gold, glow } = useIconStage();
  const cone = useRef<THREE.Group>(null);
  const light = useRef<THREE.Mesh>(null);
  const frames = useRef<Array<THREE.Mesh | null>>([]);
  const coneMat = useSoftGlow(0.07);
  const frameMat = useSoftGlow(0.85);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (cone.current) cone.current.rotation.y = Math.sin(t * 0.7) * 0.5;
    if (light.current) light.current.scale.setScalar(0.8 + 0.4 * Math.max(0, Math.sin(t * 2.4)));
    frames.current.forEach((m, i) => {
      if (m) m.visible = Math.sin(t * 1.5 + i * 2.4) > 0.1;
    });
  });

  return (
    <>
      <Part from={[0, 1.5, 0]}>
        <RoundedBox args={[1.7, 1.08, 0.72]} radius={0.2} smoothness={5} material={glass} />
        <RoundedBox args={[0.6, 0.22, 0.5]} radius={0.09} smoothness={4} position={[-0.38, 0.62, 0]} material={glass} />
        <mesh ref={light} position={[0.62, 0.34, 0.38]} material={glow}>
          <sphereGeometry args={[0.07, 12, 12]} />
        </mesh>
      </Part>
      <Part from={[0, 0, 1.6]} delay={0.12}>
        <group position={[-0.1, -0.04, 0.38]}>
          <mesh material={gold}>
            <torusGeometry args={[0.4, 0.09, 16, 64]} />
          </mesh>
          <mesh position={[0, 0, 0.04]} material={gold}>
            <torusGeometry args={[0.24, 0.045, 12, 48]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={glass}>
            <cylinderGeometry args={[0.34, 0.34, 0.3, 40]} />
          </mesh>
          <mesh position={[0, 0, 0.08]} material={glow}>
            <sphereGeometry args={[0.13, 20, 20]} />
          </mesh>
          <group ref={cone}>
            <mesh position={[0, 0, 0.95]} rotation={[-Math.PI / 2, 0, 0]} material={coneMat}>
              <coneGeometry args={[0.45, 1.5, 32, 1, true]} />
            </mesh>
          </group>
        </group>
      </Part>
      {(
        [
          [0.95, 0.75, 0.9],
          [-1.05, -0.7, 0.8],
        ] as V3[]
      ).map((p, i) => (
        <mesh key={i} ref={(m) => (frames.current[i] = m)} position={p} rotation={[0, 0, Math.PI / 4]} material={frameMat}>
          <torusGeometry args={[0.2, 0.028, 6, 4]} />
        </mesh>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ 3 drone */
function Drone() {
  const { glass, gold, glow } = useIconStage();
  const body = useRef<THREE.Group>(null);
  const blades = useRef<Array<THREE.Group | null>>([]);
  const discMat = useSoftGlow(0.26);
  const coneMat = useSoftGlow(0.14);
  const corners: V3[] = [
    [0.86, 0.12, 0.86],
    [-0.86, 0.12, 0.86],
    [0.86, 0.12, -0.86],
    [-0.86, 0.12, -0.86],
  ];

  useFrame(({ clock }, delta) => {
    if (body.current) {
      body.current.position.y = 0.25 + Math.sin(clock.elapsedTime * 1.3) * 0.07;
      body.current.rotation.z = Math.sin(clock.elapsedTime * 0.9) * 0.05;
    }
    blades.current.forEach((g, i) => {
      if (g) g.rotation.y += delta * (i % 2 ? -3.2 : 3.2);
    });
  });

  return (
    <group ref={body} position={[0, 0.25, 0]} scale={1.02}>
      <Part from={[0, 1.4, 0]}>
        <RoundedBox args={[0.82, 0.36, 0.82]} radius={0.16} smoothness={5} material={glass} />
        <mesh material={glow}>
          <sphereGeometry args={[0.13, 16, 16]} />
        </mesh>
      </Part>
      {corners.map((c, i) => (
        <Part key={i} from={[c[0] * 0.9, 0, c[2] * 0.9]} delay={0.1 + i * 0.06}>
          <Link a={[c[0] * 0.3, 0.02, c[2] * 0.3]} b={c} radius={0.055} material={gold} />
          <group position={c}>
            <mesh position={[0, 0.06, 0]} material={gold}>
              <cylinderGeometry args={[0.09, 0.09, 0.16, 16]} />
            </mesh>
            <mesh position={[0, 0.16, 0]} material={discMat}>
              <cylinderGeometry args={[0.4, 0.4, 0.02, 32]} />
            </mesh>
            <group ref={(g) => (blades.current[i] = g)} position={[0, 0.17, 0]}>
              <mesh material={glass}>
                <boxGeometry args={[0.74, 0.03, 0.09]} />
              </mesh>
            </group>
          </group>
        </Part>
      ))}
      <mesh position={[0, -0.72, 0]} material={coneMat}>
        <coneGeometry args={[0.6, 1.1, 32, 1, true]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ 4 prediction */
const LAYERS: Array<{ x: number; ys: number[] }> = [
  { x: -0.95, ys: [0.75, 0.15, -0.45] },
  { x: 0, ys: [1.0, 0.45, -0.1, -0.65] },
  { x: 0.95, ys: [0.6, -0.1] },
];

function Prediction() {
  const { glass, gold, glow } = useIconStage();
  const pulse = useRef<THREE.Mesh>(null);
  const linkMat = useSoftGlow(0.5, "#b9a3ff");

  const { nodes, links, arrow } = useMemo(() => {
    const nodes: V3[] = LAYERS.flatMap((l, li) => l.ys.map((y, i) => [l.x, y, (i % 2 ? 0.14 : -0.14) * (li === 1 ? 1 : -1)] as V3));
    const byLayer = LAYERS.map((l, li) => l.ys.map((_, i) => nodes[LAYERS.slice(0, li).reduce((n, x) => n + x.ys.length, 0) + i]));
    const links: Array<[V3, V3]> = [];
    for (let li = 0; li < byLayer.length - 1; li++) for (const a of byLayer[li]) for (const b of byLayer[li + 1]) links.push([a, b]);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.1, -1.05, 0.5),
      new THREE.Vector3(-0.4, -0.9, 0.5),
      new THREE.Vector3(0.1, -0.95, 0.5),
      new THREE.Vector3(0.6, -0.55, 0.5),
      new THREE.Vector3(1.05, -0.2, 0.5),
    ]);
    return { nodes, links, arrow: new THREE.TubeGeometry(curve, 40, 0.06, 10, false) };
  }, []);

  const path = useMemo(() => [nodes[1], nodes[4], nodes[7], nodes[8]], [nodes]);

  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const p = ((clock.elapsedTime * 0.45) % 1) * (path.length - 1);
    const i = Math.min(path.length - 2, Math.floor(p));
    const f = p - i;
    pulse.current.position.set(
      path[i][0] + (path[i + 1][0] - path[i][0]) * f,
      path[i][1] + (path[i + 1][1] - path[i][1]) * f,
      path[i][2] + (path[i + 1][2] - path[i][2]) * f + 0.05
    );
  });

  return (
    <>
      <Part from={[0, 0, -1.4]}>
        {links.map(([a, b], i) => (
          <Link key={i} a={a} b={b} radius={0.035} material={linkMat} />
        ))}
      </Part>
      <Part from={[0, 1.5, 0]} delay={0.1}>
        <Instances limit={nodes.length} material={glass}>
          <sphereGeometry args={[0.19, 24, 24]} />
          {nodes.map((p, i) => (
            <Instance key={i} position={p} />
          ))}
        </Instances>
        <mesh ref={pulse} material={glow}>
          <sphereGeometry args={[0.12, 16, 16]} />
        </mesh>
      </Part>
      <Part from={[-1.4, -0.6, 0]} delay={0.25}>
        <mesh geometry={arrow} material={gold} />
        <mesh position={[1.12, -0.14, 0.5]} rotation={[0, 0, -Math.PI / 2 + 0.72]} material={gold}>
          <coneGeometry args={[0.16, 0.34, 20]} />
        </mesh>
      </Part>
    </>
  );
}

/* ------------------------------------------------------------------ 5 edge */
function Edge() {
  const { glass, gold, glow } = useIconStage();
  const ring = useRef<THREE.Mesh>(null);
  const dots = useRef<Array<THREE.Mesh | null>>([]);
  const core = useRef<THREE.Mesh>(null);
  const traceMat = useSoftGlow(0.55, "#b9a3ff");
  const ringMat = useSoftGlow(0.7, "#b9a3ff");
  const pins = useMemo(() => {
    const out: Array<{ p: V3; r: number }> = [];
    for (const s of [-1, 1]) for (const k of [-0.42, -0.14, 0.14, 0.42]) {
      out.push({ p: [s * 0.78, 0, k], r: 0 });
      out.push({ p: [k, 0, s * 0.78], r: Math.PI / 2 });
    }
    return out;
  }, []);
  const traces: V3[] = [
    [0.52, 0.13, 0],
    [-0.52, 0.13, 0],
    [0, 0.13, 0.52],
    [0, 0.13, -0.52],
  ];

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (ring.current) ring.current.rotation.z += delta * 0.25;
    if (core.current) core.current.scale.setScalar(1 + 0.06 * Math.sin(t * 2));
    dots.current.forEach((m, i) => {
      if (!m) return;
      const p = (t * 0.6 + i * 0.25) % 1;
      m.position.set(traces[i][0] * (0.35 + p * 0.95), 0.14, traces[i][2] * (0.35 + p * 0.95));
    });
  });

  return (
    <group rotation={[0.95, 0, 0]}>
      <Part from={[0, 1.5, 0]}>
        <RoundedBox args={[1.4, 0.24, 1.4]} radius={0.1} smoothness={5} material={glass} />
      </Part>
      <Part from={[0, -1.3, 0]} delay={0.1}>
        <Instances limit={pins.length} material={gold}>
          <boxGeometry args={[0.24, 0.11, 0.12]} />
          {pins.map((pin, i) => (
            <Instance key={i} position={pin.p} rotation={[0, pin.r, 0]} />
          ))}
        </Instances>
      </Part>
      <Part from={[0, 1.2, 0]} delay={0.2}>
        <mesh ref={core} position={[0, 0.15, 0]} material={glow}>
          <boxGeometry args={[0.42, 0.1, 0.42]} />
        </mesh>
        {traces.map((p, i) => (
          <mesh key={i} position={[p[0] * 0.8, 0.13, p[2] * 0.8]} rotation={[0, p[0] !== 0 ? 0 : Math.PI / 2, 0]} material={traceMat}>
            <boxGeometry args={[0.5, 0.03, 0.05]} />
          </mesh>
        ))}
        {traces.map((_, i) => (
          <mesh key={i} ref={(m) => (dots.current[i] = m)} material={glow}>
            <sphereGeometry args={[0.055, 10, 10]} />
          </mesh>
        ))}
      </Part>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]} material={ringMat}>
        <torusGeometry args={[1.22, 0.035, 10, 72, TAU * 0.82]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ 6 network */
function Network() {
  const { glass, gold, glow } = useIconStage();
  const orbit = useRef<THREE.Group>(null);
  const dots = useRef<Array<THREE.Mesh | null>>([]);
  const arcMat = useSoftGlow(0.55, "#b9a3ff");
  const R = 1.08;
  const nodes = useMemo(() => [0, 1, 2, 3].map((i) => [Math.cos((i / 4) * TAU) * R, i % 2 ? 0.28 : -0.2, Math.sin((i / 4) * TAU) * R] as V3), []);

  useFrame(({ clock }, delta) => {
    if (orbit.current) orbit.current.rotation.y += delta * 0.28;
    dots.current.forEach((m, i) => {
      if (!m) return;
      const p = (clock.elapsedTime * 0.5 + i * 0.27) % 1;
      const n = nodes[i];
      m.position.set(n[0] * p, n[1] * p, n[2] * p);
    });
  });

  return (
    <>
      <Part from={[0, 1.5, 0]}>
        <mesh material={glass}>
          <sphereGeometry args={[0.5, 40, 40]} />
        </mesh>
        <mesh material={glow}>
          <sphereGeometry args={[0.19, 20, 20]} />
        </mesh>
      </Part>
      <group ref={orbit}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={arcMat}>
          <torusGeometry args={[R, 0.03, 8, 72]} />
        </mesh>
        {nodes.map((n, i) => (
          <Part key={i} from={[n[0] * 0.8, n[1], n[2] * 0.8]} delay={0.12 + i * 0.07}>
            <Link a={[n[0] * 0.45, n[1] * 0.45, n[2] * 0.45]} b={n} radius={0.04} material={arcMat} />
            <group position={n}>
              <mesh material={glass}>
                <sphereGeometry args={[0.2, 24, 24]} />
              </mesh>
              <mesh position={[0, 0.26, 0]} rotation={[Math.PI, 0, 0]} material={gold}>
                <coneGeometry args={[0.2, 0.16, 24, 1, true]} />
              </mesh>
              <mesh position={[0, 0.3, 0]} material={gold}>
                <sphereGeometry args={[0.045, 10, 10]} />
              </mesh>
            </group>
            <mesh ref={(m) => (dots.current[i] = m)} material={glow}>
              <sphereGeometry args={[0.07, 12, 12]} />
            </mesh>
          </Part>
        ))}
      </group>
    </>
  );
}

export const ICONS_3D: Record<string, ComponentType> = {
  sensors: Sensors,
  cameras: Cameras,
  drone: Drone,
  prediction: Prediction,
  edge: Edge,
  network: Network,
};
