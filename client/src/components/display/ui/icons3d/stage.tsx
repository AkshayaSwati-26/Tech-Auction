import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";

export type IconTier = "high" | "medium";

interface StageCtx {
  glass: THREE.MeshPhysicalMaterial;
  gold: THREE.MeshStandardMaterial;
  glow: THREE.MeshBasicMaterial;
  assemble: boolean;
  reduced: boolean;
  /** Seconds after the canvas mounts before the assembly begins. */
  startAt: number;
  disc: boolean;
  sway: number;
  active: boolean;
}

const Ctx = createContext<StageCtx | null>(null);

export function useIconStage() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useIconStage must be used inside <IconStage>");
  return ctx;
}

/** A translucent glow material with its own opacity, for parts that fade (ripples, cones, discs). */
export function useSoftGlow(opacity: number, color = "#c9b6ff") {
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
    [color, opacity]
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}

/** On reveal, a part flies in from `from` (slightly outside its resting place) and settles. */
export function Part({ from = [0, 0, 0], delay = 0, children }: { from?: [number, number, number]; delay?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const { assemble, reduced, startAt } = useIconStage();
  const animate = assemble && !reduced;

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g || !animate) return;
    g.visible = clock.elapsedTime >= startAt + delay;
    const t = Math.min(1, Math.max(0, (clock.elapsedTime - startAt - delay) / 0.85));
    const e = 1 - Math.pow(1 - t, 3);
    g.position.set(from[0] * (1 - e), from[1] * (1 - e), from[2] * (1 - e));
    g.scale.setScalar(0.25 + 0.75 * e);
  });

  return (
    <group ref={ref} position={animate ? from : [0, 0, 0]} scale={animate ? 0.25 : 1} visible={!animate}>
      {children}
    </group>
  );
}

/** A thick link between two points (a cylinder aligned to the segment). */
export function Link({ a, b, radius = 0.04, material }: { a: THREE.Vector3Tuple; b: THREE.Vector3Tuple; radius?: number; material: THREE.Material }) {
  const { position, quaternion, length } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    return {
      position: va.clone().add(vb).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      length: dir.length(),
    };
  }, [a, b]);
  return (
    <mesh position={position} quaternion={quaternion} material={material}>
      <cylinderGeometry args={[radius, radius, length, 10]} />
    </mesh>
  );
}

/** Something for the glass to refract. It only draws into the transmission buffer, never the
    visible frame, so the canvas stays transparent over the card. */
export function RefractionBackdrop() {
  // colorWrite starts off, so if the hook below never runs the worst case is darker glass,
  // never a visible rectangle. It is passed as a prop so it survives the mesh being recreated.
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#a98df5", side: THREE.BackSide, depthWrite: false, toneMapped: false, colorWrite: false }),
    []
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh
      material={mat}
      scale={30}
      renderOrder={-10}
      onBeforeRender={(renderer: THREE.WebGLRenderer) => {
        mat.colorWrite = renderer.getRenderTarget() !== null;
      }}
      onAfterRender={() => {
        mat.colorWrite = false;
      }}
    >
      <sphereGeometry args={[1, 16, 12]} />
    </mesh>
  );
}

function Rig({ children }: { children: ReactNode }) {
  const root = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const { assemble, reduced, glass, gold, startAt, disc, sway, active } = useIconStage();
  const emphasis = useRef(1);
  const pulseMat = useSoftGlow(0);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (root.current && !reduced) {
      root.current.rotation.y = Math.sin(t * 0.45) * sway;
      emphasis.current += ((active ? 1.14 : 1) - emphasis.current) * 0.08;
      root.current.scale.setScalar(emphasis.current);
      root.current.rotation.x = 0.16 + Math.sin(t * 0.31) * 0.05;
      root.current.position.y = 0.12 + Math.sin((t * Math.PI * 2) / 7) * 0.06;
    }
    if (pulse.current) {
      const p = assemble && !reduced ? (t - startAt - 1) / 0.7 : -1;
      const on = p > 0 && p < 1;
      pulse.current.visible = on;
      if (on) {
        pulse.current.scale.setScalar(0.9 + p * 0.9);
        pulseMat.opacity = 0.22 * (1 - p);
      }
    }
  });

  return (
    <group ref={root} rotation={[0.16, -0.3, 0]} position={[0, 0.12, 0]}>
      {children}
      <mesh ref={pulse} rotation={[Math.PI / 2, 0, 0]} material={pulseMat} visible={false}>
        <torusGeometry args={[1, 0.035, 10, 64]} />
      </mesh>
      {/* Thin glass disc the icon stands over, with a gold rim. */}
      <group position={[0, -1.28, 0]} visible={disc}>
        <mesh material={glass}>
          <cylinderGeometry args={[0.9, 0.9, 0.04, 48]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={gold}>
          <torusGeometry args={[0.9, 0.02, 8, 64]} />
        </mesh>
      </group>
    </group>
  );
}

