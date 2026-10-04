import { useEffect, useMemo, useRef, type ComponentType } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { Part, useIconStage, useSoftGlow } from "./stage";

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ 01 explore */
function Explore() {
  const { glass, gold, glow } = useIconStage();
  const lens = useRef<THREE.Group>(null);
  const marks = useRef<Array<THREE.Mesh | null>>([]);
  const CARDS = [-0.62, 0, 0.62];

  useFrame(({ clock }) => {
    const x = Math.sin(clock.elapsedTime * 0.7) * 0.66;
    if (lens.current) lens.current.position.x = x;
    marks.current.forEach((m, i) => {
      if (m) m.scale.setScalar(Math.abs(x - CARDS[i]) < 0.3 ? 1.5 : 0.8);
    });
  });

  return (
    <>
      {CARDS.map((x, i) => (
        <Part key={i} from={[x * 1.6, -1.2, 0]} delay={i * 0.08}>
          <group position={[x, -0.3, -0.1]} rotation={[0, 0, -x * 0.42]}>
            <RoundedBox args={[0.56, 0.82, 0.07]} radius={0.035} smoothness={4} material={glass} />
            <mesh ref={(m) => (marks.current[i] = m)} position={[0, 0.1, 0.05]} material={glow}>
              <sphereGeometry args={[0.07, 12, 12]} />
            </mesh>
            <mesh position={[0, -0.2, 0.045]} material={glow}>
              <boxGeometry args={[0.3, 0.04, 0.015]} />
            </mesh>
          </group>
        </Part>
      ))}
      <Part from={[0, 1.4, 1.2]} delay={0.3}>
        <group ref={lens} position={[0, 0.25, 0.55]}>
          <mesh material={gold}>
            <torusGeometry args={[0.44, 0.075, 16, 56]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={glass}>
            <cylinderGeometry args={[0.4, 0.4, 0.06, 40]} />
          </mesh>
          <mesh position={[0.5, -0.5, 0]} rotation={[0, 0, Math.PI / 4]} material={gold}>
            <cylinderGeometry args={[0.07, 0.08, 0.62, 16]} />
          </mesh>
        </group>
      </Part>
    </>
  );
}

/* ------------------------------------------------------------------ 02 bid */
function Bid() {
  const { glass, gold, glow } = useIconStage();
  const pivot = useRef<THREE.Group>(null);
  const ripple = useRef<THREE.Mesh>(null);
  const rippleMat = useSoftGlow(0);
  const handle = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1c1136", metalness: 0.7, roughness: 0.22 }), []);
  useEffect(() => () => handle.dispose(), [handle]);

  useFrame(({ clock }) => {
    const s = clock.elapsedTime % 6;
    const tap = s < 0.6 ? Math.sin((s / 0.6) * Math.PI) * 0.3 : 0;
    if (pivot.current) pivot.current.rotation.z = -0.5 + tap;
    if (ripple.current) {
      const p = (s - 0.3) / 1.2;
      const on = p > 0 && p < 1;
      ripple.current.visible = on;
      if (on) {
        ripple.current.scale.setScalar(1 + p * 1.2);
        rippleMat.opacity = 0.5 * (1 - p);
      }
    }
  });

  return (
    <>
      <Part from={[1.4, 1.0, 0]}>
        <group ref={pivot} position={[0.55, -0.25, 0]} rotation={[0, 0, -0.5]}>
          <mesh position={[-0.65, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={handle}>
            <cylinderGeometry args={[0.06, 0.085, 1.3, 20]} />
          </mesh>
          <group position={[-1.3, 0, 0]}>
            <mesh material={glass}>
              <cylinderGeometry args={[0.34, 0.34, 0.9, 40]} />
            </mesh>
            {[-0.26, 0.26].map((y) => (
              <mesh key={y} position={[0, y, 0]} material={gold}>
                <cylinderGeometry args={[0.36, 0.36, 0.1, 40]} />
              </mesh>
            ))}
          </group>
        </group>
      </Part>
      <Part from={[0, -1.3, 0]} delay={0.12}>
        <group position={[-0.5, -0.92, 0]}>
          <mesh material={glass}>
            <cylinderGeometry args={[0.6, 0.6, 0.14, 40]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={gold}>
            <torusGeometry args={[0.6, 0.04, 10, 56]} />
          </mesh>
          <mesh ref={ripple} rotation={[Math.PI / 2, 0, 0]} material={rippleMat} visible={false}>
            <torusGeometry args={[0.66, 0.025, 8, 56]} />
          </mesh>
        </group>
      </Part>
      <Part from={[1.3, -0.4, 0.6]} delay={0.25}>
        <group position={[0.85, -0.35, 0.45]} rotation={[0, -0.3, 0.12]}>
          <mesh position={[0, -0.42, 0]} material={gold}>
            <cylinderGeometry args={[0.045, 0.045, 0.6, 12]} />
          </mesh>
          <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]} material={glass}>
            <cylinderGeometry args={[0.36, 0.36, 0.08, 40]} />
          </mesh>
          <mesh position={[0, 0.18, 0.06]} material={glow}>
            <boxGeometry args={[0.06, 0.3, 0.02]} />
          </mesh>
        </group>
      </Part>
    </>
  );
}

/* ------------------------------------------------------------------ 03 challenge */
function Challenge() {
  const { glass, gold } = useIconStage();
  const rings = useRef<Array<THREE.Mesh | null>>([]);
  const arc = useRef<THREE.Mesh>(null);
  const mats = [useSoftGlow(0.5), useSoftGlow(0.5)];
  const arcMat = useSoftGlow(0.7, "#b9a3ff");

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    rings.current.forEach((m, i) => {
      if (!m) return;
      const p = (t * 0.35 + i / 2) % 1;
      m.scale.setScalar(1 + p * 0.55);
      mats[i].opacity = 0.5 * (1 - p);
    });
    if (arc.current) arc.current.rotation.z -= delta * 0.6;
  });

  return (
    <>
      <Part from={[0, 1.5, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={glass}>
          <cylinderGeometry args={[0.82, 0.82, 0.26, 56]} />
        </mesh>
      </Part>
      <Part from={[0, -1.4, 0]} delay={0.1}>
        <mesh material={gold}>
          <torusGeometry args={[0.84, 0.07, 14, 64]} />
        </mesh>
      </Part>
      <Part from={[0, 0, 1.5]} delay={0.22}>
        <mesh position={[0, 0.14, 0.2]} material={gold}>
          <capsuleGeometry args={[0.1, 0.42, 8, 20]} />
        </mesh>
        <mesh position={[0, -0.4, 0.2]} material={gold}>
          <sphereGeometry args={[0.115, 20, 20]} />
        </mesh>
      </Part>
      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => (rings.current[i] = m)} position={[0, 0, -0.05]} material={mats[i]}>
          <torusGeometry args={[0.9, 0.028, 8, 64]} />
        </mesh>
      ))}
      <mesh ref={arc} position={[0, 0, 0.02]} material={arcMat}>
        <torusGeometry args={[1.12, 0.035, 8, 48, 1.3]} />
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------------ 04 build */
function Gear({ radius, teeth, rimmed }: { radius: number; teeth: number; rimmed?: boolean }) {
  const { glass, gold } = useIconStage();
  return (
    <>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={glass}>
        <cylinderGeometry args={[radius, radius, 0.24, 40]} />
      </mesh>
      {Array.from({ length: teeth }, (_, i) => {
        const a = (i / teeth) * TAU;
        return (
          <mesh key={i} position={[Math.cos(a) * (radius + 0.07), Math.sin(a) * (radius + 0.07), 0]} rotation={[0, 0, a]} material={glass}>
            <boxGeometry args={[0.2, 0.2, 0.22]} />
          </mesh>
        );
      })}
      <mesh material={gold}>
        <torusGeometry args={[radius * 0.36, 0.05, 10, 32]} />
      </mesh>
      {rimmed && (
        <mesh material={gold}>
          <torusGeometry args={[radius * 0.82, 0.04, 10, 48]} />
        </mesh>
      )}
    </>
  );
}

