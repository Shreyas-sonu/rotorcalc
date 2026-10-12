"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type TurbineLive = {
  /** 0..1 steam flow: particle density and speed. */
  flow: number;
  /** 0..1 inlet temperature: inlet colour. */
  heat: number;
  /** 0..1 load: rotor speed. */
  load: number;
  /** 0..1 how far the top casing is lifted off. */
  open: number;
};

type LiveRef = RefObject<TurbineLive>;

const STAGE_X = [-1.5, -0.95, -0.4, 0.15, 0.7];
const stageRadius = (i: number) => 0.62 + i * 0.13;
const HUB = 0.3;
const COOL = new THREE.Color("#45cfff");

/** One ring of blades as a single instanced mesh. */
function BladeRing({ x, inner, outer, count, twist, color, thickness = 0.085 }: { x: number; inner: number; outer: number; count: number; twist: number; color: string; thickness?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const qTwist = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), twist);
    const len = outer - inner;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), a).multiply(qTwist);
      const r = inner + len / 2;
      m.compose(new THREE.Vector3(x, Math.cos(a) * r, Math.sin(a) * r), q, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [x, inner, outer, count, twist]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow>
      <boxGeometry args={[thickness, outer - inner, 0.022]} />
      <meshStandardMaterial color={color} metalness={0.92} roughness={0.28} />
    </instancedMesh>
  );
}

function Rotor({ live }: { live: LiveRef }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.x += dt * (0.7 + live.current.load * 6.5);
  });
  return (
    <group ref={ref}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, 6.6, 32]} />
        <meshStandardMaterial color="#aab8c9" metalness={1} roughness={0.22} />
      </mesh>
      {STAGE_X.map((x, i) => (
        <group key={x}>
          <mesh position={[x + 0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[HUB, HUB, 0.2, 40]} />
            <meshStandardMaterial color="#6f8198" metalness={0.95} roughness={0.3} />
          </mesh>
          <BladeRing x={x + 0.16} inner={HUB} outer={stageRadius(i) - 0.04} count={34 + i * 6} twist={0.62} color="#d5dfeb" />
        </group>
      ))}
      {/* Coupling */}
      <mesh position={[1.75, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.26, 0.26, 0.22, 24]} />
        <meshStandardMaterial color="#56677d" metalness={0.9} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Fixed nozzle rings sitting between the moving stages. */
function Nozzles() {
  return (
    <group>
      {STAGE_X.map((x, i) => (
        <BladeRing key={x} x={x - 0.1} inner={HUB + 0.06} outer={stageRadius(i)} count={22 + i * 4} twist={-0.7} color="#5c6f88" thickness={0.07} />
      ))}
    </group>
  );
}

function Casing({ live }: { live: LiveRef }) {
  const top = useRef<THREE.Group>(null);
  const topMat = useRef<THREE.MeshStandardMaterial>(null);
  const profile = useMemo(() => {
    // (radius, position along the shaft). Lathed around Y, then laid along X.
    const pts: THREE.Vector2[] = [new THREE.Vector2(0.36, -1.95), new THREE.Vector2(0.62, -1.9)];
    STAGE_X.forEach((x, i) => pts.push(new THREE.Vector2(stageRadius(i) + 0.08, x)));
    pts.push(new THREE.Vector2(stageRadius(4) + 0.16, 1.15), new THREE.Vector2(stageRadius(4) + 0.16, 1.32), new THREE.Vector2(0.36, 1.4));
    return pts;
  }, []);
  useFrame((state) => {
    const open = live.current.open;
    if (top.current) {
      top.current.position.y = open * 1.05 + (open > 0.02 ? Math.sin(state.clock.elapsedTime * 0.8) * 0.015 : 0);
    }
    if (topMat.current) topMat.current.opacity = 0.2 + (1 - open) * 0.16;
  });
  return (
    <group>
      {/* Lower half stays on the foundation */}
      <mesh rotation={[0, 0, -Math.PI / 2]} receiveShadow>
        <latheGeometry args={[profile, 56, 0, Math.PI]} />
        <meshStandardMaterial color="#27354a" metalness={0.75} roughness={0.42} side={THREE.DoubleSide} />
      </mesh>
      {/* Upper half lifts off as you scroll */}
      <group ref={top}>
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <latheGeometry args={[profile, 56, Math.PI, Math.PI]} />
          <meshStandardMaterial ref={topMat} color="#7f93ad" metalness={0.6} roughness={0.25} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {/* Inlet pipe and valve chest */}
        <mesh position={[-1.78, 1.02, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 1.05, 28]} />
          <meshStandardMaterial color="#3a4b63" metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[-1.78, 1.6, 0]}>
          <cylinderGeometry args={[0.29, 0.29, 0.12, 28]} />
          <meshStandardMaterial color="#ff7a2f" emissive="#ff5a10" emissiveIntensity={0.9} metalness={0.4} roughness={0.4} />
        </mesh>
      </group>
      {/* Exhaust */}
      <mesh position={[1.02, -1.25, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 1.1, 32, 1, true]} />
        <meshStandardMaterial color="#2c3c52" metalness={0.75} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[1.02, -1.82, 0]}>
        <torusGeometry args={[0.5, 0.045, 12, 40]} />
        <meshStandardMaterial color="#45cfff" emissive="#1c9fd6" emissiveIntensity={0.8} />
      </mesh>
      {/* Bearing pedestals */}
      {[-2.5, 1.75].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, -0.02, 0]}>
            <boxGeometry args={[0.42, 0.5, 0.62]} />
            <meshStandardMaterial color="#202c3d" metalness={0.7} roughness={0.5} />
          </mesh>
          <mesh position={[0, -1, 0]}>
            <boxGeometry args={[0.36, 1.5, 0.5]} />
            <meshStandardMaterial color="#18222f" metalness={0.6} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Generator({ live }: { live: LiveRef }) {
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (glow.current) glow.current.emissiveIntensity = 0.5 + live.current.load * (1.2 + Math.sin(state.clock.elapsedTime * 5) * 0.35);
  });
  return (
    <group position={[3.25, 0, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.82, 0.82, 1.9, 48]} />
        <meshStandardMaterial color="#1d2939" metalness={0.8} roughness={0.38} />
      </mesh>
      {[-0.7, -0.35, 0, 0.35, 0.7].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.83, 0.035, 10, 56]} />
          <meshStandardMaterial color="#3d4f68" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0.96, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.5, 0.05, 12, 48]} />
        <meshStandardMaterial ref={glow} color="#3ddc97" emissive="#3ddc97" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0, -1.15, 0]}>
        <boxGeometry args={[1.7, 0.75, 1.25]} />
        <meshStandardMaterial color="#18222f" metalness={0.6} roughness={0.6} />
      </mesh>
    </group>
  );
}