/** One canvas, one material family. High tier uses real transmission; Medium uses fake glass. */
export default function IconStage({
  tier,
  assemble,
  disc = true,
  active = false,
  startAt = 0.25,
  sway = 0.42,
  light,
  children,
}: {
  tier: IconTier;
  assemble: boolean;
  disc?: boolean;
  active?: boolean;
  startAt?: number;
  sway?: number;
  /** Cheaper fake glass at a 1x pixel ratio. Defaults to on for medallion icons (no disc). */
  light?: boolean;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");
  const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  // Medallion icons (no disc) are small and shown five at a time, so they always use the
  // cheaper fake glass and a 1x pixel ratio; real transmission is kept for the single hero icon.
  const cheap = light ?? !disc;
  const high = tier === "high" && !cheap;

  const mats = useMemo(() => {
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.1,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      iridescence: 0.4,
      iridescenceIOR: 1.3,
      emissive: "#6a3df0",
      emissiveIntensity: 0.1,
      envMapIntensity: 1.1,
      ...(high
        ? { transmission: 1, thickness: 0.9, ior: 1.38, attenuationColor: new THREE.Color("#b79cff"), attenuationDistance: 2.6 }
        : { color: new THREE.Color("#b9a3ff"), transparent: true, opacity: 0.62 }),
    });
    const gold = new THREE.MeshStandardMaterial({ color: "#e8c277", metalness: 1, roughness: 0.2, envMapIntensity: 1.2, side: THREE.DoubleSide });
    const glow = new THREE.MeshBasicMaterial({ color: "#b9a6ff", toneMapped: false });
    return { glass, gold, glow };
  }, [high]);
  const ctx = useMemo<StageCtx>(
    () => ({ ...mats, assemble, reduced, startAt, disc, sway, active }),
    [mats, assemble, reduced, startAt, disc, sway, active]
  );

  useEffect(
    () => () => {
      mats.glass.dispose();
      mats.gold.dispose();
      mats.glow.dispose();
    },
    [mats]
  );

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return (
    <Canvas
      flat
      dpr={cheap ? 1 : [1, 1.5]}
      frameloop={visible ? "always" : "never"}
      camera={{ position: [0, 0.45, 6.1], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} color="#ffffff" />
      <pointLight position={[-3, 1, 3]} intensity={12} color="#8b5cf6" />
      <Environment resolution={64}>
        <Lightformer form="rect" color="#ffffff" intensity={2.2} position={[-3, 4, 4]} scale={[5, 1.5, 1]} />
        <Lightformer form="rect" color="#fff4dc" intensity={0.9} position={[0, 0.5, 6]} scale={[7, 4, 1]} />
        <Lightformer form="rect" color="#a78bfa" intensity={1.4} position={[4, 0, 3]} scale={[2, 5, 1]} />
        <Lightformer form="rect" color="#e8c277" intensity={1.6} position={[0, -3, 4]} scale={[6, 1.5, 1]} />
        <Lightformer form="ring" color="#7c4dff" intensity={1} position={[0, 2, -5]} scale={4} />
      </Environment>
      {high && <RefractionBackdrop />}
      <Ctx.Provider value={ctx}>
        <Rig>{children}</Rig>
      </Ctx.Provider>
    </Canvas>
  );
}
