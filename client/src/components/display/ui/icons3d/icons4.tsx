import { useRef, type ComponentType } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Part, useIconStage, useSoftGlow } from "./stage";

const TAU = Math.PI * 2;

/** Build phase hero: a thick glass ring with a gold inner rim, an hourglass on top, gold orbit arcs. */
function LaunchRing() {
  const { glass, gold } = useIconStage();
  const arcs = useRef<THREE.Group>(null);
  const gears = useRef<THREE.Group>(null);
  const top = useRef<THREE.Mesh>(null);
  const bottom = useRef<THREE.Mesh>(null);
  const stream = useRef<THREE.Mesh>(null);
  const coreMat = useSoftGlow(0.1, "#8b5cf6");

  useFrame(({ clock }, delta) => {
    if (arcs.current) arcs.current.rotation.z += delta * 0.12;
    if (gears.current) gears.current.rotation.z -= delta * 0.2;
    // Sand: the top empties and the bottom fills over 14s, then it starts again.
    const k = (clock.elapsedTime % 14) / 14;
    if (top.current) top.current.scale.setScalar(Math.max(0.05, 1 - k));
    if (bottom.current) bottom.current.scale.setScalar(Math.max(0.05, k));
    if (stream.current) stream.current.visible = k < 0.97;
  });

  return (
    <group scale={0.72}>
      <Part from={[0, 0, -1.6]}>
        <mesh material={glass}>
          <torusGeometry args={[1.25, 0.15, 28, 96]} />
        </mesh>
        <mesh position={[0, 0, -0.2]} material={coreMat}>
          <circleGeometry args={[1.1, 48]} />
        </mesh>
      </Part>
      <Part from={[0, 0, 1.6]} delay={0.12}>
        <mesh material={gold}>
          <torusGeometry args={[1.07, 0.03, 12, 96]} />
        </mesh>
      </Part>

      <group ref={arcs}>
        {[0, 1].map((i) => (
          <mesh key={i} rotation={[0.35 * (i ? -1 : 1), 0.3, i * Math.PI]} material={gold}>
            <torusGeometry args={[1.52, 0.012, 6, 64, 1.5]} />
          </mesh>
        ))}
      </group>
      <group ref={gears} rotation={[0.2, 0, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[Math.cos((i / 4) * TAU) * 1.68, Math.sin((i / 4) * TAU) * 1.68, 0]} rotation={[Math.PI / 2, 0, 0]} material={glass}>
            <cylinderGeometry args={[0.09, 0.09, 0.06, 6]} />
          </mesh>
        ))}
      </group>

      <Part from={[0, 1.4, 0]} delay={0.25}>
        <group position={[0, 1.62, 0]} scale={0.5}>
          <mesh position={[0, 0.3, 0]} rotation={[Math.PI, 0, 0]} material={glass}>
            <coneGeometry args={[0.34, 0.6, 32]} />
          </mesh>
          <mesh position={[0, -0.3, 0]} material={glass}>
            <coneGeometry args={[0.34, 0.6, 32]} />
          </mesh>
          {[-0.63, 0.63].map((y) => (
            <mesh key={y} position={[0, y, 0]} material={gold}>
              <cylinderGeometry args={[0.4, 0.4, 0.07, 32]} />
            </mesh>
          ))}
          <mesh ref={top} position={[0, 0.42, 0]} rotation={[Math.PI, 0, 0]} material={gold}>
            <coneGeometry args={[0.2, 0.3, 20]} />
          </mesh>
          <mesh ref={bottom} position={[0, -0.46, 0]} material={gold}>
            <coneGeometry args={[0.22, 0.26, 20]} />
          </mesh>
          <mesh ref={stream} position={[0, -0.15, 0]} material={gold}>
            <cylinderGeometry args={[0.012, 0.012, 0.4, 6]} />
          </mesh>
        </group>
      </Part>
    </group>
  );
}

export const ICONS_3D_BUILD: Record<string, ComponentType> = {
  "build-ring": LaunchRing,
};