const COUNT = 900;

function Steam({ live }: { live: LiveRef }) {
  const ref = useRef<THREE.Points>(null);
  const { geometry, seeds } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    // Deterministic pseudo-random seeds so server and client agree and renders stay pure.
    const s = new Float32Array(COUNT * 4);
    for (let i = 0; i < COUNT * 4; i++) s[i] = (Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1;
    for (let i = 0; i < s.length; i++) s[i] = Math.abs(s[i]);
    return { geometry: g, seeds: s };
  }, []);
  const hot = useMemo(() => new THREE.Color(), []);
  const c = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const { flow, heat } = live.current;
    // Buffers are reached through the mesh ref: they are scratch space rewritten every frame.
    const attrs = pts.geometry.attributes;
    const pos = attrs.position.array as Float32Array;
    const col = attrs.color.array as Float32Array;
    const time = state.clock.elapsedTime;
    const shown = Math.floor(COUNT * (0.25 + flow * 0.75));
    hot.setHSL((38 - heat * 24) / 360, 1, 0.6);
    for (let i = 0; i < COUNT; i++) {
      const o = i * 3;
      if (i >= shown) {
        pos[o + 1] = 9999;
        continue;
      }
      const speed = (0.1 + seeds[i * 4] * 0.08) * (0.6 + flow * 1.6);
      const t = (seeds[i * 4 + 1] + time * speed) % 1;
      const ring = seeds[i * 4 + 2];
      const a = seeds[i * 4 + 3] * Math.PI * 2 + t * 5.5;
      if (t < 0.14) {
        // Down the inlet pipe.
        const k = t / 0.14;
        pos[o] = -1.78 + Math.cos(a) * 0.12 * ring;
        pos[o + 1] = 1.55 - k * 1.2;
        pos[o + 2] = Math.sin(a) * 0.12 * ring;
      } else if (t < 0.86) {
        // Spiralling through the stages while it expands.
        const k = (t - 0.14) / 0.72;
        const r = HUB + 0.04 + (0.22 + k * 0.72) * (0.2 + ring * 0.8);
        pos[o] = -1.75 + k * 2.85;
        pos[o + 1] = Math.cos(a) * r;
        pos[o + 2] = Math.sin(a) * r;
      } else {
        // Out through the exhaust.
        const k = (t - 0.86) / 0.14;
        pos[o] = 1.02 + Math.cos(a) * 0.36 * ring;
        pos[o + 1] = -0.6 - k * 1.5;
        pos[o + 2] = Math.sin(a) * 0.36 * ring;
      }
      c.copy(hot).lerp(COOL, Math.min(1, Math.max(0, (t - 0.1) / 0.75)));
      col[o] = c.r;
      col[o + 1] = c.g;
      col[o + 2] = c.b;
    }
    attrs.position.needsUpdate = true;
    attrs.color.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={0.055} vertexColors transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function Scene({ live }: { live: LiveRef }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={2.4} castShadow />
      <directionalLight position={[-6, 2, -4]} intensity={1.1} color="#45cfff" />
      <pointLight position={[-2.2, 1.6, 1.6]} intensity={9} color="#ff8a3d" distance={7} />
      <pointLight position={[1.4, -1.6, 1.4]} intensity={7} color="#45cfff" distance={6} />
      <pointLight position={[3.4, 1.8, 2.4]} intensity={6} color="#ffffff" distance={7} />
      <group position={[-0.55, 0.25, 0]}>
        <Rotor live={live} />
        <Nozzles />
        <Casing live={live} />
        <Generator live={live} />
        <Steam live={live} />
      </group>
      <ContactShadows position={[0, -1.72, 0]} opacity={0.55} scale={14} blur={2.6} far={4} color="#000000" />
    </>
  );
}

/** Interactive 3D steam turbine. Values in `live` are read every frame, so updating them never re-renders. */
export default function Turbine3D({ live, className }: { live: LiveRef; className?: string }) {
  return (
    <Canvas className={className} dpr={[1, 1.75]} shadows camera={{ position: [6.2, 3.3, 9.6], fov: 30 }} gl={{ antialias: true, alpha: true }}>
      <Scene live={live} />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.55} minPolarAngle={0.9} maxPolarAngle={1.75} target={[0.45, -0.25, 0]} />
    </Canvas>
  );
}