function Build() {
  const { gold } = useIconStage();
  const a = useRef<THREE.Group>(null);
  const b = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (a.current) a.current.rotation.z += delta * 0.4;
    if (b.current) b.current.rotation.z -= delta * 0.4 * (10 / 8);
  });

  return (
    <>
      <Part from={[-1.4, 0.8, 0]}>
        <group ref={a} position={[-0.42, 0.22, 0]}>
          <Gear radius={0.58} teeth={10} rimmed />
        </group>
      </Part>
      <Part from={[1.4, -0.8, 0]} delay={0.12}>
        <group ref={b} position={[0.6, -0.42, 0]} rotation={[0, 0, 0.39]}>
          <Gear radius={0.44} teeth={8} />
        </group>
      </Part>
      <Part from={[0, -1.2, 1.4]} delay={0.26}>
        <group position={[0.05, -0.12, 0.34]} rotation={[0, 0, -0.62]}>
          <mesh material={gold}>
            <boxGeometry args={[1.5, 0.15, 0.1]} />
          </mesh>
          <mesh position={[-0.86, 0, 0]} rotation={[0, 0, 0.9]} material={gold}>
            <torusGeometry args={[0.2, 0.075, 12, 32, 4.6]} />
          </mesh>
          <mesh position={[0.8, 0, 0]} material={gold}>
            <torusGeometry args={[0.13, 0.06, 12, 32]} />
          </mesh>
        </group>
      </Part>
    </>
  );
}

