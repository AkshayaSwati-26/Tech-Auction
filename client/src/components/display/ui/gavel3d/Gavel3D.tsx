import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { RefractionBackdrop, useSoftGlow } from "../icons3d/stage";

const TAU = Math.PI * 2;
const HANDLE = 2.6;
const BASE_TILT = -0.436; // 25 degrees
const STRIKE_EVERY = 12;
const STRIKE_TIME = 0.7;

function useMaterials(high: boolean) {
  const mats = useMemo(() => {
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      iridescence: 0.4,
      iridescenceIOR: 1.3,
      emissive: "#6a3df0",
      emissiveIntensity: 0.12,
      envMapIntensity: 1.1,
      ...(high
        ? { transmission: 1, thickness: 0.9, ior: 1.38, attenuationColor: new THREE.Color("#b79cff"), attenuationDistance: 2.6 }
        : { color: new THREE.Color("#b9a3ff"), transparent: true, opacity: 0.62 }),
    });
    const chip = new THREE.MeshPhysicalMaterial({ color: "#b9a3ff", roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.6, envMapIntensity: 1 });
    const gold = new THREE.MeshStandardMaterial({ color: "#e8c277", metalness: 1, roughness: 0.2, envMapIntensity: 1.2 });
    const handle = new THREE.MeshStandardMaterial({ color: "#1c1136", metalness: 0.7, roughness: 0.22, envMapIntensity: 1.3 });
    const glow = new THREE.MeshBasicMaterial({ color: "#b9a6ff", toneMapped: false });
    return { glass, chip, gold, handle, glow };
  }, [high]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}

