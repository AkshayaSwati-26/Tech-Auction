import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { useQualityStore } from "../../../store/qualityStore";

class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function CssOrb() {
  return (
    <div className="d-orb d-float" aria-hidden="true">
      <div className="d-orb__ball" />
    </div>
  );
}

/** A soft radial glow the glass refracts. It fades to the page background, and the canvas is
    radially masked in CSS, so no rectangle edge is ever visible. */
function useGlowTexture() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "#7b5cf0");
    g.addColorStop(0.3, "#3b2296");
    g.addColorStop(0.62, "#1c0d4e");
    g.addColorStop(0.85, "#150a3e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Orb() {
  const group = useRef<THREE.Group>(null);
  const glow = useGlowTexture();
  const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useFrame(({ clock }, delta) => {
    if (reduced || !group.current) return;
    group.current.position.y = Math.sin((clock.elapsedTime * Math.PI * 2) / 7) * 0.08;
    group.current.rotation.y += delta * 0.12;
  });

  return (
    <>
      <mesh position={[0, 0, -4]}>
        <planeGeometry args={[14, 14]} />
        <meshBasicMaterial map={glow} toneMapped={false} />
      </mesh>
      <group ref={group}>
        <mesh>
          <sphereGeometry args={[1.15, 64, 64]} />
          <meshPhysicalMaterial
            color="#ffffff"
            transmission={1}
            thickness={1.1}
            ior={1.3}
            roughness={0.05}
            attenuationColor="#d6c8ff"
            attenuationDistance={5}
            iridescence={0.35}
            iridescenceIOR={1.3}
            clearcoat={1}
            clearcoatRoughness={0.1}
            envMapIntensity={0.9}
          />
        </mesh>
      </group>
    </>
  );
}

/** The one 3D element: a small glass orb. High tier renders it with WebGL; Medium/Low or a
    WebGL failure get the CSS orb. The render loop stops while the tab is hidden. */
export default function GlassOrb() {
  const quality = useQualityStore((s) => s.quality);
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  if (quality !== "high") return <CssOrb />;

  return (
    <Boundary fallback={<CssOrb />}>
      <div className="d-orb d-orb-canvas" aria-hidden="true">
        <Canvas
          flat
          dpr={[1, 1.5]}
          frameloop={visible ? "always" : "never"}
          camera={{ position: [0, 0, 6.2], fov: 34 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          style={{ position: "absolute", inset: 0 }}
        >
          <color attach="background" args={["#150a3e"]} />
          <ambientLight intensity={0.25} />
          <Environment resolution={64}>
            <Lightformer form="rect" color="#ffffff" intensity={2.2} position={[-3, 4, 3]} scale={[4, 1.2, 1]} />
            <Lightformer form="rect" color="#a78bfa" intensity={1.6} position={[4, -1, 2]} scale={[2, 4, 1]} />
            <Lightformer form="ring" color="#8b5cf6" intensity={1} position={[0, -4, -2]} scale={3} />
          </Environment>
          <Orb />
        </Canvas>
      </div>
    </Boundary>
  );
}