/* ------------------------------------------------------------------ 05 pitch */
function Pitch() {
  const { glass, gold } = useIconStage();
  const bars = useRef<Array<THREE.Mesh | null>>([]);
  const star = useRef<THREE.Mesh>(null);
  const barMat = useSoftGlow(0.95, "#ffffff");
  const BARS = [0.22, 0.34, 0.46, 0.6];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    bars.current.forEach((m, i) => {
      if (!m) return;
      const cycle = (t % 7) - 0.8 - i * 0.18;
      const h = BARS[i] * Math.min(1, Math.max(0.04, cycle / 0.6));
      m.scale.y = h;
      m.position.y = -0.27 + h / 2;
    });
    if (star.current) {
      star.current.rotation.y = t * 0.8;
      star.current.scale.setScalar(1 + 0.15 * Math.sin(t * 2.2));
    }
  });

  return (
    <>
      <Part from={[0, -1.4, 0]}>
        <group position={[0, -0.72, 0.25]}>
          <mesh material={glass}>
            <cylinderGeometry args={[0.36, 0.5, 0.9, 4]} />
          </mesh>
          <mesh position={[0, 0.5, 0]} rotation={[0.25, 0, 0]} material={gold}>
            <boxGeometry args={[0.78, 0.07, 0.5]} />
          </mesh>
        </group>
      </Part>
      <Part from={[0, 1.5, -0.6]} delay={0.14}>
        <group position={[0, 0.42, -0.3]}>
          <RoundedBox args={[1.5, 0.92, 0.09]} radius={0.045} smoothness={4} material={glass} />
          {BARS.map((_, i) => (
            <mesh key={i} ref={(m) => (bars.current[i] = m)} position={[-0.42 + i * 0.28, -0.2, 0.06]} material={barMat}>
              <boxGeometry args={[0.17, 1, 0.03]} />
            </mesh>
          ))}
        </group>
      </Part>
      <Part from={[0.9, 1.4, 0.6]} delay={0.3}>
        <mesh ref={star} position={[0.72, 1.05, 0.1]} material={gold}>
          <octahedronGeometry args={[0.17, 0]} />
        </mesh>
      </Part>
    </>
  );
}

export const ICONS_3D_FLOW: Record<string, ComponentType> = {
  "flow-explore": Explore,
  "flow-bid": Bid,
  "flow-challenge": Challenge,
  "flow-build": Build,
  "flow-pitch": Pitch,
};