function Scene({ high, reduced }: { high: boolean; reduced: boolean }) {
  const { glass, chip, gold, handle, glow } = useMaterials(high);
  const root = useRef<THREE.Group>(null);
  const pivot = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const node = useRef<THREE.Mesh>(null);
  const chips = useRef<Array<THREE.Group | null>>([]);
  const ripple = useRef<THREE.Mesh>(null);
  const traceMat = useSoftGlow(0.55, "#b9a3ff");
  const rippleMat = useSoftGlow(0);
  const padMat = useSoftGlow(0.16, "#8b5cf6");

  const dashed = useMemo(() => {
    const pts = Array.from({ length: 129 }, (_, i) => new THREE.Vector3(Math.cos((i / 128) * TAU) * 3.2, 0, Math.sin((i / 128) * TAU) * 3.2));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineDashedMaterial({ color: "#b9a3ff", transparent: true, opacity: 0.35, dashSize: 0.12, gapSize: 0.16 })
    );
    line.computeLineDistances();
    return line;
  }, []);
  useEffect(
    () => () => {
      dashed.geometry.dispose();
      (dashed.material as THREE.Material).dispose();
    },
    [dashed]
  );

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.elapsedTime;
    if (root.current) {
      root.current.rotation.y = Math.sin(t * 0.4) * 0.14;
      root.current.position.y = Math.sin((t * TAU) / 7) * 0.06;
    }
    const s = t % STRIKE_EVERY;
    const striking = t > STRIKE_EVERY * 0.5 && s < STRIKE_TIME;
    if (pivot.current) pivot.current.rotation.z = BASE_TILT + (striking ? Math.sin((s / STRIKE_TIME) * Math.PI) * 0.21 : 0);
    if (ripple.current) {
      const p = (s - STRIKE_TIME * 0.5) / 1.6;
      const on = t > STRIKE_EVERY * 0.5 && p > 0 && p < 1;
      ripple.current.visible = on;
      if (on) {
        ripple.current.scale.setScalar(1 + p * 2.4);
        rippleMat.opacity = 0.18 * (1 - p);
      }
    }
    if (pulse.current) pulse.current.position.y = -0.42 + ((t * 0.35) % 1) * 0.84;
    if (node.current) node.current.position.set(Math.cos(t * 0.35) * 2.75, 0, Math.sin(t * 0.35) * 2.75);
    chips.current.forEach((g, i) => {
      if (!g) return;
      const a = t * 0.22 + (i / 3) * TAU;
      g.position.set(Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2);
      g.rotation.y = -a + Math.PI / 2;
    });
  });

  return (
    <group ref={root} scale={1.42} position={[0.1, 0.1, 0]}>
      <group scale={1.2} position={[0, -0.22, 0]}>
      {/* Gavel: pivots at the grip so the strike tips the head. */}
      <group ref={pivot} position={[1.3, -0.5, 0]} rotation={[0, 0, BASE_TILT]}>
        <mesh position={[-HANDLE / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={handle}>
          <cylinderGeometry args={[0.065, 0.1, HANDLE, 24]} />
        </mesh>
        <mesh position={[-0.02, 0, 0]} material={handle}>
          <sphereGeometry args={[0.105, 20, 20]} />
        </mesh>
        <mesh position={[-0.42, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={gold}>
          <torusGeometry args={[0.1, 0.028, 10, 32]} />
        </mesh>
        <group position={[-HANDLE, 0, 0]}>
          <mesh material={glass}>
            <cylinderGeometry args={[0.44, 0.44, 1.18, 48]} />
          </mesh>
          {[-0.34, 0.34].map((y) => (
            <mesh key={y} position={[0, y, 0]} material={gold}>
              <cylinderGeometry args={[0.465, 0.465, 0.12, 48]} />
            </mesh>
          ))}
          {[-0.63, 0.63].map((y) => (
            <mesh key={y} position={[0, y, 0]} material={gold}>
              <cylinderGeometry args={[0.4, 0.44, 0.09, 48]} />
            </mesh>
          ))}
          {/* Circuit traces inside the glass, with a slow travelling pulse. */}
          <mesh material={traceMat}>
            <boxGeometry args={[0.03, 0.95, 0.03]} />
          </mesh>
          <mesh position={[0.12, 0.12, 0]} material={traceMat}>
            <boxGeometry args={[0.24, 0.03, 0.03]} />
          </mesh>
          <mesh position={[-0.12, -0.14, 0]} material={traceMat}>
            <boxGeometry args={[0.24, 0.03, 0.03]} />
          </mesh>
          <mesh ref={pulse} material={glow}>
            <sphereGeometry args={[0.06, 12, 12]} />
          </mesh>
        </group>
      </group>

      {/* Sound block with a soft glow pad and the strike ripple. */}
      <group position={[-1.05, -0.92, 0]}>
        <mesh material={glass}>
          <cylinderGeometry args={[0.82, 0.82, 0.12, 48]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={gold}>
          <torusGeometry args={[0.82, 0.03, 10, 64]} />
        </mesh>
        <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} material={padMat}>
          <circleGeometry args={[1.5, 48]} />
        </mesh>
        <mesh ref={ripple} rotation={[Math.PI / 2, 0, 0]} material={rippleMat} visible={false}>
          <torusGeometry args={[0.9, 0.02, 8, 64]} />
        </mesh>
      </group>

      </group>

      {/* Orbit details: a gold hairline ring with a node, and a dashed ring carrying three chips. */}
      <group rotation={[0.24, 0, -0.1]} position={[0, -0.1, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={gold}>
          <torusGeometry args={[2.75, 0.008, 6, 160]} />
        </mesh>
        <mesh ref={node} material={gold}>
          <sphereGeometry args={[0.055, 12, 12]} />
        </mesh>
      </group>
      <group rotation={[0.2, 0, 0.14]} position={[0, -0.1, 0]}>
        <primitive object={dashed} />
        {["chip", "shield", "node"].map((kind, i) => (
          <group key={kind} ref={(g) => (chips.current[i] = g)}>
            <RoundedBox args={[0.34, 0.34, 0.05]} radius={0.025} smoothness={3} material={chip} />
            {kind === "chip" && (
              <mesh position={[0, 0, 0.035]} material={glow}>
                <boxGeometry args={[0.13, 0.13, 0.01]} />
              </mesh>
            )}
            {kind === "shield" && (
              <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]} material={glow}>
                <cylinderGeometry args={[0.09, 0.09, 0.01, 3]} />
              </mesh>
            )}
            {kind === "node" &&
              [
                [-0.07, -0.05],
                [0.07, -0.05],
                [0, 0.07],
              ].map(([x, y]) => (
                <mesh key={`${x}`} position={[x, y, 0.035]} material={glow}>
                  <sphereGeometry args={[0.03, 8, 8]} />
                </mesh>
              ))}
          </group>
        ))}
      </group>
    </group>
  );
}

/** The opening screen's hero object. High tier: transmission glass. Medium: fake glass. */
export default function Gavel3D({ tier }: { tier: "high" | "medium" }) {
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");
  const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const high = tier === "high";

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return (
    <Canvas
      flat
      dpr={[1, 1.5]}
      frameloop={visible ? "always" : "never"}
      camera={{ position: [0, 1.1, 10.5], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <pointLight position={[-3, 1, 3]} intensity={12} color="#8b5cf6" />
      <Environment resolution={64}>
        <Lightformer form="rect" color="#ffffff" intensity={2.2} position={[-3, 4, 4]} scale={[5, 1.5, 1]} />
        <Lightformer form="rect" color="#fff4dc" intensity={0.9} position={[0, 0.5, 6]} scale={[7, 4, 1]} />
        <Lightformer form="rect" color="#a78bfa" intensity={1.4} position={[4, 0, 3]} scale={[2, 5, 1]} />
        <Lightformer form="rect" color="#e8c277" intensity={1.6} position={[0, -3, 4]} scale={[6, 1.5, 1]} />
      </Environment>
      {high && <RefractionBackdrop />}
      <Scene high={high} reduced={reduced} />
    </Canvas>
  );
}
